// ==========================================
// FICHIER: src/utils/geocoding.js
// ✅ FIX CORS  : appel via backend
// ✅ FIX 429   : file d'attente client (1 appel à la fois, délai 1.2s)
//               évite les bursts quand plusieurs composants se montent ensemble
// ✅ FIX 429   : retry backoff 3s/6s/12s (au lieu de 2s/4s)
// ✅ FIX 429   : cache client 1h avec clé arrondie à ~100m
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

// ── File d'attente client : 1 seul appel réseau geocoding à la fois ──────────
// Problème résolu : quand plusieurs composants se montent simultanément
// (MapPage + AddAddressModal + Products...), ils appellent tous reverseGeocode
// en même temps → burst → 429. La file sérialise ces appels avec un délai
// de 1.2s entre chaque, exactement comme nominatimQueue côté serveur.
// Les hits de cache court-circuitent la file → pas de délai pour eux.
let   clientQueue    = Promise.resolve();
const CLIENT_DELAY   = 1200; // ms entre deux appels réseau (respecte limite Nominatim)

function enqueueGeocode(fn) {
  clientQueue = clientQueue
    .then(() => fn())
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
 *  2. File d'attente client → 1 seul appel réseau à la fois, délai 1.2s
 *  3. Retry backoff exponentiel → 3s, 6s, 12s sur erreur 429
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

  // Sérialiser via la file d'attente pour éviter les bursts
  return enqueueGeocode(async () => {
    // Double-check cache : un autre appel en file a peut-être déjà rempli le cache
    const cachedAgain = clientCacheGet(key);
    if (cachedAgain) {
      console.log(`🗂️ Cache client hit (post-queue): ${key}`);
      return cachedAgain;
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

        const status = error?.response?.status || error?.status;
        if (status === 429 && attempt < maxRetries) {
          console.warn(`⚠️ Géocodage 429 — backoff avant retry ${attempt + 1}/${maxRetries}`);
          continue;
        }

        break;
      }
    }

    // Tous les retries épuisés — retour dégradé sans lever d'exception
    console.error('❌ Erreur géocodage backend après retries:', lastError);
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
      message: 'Impossible de vérifier votre localisation'
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