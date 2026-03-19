// ==========================================
// FICHIER: src/utils/geocoding.js
// ✅ FIX CORS  : appel via backend
// ✅ FIX 429   : file d'attente client (1 appel à la fois, délai 1.2s)
//               évite les bursts quand plusieurs composants se montent ensemble
// ✅ FIX 429   : retry backoff 3s/6s/12s (au lieu de 2s/4s)
// ✅ FIX 429   : cache client 1h avec clé arrondie à ~100m
// ✅ FIX RÉSEAU: détection rapide ERR_NETWORK / ERR_NAME_NOT_RESOLVED
//               → pas de retries si le backend est connu comme down
//               → retour dégradé immédiat au lieu de bloquer la file 30s
// ==========================================

import userApi from '../api/apiSwitch';
import { cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';

// ── Cache côté client (LRU manuel, max 100 entrées, TTL 1h) ──────────────────
// Arrondi à 3 décimales ≈ 111m — suffisant pour un quartier
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
// Retourné immédiatement si le backend est injoignable,
// sans bloquer la file d'attente ni lancer de retries inutiles.
function buildNetworkFallback(message = 'Backend indisponible') {
  return {
    success: false,
    error:   message,
    quarter: null,
    city:    null,
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

// ── File d'attente client : 1 seul appel réseau geocoding à la fois ──────────
// Problème résolu : quand plusieurs composants se montent simultanément
// (MapPage + AddAddressModal + Products...), ils appellent tous reverseGeocode
// en même temps → burst → 429. La file sérialise ces appels avec un délai
// de 1.2s entre chaque, exactement comme nominatimQueue côté serveur.
// Les hits de cache court-circuitent la file → pas de délai pour eux.
// Les erreurs réseau court-circuitent aussi la file pour ne pas bloquer.
let   clientQueue  = Promise.resolve();
const CLIENT_DELAY = 1200; // ms entre deux appels réseau (respecte limite Nominatim)

// Flag partagé : si le backend est down, on court-circuite la file
// pour éviter que tous les appels en attente soient bloqués 35s (timeout axios)
let backendKnownDown     = false;
let backendDownTimer      = null;
const GEOCODE_DOWN_RESET = 60_000; // 1 min avant de réessayer

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
      // Court-circuit : si le backend est down, ne pas appeler du tout
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

// ── Helper : attente async ────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Géocodage inversé via le backend (évite CORS + gère le rate limiting Nominatim)
 *
 * Stratégie :
 *  1. Cache client 1h → retour immédiat si position déjà connue
 *  2. Court-circuit si backend connu comme down → retour dégradé immédiat
 *  3. File d'attente client → 1 seul appel réseau à la fois, délai 1.2s
 *  4. Détection ERR_NETWORK → marque backend down, retour dégradé sans retry
 *  5. Retry backoff exponentiel uniquement sur erreur 429 → 3s, 6s, 12s
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} maxRetries  — tentatives max sur 429 (défaut: 3)
 * @returns {Promise<Object>}
 */
export const reverseGeocode = async (latitude, longitude, maxRetries = 3) => {
  const key    = clientCacheKey(latitude, longitude);
  const cached = clientCacheGet(key);

  if (cached) {
    console.log(`🗂️ Cache client hit: ${key}`);
    return cached; // court-circuite la file, retour immédiat
  }

  // Court-circuit immédiat si backend connu comme down (pas de mise en file)
  if (backendKnownDown) {
    console.warn('⚡ [geocoding] Backend down — court-circuit immédiat');
    return buildNetworkFallback('Backend indisponible');
  }

  // Sérialiser via la file d'attente pour éviter les bursts
  return enqueueGeocode(async () => {
    // Double-check cache : un autre appel en file a peut-être déjà rempli le cache
    const cachedAgain = clientCacheGet(key);
    if (cachedAgain) {
      console.log(`🗂️ Cache client hit (post-queue): ${key}`);
      return cachedAgain;
    }

    // Double-check backend down (peut avoir changé pendant l'attente en file)
    if (backendKnownDown) {
      return buildNetworkFallback('Backend indisponible (détecté pendant attente file)');
    }

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Backoff plus long qu'avant : 3s, 6s, 12s
          const delay = Math.pow(2, attempt) * 1500;
          console.log(`⏳ Retry géocodage dans ${delay}ms (tentative ${attempt}/${maxRetries})...`);
          await sleep(delay);
        }

        console.log(`📍 Géocodage inversé via backend: ${latitude}, ${longitude}`);

        const response = await userApi.get('/geocoding/multi-zoom', {
          params: { lat: latitude, lon: longitude }
        });

        if (!response.success || !response.data) {
          console.warn('⚠️ Aucune donnée de géocodage reçue');
          const fallback = {
            success:     true,
            quarter:     null,
            city:        'Ouagadougou',
            fullAddress: 'Ouagadougou',
            warning:     'Aucun quartier trouvé'
          };
          clientCacheSet(key, fallback);
          return fallback;
        }

        const address = response.data.address || {};

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

        console.log('✅ Géocodage réussi:', { quarter, city, zoom: response.data.zoom });

        const result = {
          success:     true,
          quarter,
          city,
          fullAddress: response.data.display_name || `${quarter || ''}, ${city}`.trim(),
          details: {
            road:          address.road          || '',
            suburb:        address.suburb        || '',
            neighbourhood: address.neighbourhood || '',
            city_district: address.city_district || '',
            postcode:      address.postcode      || '',
            country:       address.country       || 'Burkina Faso',
            zoom:          response.data.zoom,
          },
          raw: address,
        };

        clientCacheSet(key, result);
        return result;

      } catch (error) {
        lastError = error;

        // ── Erreur réseau : backend down, DNS, timeout ───────────────────
        // Pas de retry — cela ne peut pas se résoudre en quelques secondes.
        // On marque le backend comme down pour court-circuiter les appels suivants.
        if (isNetworkError(error)) {
          console.error('🔴 [geocoding] Erreur réseau — backend injoignable:', error.code || error.message);
          markGeocodeBackendDown();
          return buildNetworkFallback(
            error.userMessage || 'Backend indisponible. Réessayez dans quelques instants.'
          );
        }

        const status = error?.response?.status || error?.status;

        // ── 429 : rate limit → retry avec backoff ────────────────────────
        if (status === 429 && attempt < maxRetries) {
          console.warn(`⚠️ Géocodage 429 — backoff avant retry ${attempt + 1}/${maxRetries}`);
          continue;
        }

        // Autre erreur HTTP (500, 503…) → on sort sans retry
        break;
      }
    }

    // Tous les retries épuisés — retour dégradé sans lever d'exception
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
        : 'Impossible de vérifier votre localisation'
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