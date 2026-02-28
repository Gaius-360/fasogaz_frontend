// ==========================================
// FICHIER: src/utils/locationValidation.js
// ✅ Validation GPS — vérifie que l'utilisateur est bien dans la ville choisie
// Périmètre de tolérance: ~30km autour du centre-ville
// ==========================================

/**
 * Coordonnées centrales et rayons des villes autorisées (en km)
 */
const SUPPORTED_CITIES = {
  'Ouagadougou': {
    lat: 12.3647,
    lon: -1.5339,
    radiusKm: 30, // Rayon de 30km autour du centre
    names: ['ouagadougou', 'ouaga']
  },
  'Bobo-Dioulasso': {
    lat: 11.1771,
    lon: -4.2979,
    radiusKm: 25,
    names: ['bobo-dioulasso', 'bobo dioulasso', 'bobo']
  }
};

/**
 * Calcul de distance Haversine entre deux points GPS (en km)
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Obtenir la position GPS actuelle de l'utilisateur
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentGPSPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas supportée par votre navigateur'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message = 'Impossible d\'obtenir votre position';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Vous avez refusé l\'accès à votre position. Veuillez activer la géolocalisation dans les paramètres de votre navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Position non disponible. Vérifiez que le GPS est activé.';
            break;
          case error.TIMEOUT:
            message = 'La demande de localisation a expiré. Réessayez.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Valider que les coordonnées GPS correspondent à la ville choisie
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} selectedCity  — valeur du select ("Ouagadougou" ou "Bobo-Dioulasso")
 * @returns {{ valid: boolean, distance: number, message: string, city: object|null }}
 */
export const validateUserIsInCity = (latitude, longitude, selectedCity) => {
  const cityConfig = SUPPORTED_CITIES[selectedCity];

  if (!cityConfig) {
    return {
      valid: false,
      distance: null,
      message: `Ville "${selectedCity}" non reconnue.`,
      city: null
    };
  }

  const distance = haversineDistance(
    latitude,
    longitude,
    cityConfig.lat,
    cityConfig.lon
  );

  const distanceRounded = Math.round(distance * 10) / 10;

  if (distance <= cityConfig.radiusKm) {
    return {
      valid: true,
      distance: distanceRounded,
      message: `Position confirmée : vous êtes à ${distanceRounded} km du centre de ${selectedCity}.`,
      city: cityConfig
    };
  }

  // Trouver la ville la plus proche parmi les villes supportées
  let closestCity = null;
  let closestDistance = Infinity;
  for (const [name, config] of Object.entries(SUPPORTED_CITIES)) {
    const d = haversineDistance(latitude, longitude, config.lat, config.lon);
    if (d < closestDistance) {
      closestDistance = d;
      closestCity = name;
    }
  }

  const closestDistanceRounded = Math.round(closestDistance * 10) / 10;
  const isInAnotherSupportedCity = closestDistance <= SUPPORTED_CITIES[closestCity]?.radiusKm;

  if (isInAnotherSupportedCity && closestCity !== selectedCity) {
    return {
      valid: false,
      distance: distanceRounded,
      message: `Vous semblez être à ${closestCity} (à ${closestDistanceRounded} km), pas à ${selectedCity}. Veuillez sélectionner la bonne ville.`,
      city: null,
      suggestedCity: closestCity
    };
  }

  return {
    valid: false,
    distance: distanceRounded,
    message: `Votre position est trop éloignée de ${selectedCity} (${distanceRounded} km). FasoGaz n'est disponible qu'à Ouagadougou et Bobo-Dioulasso.`,
    city: null
  };
};

/**
 * Étape complète : obtenir le GPS puis valider la ville
 * @param {string} selectedCity
 * @returns {Promise<{ valid: boolean, latitude?: number, longitude?: number, distance?: number, message: string, suggestedCity?: string }>}
 */
export const verifyUserLocationForCity = async (selectedCity) => {
  if (!selectedCity) {
    return {
      valid: false,
      message: 'Veuillez d\'abord sélectionner une ville.'
    };
  }

  // Obtenir la position GPS
  const position = await getCurrentGPSPosition(); // peut throw

  const result = validateUserIsInCity(
    position.latitude,
    position.longitude,
    selectedCity
  );

  return {
    ...result,
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy
  };
};