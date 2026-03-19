// ==========================================
// FICHIER: src/utils/geocoding.js
// ✅ FIX 429 DÉFINITIF côté client :
//    - Cache client porté à 24h (les quartiers ne bougent pas)
//    - Clé de cache arrondie à ~1km (3 → 2 décimales) pour maximiser les hits
//    - File d'attente stricte : 1 appel réseau à la fois, délai 1.5s
//    - Sur 429 : PAS de retry (ça empire) → retour dégradé immédiat
//      + backendKnownDown pendant 5 min pour bloquer tous les appels suivants
//    - Sur ERR_NETWORK : même comportement, blocage 1 min
// ==========================================

import userApi from '../api/apiSwitch';
import { cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';

// ── Cache côté client ─────────────────────────────────────────────────────────
// TTL 24h : les noms de quartiers sont stables, inutile de re-géocoder souvent.
// Clé à 2 décimales ≈ ~1.1km — élargit la zone de hit sans perte de précision
// significative pour identifier un quartier.
const CLIENT_CACHE     = new Map();
const CLIENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

function clientCacheKey(lat, lon) {
  // 2 décimales ≈ 1.1km — suffisant pour un quartier, maximise les hits
  return `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
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
  if (CLIENT_CACHE.size >= 200) {
    // Éviction LRU : supprimer la plus ancienne entrée
    const firstKey = CLIENT_CACHE.keys().next().value;
    CLIENT_CACHE.delete(firstKey);
  }
  CLIENT_CACHE.set(key, { data, ts: Date.now() });
}

// ── Résultats dégradés ────────────────────────────────────────────────────────
function buildNetworkFallback(message = 'Backend indisponible') {
  return { success: false, error: message, quarter: null, city: null, isNetworkError: true };
}

function buildRateLimitFallback() {
  return { success: false, error: 'Service momentanément surchargé', quarter: null, city: null, isRateLimit: true };
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

function getStatusCode(error) {
  return (
    error?.response?.status ||
    error?.status           ||
    error?.statusCode       ||
    null
  );
}

// ── Circuit breaker partagé ───────────────────────────────────────────────────
// Un seul état pour ERR_NETWORK ET 429 — les deux signifient "ne pas appeler".
let circuitOpen      = false;
let circuitTimer     = null;
let circuitReason    = null;

function openCircuit(reason, durationMs) {
  circuitOpen   = true;
  circuitReason = reason;
  if (circuitTimer) clearTimeout(circuitTimer);
  circuitTimer = setTimeout(() => {
    circuitOpen   = false;
    circuitTimer  = null;
    circuitReason = null;
    console.log('🔄 [geocoding] Circuit fermé — réessais autorisés');
  }, durationMs);
  console.warn(`⚡ [geocoding] Circuit ouvert (${reason}) — pause ${durationMs / 1000}s`);
}

// ── File d'attente stricte ────────────────────────────────────────────────────
// 1 seul appel Nominatim à la fois côté client.
// Délai 1.5s entre chaque appel (marge sur la limite 1 req/s de Nominatim).
let   clientQueue  = Promise.resolve();
const CLIENT_DELAY = 1500;

function enqueueGeocode(fn) {
  clientQueue = clientQueue
    .then(() => {
      if (circuitOpen) {
        return buildNetworkFallback(`Circuit ouvert : ${circuitReason}`);
      }
      return fn();
    })
    .then(result => new Promise(resolve => setTimeout(() => resolve(result), CLIENT_DELAY)))
    .catch(err   => new Promise((_, reject) => setTimeout(() => reject(err), CLIENT_DELAY)));
  return clientQueue;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Géocodage inversé via le backend.
 *
 * Stratégie anti-429 définitive :
 *  1. Cache 24h → retour immédiat (pas d'appel réseau)
 *  2. Circuit breaker → si 429 ou ERR_NETWORK récent, retour dégradé immédiat
 *  3. File d'attente → 1 appel à la fois, délai 1.5s
 *  4. Sur 429 reçu → ouvre le circuit 5 min, retour dégradé SANS retry
 *     (retry sur 429 empire toujours la situation)
 *  5. Sur ERR_NETWORK → ouvre le circuit 1 min, retour dégradé SANS retry
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>}
 */
export const reverseGeocode = async (latitude, longitude) => {
  const key    = clientCacheKey(latitude, longitude);
  const cached = clientCacheGet(key);

  if (cached) {
    console.log(`🗂️ [geocoding] Cache hit: ${key}`);
    return cached;
  }

  if (circuitOpen) {
    console.warn(`⚡ [geocoding] Court-circuit (${circuitReason})`);
    return buildNetworkFallback(`Circuit ouvert : ${circuitReason}`);
  }

  return enqueueGeocode(async () => {
    // Double-check après attente en file
    const cachedAgain = clientCacheGet(key);
    if (cachedAgain) {
      console.log(`🗂️ [geocoding] Cache hit (post-queue): ${key}`);
      return cachedAgain;
    }

    if (circuitOpen) {
      return buildNetworkFallback(`Circuit ouvert : ${circuitReason}`);
    }

    try {
      console.log(`📍 [geocoding] Appel backend: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

      const body = await userApi.get('/geocoding/multi-zoom', {
        params: { lat: latitude, lon: longitude }
      });

      if (!body?.success || !body?.data) {
        console.warn('⚠️ [geocoding] Réponse vide');
        const fallback = {
          success: true, quarter: null, city: 'Ouagadougou',
          fullAddress: 'Ouagadougou', warning: 'Aucun quartier trouvé',
        };
        clientCacheSet(key, fallback);
        return fallback;
      }

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
        console.log(`🔧 [geocoding] Quartier corrigé: "${rawQuarter}" → "${quarter}"`);
      }

      const city =
        address.city         ||
        address.town         ||
        address.village      ||
        address.municipality ||
        'Ouagadougou';

      console.log(`✅ [geocoding] OK: ${quarter}, ${city} (zoom ${nominatim.zoom})`);

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
      const status = getStatusCode(error);

      // ── 429 : JAMAIS de retry — ouvre le circuit 5 min ───────────────
      // Retenter sur 429 empire systématiquement la situation.
      // On attend 5 min que le rate limit Nominatim se réinitialise.
      if (status === 429) {
        openCircuit('429 rate limit', 5 * 60_000);
        return buildRateLimitFallback();
      }

      // ── Erreur réseau → ouvre le circuit 1 min ────────────────────────
      if (isNetworkError(error)) {
        openCircuit('ERR_NETWORK', 60_000);
        return buildNetworkFallback('Backend indisponible. Réessayez dans quelques instants.');
      }

      // ── Autre erreur HTTP (500, 503…) → retour dégradé sans bloquer ──
      console.error(`❌ [geocoding] Erreur HTTP ${status}:`, error?.message);
      return {
        success: false,
        error:   error?.message || 'Erreur de géocodage',
        quarter: null,
        city:    null,
      };
    }
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
      message: (result.isNetworkError || result.isRateLimit)
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