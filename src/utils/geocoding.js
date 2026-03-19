// ==========================================
// FICHIER: src/utils/geocoding.js
// ✅ FIX CORS : appel via backend au lieu de Nominatim directement
// ✅ FIX 429  : retry avec backoff exponentiel (max 2 tentatives)
// ==========================================

import userApi from '../api/apiSwitch';
import { cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';

// ── Cache côté client (évite des appels réseau répétés pour la même position) ─
// Arrondi à 3 décimales ≈ 111m — suffisant pour un quartier
const CLIENT_CACHE     = new Map();
const CLIENT_CACHE_TTL = 60 * 60 * 1000; // 1h côté client

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
    // Vider les plus anciennes entrées
    const firstKey = CLIENT_CACHE.keys().next().value;
    CLIENT_CACHE.delete(firstKey);
  }
  CLIENT_CACHE.set(key, { data, ts: Date.now() });
}

// ── Helper : attente async ────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Géocodage inversé via le backend (évite CORS + gère le rate limiting Nominatim)
 * Retry automatique avec backoff exponentiel sur erreur 429.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} maxRetries - nombre max de tentatives sur 429 (défaut: 2)
 * @returns {Promise<Object>}
 */
export const reverseGeocode = async (latitude, longitude, maxRetries = 2) => {
  const key    = clientCacheKey(latitude, longitude);
  const cached = clientCacheGet(key);
  if (cached) {
    console.log(`🗂️ Cache client hit: ${key}`);
    return cached;
  }

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Backoff exponentiel : 2s, 4s, ...
        const delay = Math.pow(2, attempt) * 1000;
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

      // Extraire le quartier brut
      const rawQuarter =
        address.suburb        ||
        address.neighbourhood ||
        address.hamlet        ||
        address.quarter       ||
        address.city_district ||
        address.residential   ||
        null;

      // Corriger/valider le nom du quartier
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

      // 429 → on retente si on a encore des essais
      const status = error?.response?.status || error?.status;
      if (status === 429 && attempt < maxRetries) {
        console.warn(`⚠️ Géocodage 429 — backoff avant retry ${attempt + 1}/${maxRetries}`);
        continue;
      }

      // Autre erreur ou plus de retries → sortir de la boucle
      break;
    }
  }

  // Tous les retries épuisés
  console.error('❌ Erreur géocodage backend après retries:', lastError);

  // Retourner un résultat dégradé sans lever d'exception
  // (l'inscription/adresse peut continuer sans quartier)
  return {
    success: false,
    error:   lastError?.message || 'Erreur de géocodage',
    quarter: null,
    city:    null,
  };
};

/**
 * Obtenir uniquement le quartier depuis des coordonnées GPS
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string|null>}
 */
export const getQuarterFromCoordinates = async (latitude, longitude) => {
  const result = await reverseGeocode(latitude, longitude);
  return result.success ? result.quarter : null;
};

/**
 * Valider si les coordonnées sont dans une ville supportée
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>}
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