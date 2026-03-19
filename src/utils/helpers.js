// ==========================================
// FICHIER: src/utils/helpers.js
// ✅ FIX 429 : reverseGeocode local SUPPRIMÉ
//             → délégué à geocoding.js (cache 1h + retry backoff)
//             → ré-exporté pour compatibilité avec les imports existants
// ✅ getCurrentPosition utilise reverseGeocode de geocoding.js
// ==========================================

import { correctQuarterName, cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';

// ✅ Import de la version avec cache 1h + retry backoff
import { reverseGeocode as reverseGeocodeFromGeocoding } from './geocoding.js';

// ✅ Ré-export transparent : les composants qui font
//    import { reverseGeocode } from '../../utils/helpers'
//    obtiennent automatiquement la version avec cache — sans changer leur import.
export { reverseGeocode } from './geocoding.js';

/**
 * Formate un nombre en prix FCFA
 */
export const formatPrice = (price) => {
  if (!price && price !== 0) return '0 FCFA';
  return `${Math.round(price).toLocaleString('fr-FR')} FCFA`;
};

/**
 * Formate une distance en km ou m
 */
export const formatDistance = (distance) => {
  if (!distance && distance !== 0) return '';
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

/**
 * Formate une date en format lisible
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

/**
 * Formate une date avec l'heure
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Formate une durée relative (il y a X temps)
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';

  const date          = new Date(dateString);
  const now           = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "À l'instant";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Il y a ${diffInDays}j`;

  return formatDate(dateString);
};

/**
 * ✅ OBTENIR LA POSITION GÉOGRAPHIQUE ACTUELLE
 * Stratégie multi-mesures haute précision :
 *   - Collecte jusqu'à 5 mesures GPS successives via watchPosition
 *   - Retient la plus précise (accuracy la plus basse)
 *   - Arrêt anticipé si accuracy ≤ 30 m
 *   - Rejet si la meilleure mesure dépasse 150 m après 20 s
 *   - Géocodage via reverseGeocode de geocoding.js (cache 1h + retry backoff)
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas supportée par votre navigateur"));
      return;
    }

    const TARGET_ACCURACY         = 30;
    const MAX_ACCEPTABLE_ACCURACY = 150;
    const MAX_SAMPLES             = 5;
    const TIMEOUT_MS              = 20000;

    let bestPosition = null;
    let sampleCount  = 0;
    let watchId      = null;
    let timer        = null;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer   !== null) clearTimeout(timer);
    };

    const finish = async (pos) => {
      cleanup();

      const latitude  = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      const accuracy  = pos.coords.accuracy;

      console.log(`📍 Meilleure position retenue — précision : ±${Math.round(accuracy)} m`);

      try {
        // ✅ Utilise reverseGeocode de geocoding.js : cache 1h + retry backoff
        const locationData = await reverseGeocodeFromGeocoding(latitude, longitude);

        if (locationData.success) {
          resolve({
            latitude,
            longitude,
            accuracy,
            quarter:     locationData.quarter,
            city:        locationData.city,
            fullAddress: locationData.fullAddress,
            details:     locationData.details,
            source:      'backend',
            warning:     locationData.warning || null
          });
        } else {
          resolve({
            latitude,
            longitude,
            accuracy,
            quarter:        null,
            city:           null,
            geocodingError: locationData.error || 'Erreur de géocodage',
            source:         'error'
          });
        }
      } catch (geocodeError) {
        console.error('❌ Erreur géocodage:', geocodeError);
        resolve({
          latitude,
          longitude,
          accuracy,
          quarter:        null,
          city:           null,
          geocodingError: geocodeError.message,
          source:         'error'
        });
      }
    };

    const onSuccess = (pos) => {
      sampleCount++;
      const accuracy = pos.coords.accuracy;
      console.log(`📡 Mesure GPS #${sampleCount} — précision : ±${Math.round(accuracy)} m`);

      if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
        bestPosition = pos;
      }

      if (accuracy <= TARGET_ACCURACY || sampleCount >= MAX_SAMPLES) {
        finish(bestPosition);
      }
    };

    const onError = (error) => {
      if (bestPosition) {
        finish(bestPosition);
        return;
      }
      cleanup();

      let message;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Vous avez refusé l'accès à votre position. Veuillez activer la géolocalisation dans les paramètres de votre navigateur.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Position non disponible. Vérifiez que le GPS est activé sur votre appareil.';
          break;
        case error.TIMEOUT:
          message = 'La demande a expiré. Veuillez réessayer.';
          break;
        default:
          message = "Impossible d'obtenir votre position.";
      }
      reject(new Error(message));
    };

    timer = setTimeout(() => {
      if (bestPosition) {
        if (bestPosition.coords.accuracy > MAX_ACCEPTABLE_ACCURACY) {
          cleanup();
          reject(new Error(
            `Précision GPS insuffisante (±${Math.round(bestPosition.coords.accuracy)} m). ` +
            'Placez-vous dans un endroit dégagé et réessayez.'
          ));
        } else {
          finish(bestPosition);
        }
      } else {
        cleanup();
        reject(new Error('Délai dépassé. Assurez-vous que le GPS est activé et réessayez.'));
      }
    }, TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout:            TIMEOUT_MS,
      maximumAge:         0
    });
  });
};

/**
 * Ouvre l'application de navigation vers un lieu
 */
export const openNavigationToLocation = (latitude, longitude, placeName, userLocation = null) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  let navigationUrl;

  if (userLocation?.latitude && userLocation?.longitude) {
    if (isIOS) {
      navigationUrl = `http://maps.apple.com/?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${latitude},${longitude}&dirflg=d`;
    } else {
      navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${latitude},${longitude}&travelmode=driving`;
    }
  } else {
    if (isIOS) {
      navigationUrl = `http://maps.apple.com/?q=${encodeURIComponent(placeName)}&ll=${latitude},${longitude}`;
    } else {
      navigationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
  }

  console.log('🗺️ Ouverture navigation:', {
    url:             navigationUrl,
    destination:     placeName,
    coords:          `${latitude}, ${longitude}`,
    hasUserLocation: !!userLocation
  });

  window.open(navigationUrl, '_blank');
};

/**
 * Calculer la distance entre deux points GPS (en km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

const toRad = (value) => value * Math.PI / 180;

/**
 * Tronquer un texte avec ellipse
 */
export const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Obtenir les initiales d'un nom
 */
export const getInitials = (firstName, lastName) => {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last  = lastName  ? lastName.charAt(0).toUpperCase()  : '';
  return first + last;
};

/**
 * Valider un numéro de téléphone burkinabè
 */
export const isValidPhoneNumber = (phone) => {
  const regex = /^(\+?226|0)?[567]\d{7}$/;
  return regex.test(phone.replace(/\s/g, ''));
};

/**
 * Formater un numéro de téléphone
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('226')) return '+' + cleaned;
  if (cleaned.startsWith('0'))   return '+226' + cleaned.substring(1);
  return '+226' + cleaned;
};

/**
 * Copier du texte dans le presse-papier
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erreur copie:', error);
    return false;
  }
};

/**
 * Générer une couleur aléatoire (classe Tailwind)
 */
export const getRandomColor = () => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Convertir un fichier en base64
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Debounce une fonction
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Vérifier si un objet est vide
 */
export const isEmpty = (obj) => Object.keys(obj).length === 0;

/**
 * Obtenir un message d'erreur lisible
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message)                  return error.message;
  return 'Une erreur est survenue';
};

// ✅ EXPORT: Fonctions de correction pour utilisation externe
export { correctQuarterName, cleanAndValidateQuarterName } from '../data/quarterNameCorrections.js';