// ==========================================
// FICHIER: src/utils/geocoding.js
// ✅ FIX CORS  : appel via backend
// ✅ FIX 429   : file d'attente client (1 appel à la fois, délai 1.2s)
// ✅ FIX 429   : retry backoff 3s/6s/12s
// ✅ FIX 429   : cache client 1h avec clé arrondie à ~100m
// ✅ FIX RÉSEAU: détection rapide ERR_NETWORK / ERR_NAME_NOT_RESOLVED
// ✅ FIX SHAPE : userApi intercepteur retourne response.data directement
//               → après await userApi.get(...) on obtient le body JSON
//                 { success, data, ... } et NON pas axios { data: { ... } }
// ==========================================

import userApi from '../api/apiSwitch';
import { cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';

// ── Cache côté client (LRU manuel, max 100 entrées, TTL 1h) ──────────────────
const CLIENT_CACHE     = new Map();
const CLIENT_CACHE_TTL = 60 * 60 * 1000; // 1 heure

function clientCacheKey(lat, lon) {
  return `${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)}`;
}

function clientCacheGet(key) {
  const entry = CLIENT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CLIENT_CACHE_TTL) {
    CLIENT_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function clientCacheSet(key, data) {
  if (CLIENT_CACHE.size >= 100) {
    const firstKey = CLIENT_CACHE.keys().next().value;
    CLIENT_CACHE.delete(firstKey);
  }
  CLIENT_CACHE.set(key, { data, ts: Date.now() });
}

// ── Résultat dégradé standardisé ─────────────────────────────────────────────
function buildNetworkFallback(message = 'Backend indisponible') {
  return {
    success:        false,
    error:          message,
    quarter:        null,
    city:           null,
    isNetworkError: true,
  };
}

// ── Détection d'erreur réseau ─────────────────────────────────────────────────
function isNetworkError(error) {
  return (
    error?.code === 'ERR_NETWORK'           ||
    error?.code === 'ERR_NAME_NOT_RESOLVED' ||
    error?.code === 'ECONNABORTED'          ||
    error?.isBackendDown === true           ||
    error?.isNetworkError === true          ||
    (!error?.response && !!error?.request)
  );
}

// ── File d'attente client ─────────────────────────────────────────────────────
let   clientQueue  = Promise.resolve();
const CLIENT_DELAY = 1200;

let backendKnownDown = false;
let backendDownTimer = null;
const GEOCODE_DOWN_RESET = 60_000;

function markGeocodeBackendDown() {
  backendKnownDown = true;
  if (backendDownTimer) clearTimeout(backendDownTimer);
  backendDownTimer = setTimeout(() => {
    backendKnownDown = false;
    backendDownTimer = null;
    console.log('🔄 [geocoding] Réessai backend autorisé');
  }, GEOCODE_DOWN_RESET);
}

function enqueueGeocode(fn) {
  clientQueue = clientQueue
    .then(() => {
      if (backendKnownDown) {
        return buildNetworkFallback('Backend indisponible (court-circuit file)');
      }
      return fn();
    })
    .then(result =>
      new Promise(resolve => setTimeout(() => resolve(result), CLIENT_DELAY))
    )
    .catch(err =>
      new Promise((_, reject) => setTimeout(() => reject(err), CLIENT_DELAY))
    );
  return clientQueue;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Géocodage inversé via le backend.
 *
 * ⚠️  userApi (export default de apiSwitch.js) a un intercepteur response qui
 *     retourne response.data directement. Donc :
 *       const body = await userApi.get('/geocoding/multi-zoom', ...)
 *     body === response.data === { success: true, data: { address, zoom, ... } }
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} maxRetries
 * @returns {Promise<Object>}
 */
export const reverseGeocode = async (latitude, longitude, maxRetries = 3) => {
  const key    = clientCacheKey(latitude, longitude);
  const cached = clientCacheGet(key);

  if (cached) {
    console.log(`🗂️ Cache client hit: ${key}`);
    return cached;
  }

  if (backendKnownDown) {
    console.warn('⚡ [geocoding] Backend down — court-circuit immédiat');
    return buildNetworkFallback('Backend indisponible');
  }

  return enqueueGeocode(async () => {
    const cachedAgain = clientCacheGet(key);
    if (cachedAgain) {
      console.log(`🗂️ Cache client hit (post-queue): ${key}`);
      return cachedAgain;
    }

    if (backendKnownDown) {
      return buildNetworkFallback('Backend indisponible (détecté pendant attente file)');
    }

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1500;
          console.log(`⏳ Retry géocodage dans ${delay}ms (tentative ${attempt}/${maxRetries})...`);
          await sleep(delay);
        }

        console.log(`📍 Géocodage inversé via backend: ${latitude}, ${longitude}`);

        // ✅ userApi retourne response.data directement (intercepteur apiSwitch.js)
        // body = { success: true, data: { address: {}, display_name, zoom } }
        const body = await userApi.get('/geocoding/multi-zoom', {
          params: { lat: latitude, lon: longitude }
        });

        if (!body?.success || !body?.data) {
          console.warn('⚠️ Aucune donnée de géocodage reçue');
          const fallback = {
            success:     true,
            quarter:     null,
            city:        'Ouagadougou',
            fullAddress: 'Ouagadougou',
            warning:     'Aucun quartier trouvé',
          };
          clientCacheSet(key, fallback);
          return fallback;
        }

        // body.data = objet Nominatim enrichi par geocodingRoutes.js
        const nominatim = body.data;
        const address   = nominatim.address || {};

        const rawQuarter =
          address.suburb        ||
          address.neighbourhood ||
          address.hamlet        ||
          address.quarter       ||
          address.city_district ||
          address.residential   ||
          null;

        const quarter = rawQuarter ? cleanAndValidateQuarterName(rawQuarter) : null;

        if (quarter && rawQuarter !== quarter) {
          console.log(`🔧 Quartier corrigé: "${rawQuarter}" → "${quarter}"`);
        }

        const city =
          address.city         ||
          address.town         ||
          address.village      ||
          address.municipality ||
          'Ouagadougou';

        console.log('✅ Géocodage réussi:', { quarter, city, zoom: nominatim.zoom });

        const result = {
          success:     true,
          quarter,
          city,
          fullAddress: nominatim.display_name || `${quarter || ''}, ${city}`.trim(),
          details: {
            road:          address.road          || '',
            suburb:        address.suburb        || '',
            neighbourhood: address.neighbourhood || '',
            city_district: address.city_district || '',
            postcode:      address.postcode      || '',
            country:       address.country       || 'Burkina Faso',
            zoom:          nominatim.zoom,
          },
          raw: address,
        };

        clientCacheSet(key, result);
        return result;

      } catch (error) {
        lastError = error;

        // ── Erreur réseau → retour dégradé immédiat, pas de retry ────────
        if (isNetworkError(error)) {
          console.error('🔴 [geocoding] Erreur réseau:', error.code || error.message);
          markGeocodeBackendDown();
          return buildNetworkFallback(
            error.userMessage || 'Backend indisponible. Réessayez dans quelques instants.'
          );
        }

        const status = error?.response?.status || error?.status;

        // ── 429 → retry avec backoff ──────────────────────────────────────
        if (status === 429 && attempt < maxRetries) {
          console.warn(`⚠️ Géocodage 429 — backoff avant retry ${attempt + 1}/${maxRetries}`);
          continue;
        }

        // Autre erreur HTTP → sortie sans retry
        break;
      }
    }

    console.error('❌ Erreur géocodage backend après retries:', lastError?.message);
    return {
      success: false,
      error:   lastError?.message || 'Erreur de géocodage',
      quarter: null,
      city:    null,
    };
  });
};

/**
 * Obtenir uniquement le quartier depuis des coordonnées GPS
 */
export const getQuarterFromCoordinates = async (latitude, longitude) => {
  const result = await reverseGeocode(latitude, longitude);
  return result.success ? result.quarter : null;
};

/**
 * Valider si les coordonnées sont dans une ville supportée
 */
export const validateLocationInSupportedCity = async (latitude, longitude) => {
  const result = await reverseGeocode(latitude, longitude);

  if (!result.success) {
    return {
      valid:   false,
      message: result.isNetworkError
        ? 'Service de localisation temporairement indisponible'
        : 'Impossible de vérifier votre localisation',
    };
  }

  const supportedCities = ['ouagadougou', 'bobo-dioulasso', 'bobo dioulasso'];
  const cityLower       = (result.city || '').toLowerCase();
  const isSupported     = supportedCities.some(
    city => cityLower.includes(city) || city.includes(cityLower)
  );

  return {
    valid:   isSupported,
    city:    result.city,
    quarter: result.quarter,
    message: isSupported
      ? `Localisation valide : ${result.quarter}, ${result.city}`
      : `Désolé, nous n'opérons pas encore dans ${result.city}`,
  };
};