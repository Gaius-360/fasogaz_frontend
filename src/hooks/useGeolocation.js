// ==========================================
// FICHIER: src/hooks/useGeolocation.js
// ✅ FIX 429 : suppression du setInterval redondant (cause principale des bursts)
// ✅ FIX 429 : debounce 2s sur le callback onPositionChange (→ reverseGeocode)
// ✅ watchPosition SEULEMENT — pas de polling parallèle
// ==========================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook pour suivre la position géographique en temps réel
 * @param {Object} options - Options de configuration
 * @param {boolean} options.enabled              - Activer/désactiver le suivi
 * @param {number}  options.minDistanceChange    - Distance min (m) pour déclencher une mise à jour (défaut: 50)
 * @param {number}  options.geocodeDebounceMs    - Délai debounce avant d'appeler onPositionChange (défaut: 2000ms)
 * @param {Function} options.onPositionChange    - Callback appelé après déplacement significatif + debounce
 */
export const useGeolocation = (options = {}) => {
  const {
    enabled           = false,
    minDistanceChange = 50,      // mètres
    geocodeDebounceMs = 2000,    // ms — évite les appels geocoding en rafale
    onPositionChange  = null
  } = options;

  const [position,   setPosition]   = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef      = useRef(null);
  const lastPositionRef = useRef(null);
  const geocodeTimerRef = useRef(null);   // ✅ debounce timer
  const onPositionRef   = useRef(onPositionChange);

  // Garder la ref à jour sans recréer les callbacks
  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);

  // ── Distance Haversine (en mètres) ─────────────────────────────────────────
  const haversineMeters = useCallback((lat1, lon1, lat2, lon2) => {
    const R    = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // ── Gestion d'une nouvelle mesure GPS ──────────────────────────────────────
  const handlePosition = useCallback((geoPosition) => {
    const newPos = {
      latitude:  geoPosition.coords.latitude,
      longitude: geoPosition.coords.longitude,
      accuracy:  geoPosition.coords.accuracy,
      timestamp: geoPosition.timestamp
    };

    // Filtrer les déplacements inférieurs au seuil
    if (lastPositionRef.current) {
      const dist = haversineMeters(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newPos.latitude,
        newPos.longitude
      );

      if (dist < minDistanceChange) {
        console.log(`📍 Déplacement ignoré (${dist.toFixed(0)}m < ${minDistanceChange}m)`);
        return;
      }

      console.log(`📍 Déplacement significatif : ${dist.toFixed(0)}m`);
    }

    lastPositionRef.current = newPos;
    setPosition(newPos);
    setError(null);
    setLoading(false);

    // ✅ Debounce : n'appeler onPositionChange (→ reverseGeocode) qu'après
    // geocodeDebounceMs ms d'inactivité, pour éviter les bursts si watchPosition
    // déclenche plusieurs mesures rapprochées (ex. démarrage GPS, bâtiments).
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      if (onPositionRef.current) {
        onPositionRef.current(newPos);
      }
    }, geocodeDebounceMs);
  }, [haversineMeters, minDistanceChange, geocodeDebounceMs]);

  // ── Gestion des erreurs GPS ─────────────────────────────────────────────────
  const handleError = useCallback((geoError) => {
    let message;
    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        message = 'Permission de géolocalisation refusée';
        break;
      case geoError.POSITION_UNAVAILABLE:
        message = 'Position non disponible';
        break;
      case geoError.TIMEOUT:
        message = 'Délai de géolocalisation dépassé';
        break;
      default:
        message = 'Erreur inconnue de géolocalisation';
    }

    console.error('❌ Erreur géolocalisation:', message);
    setError(message);
    setLoading(false);
    setIsTracking(false);
  }, []);

  // ── Position ponctuelle (one-shot) ─────────────────────────────────────────
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      const err = new Error('Géolocalisation non supportée');
      setError(err.message);
      return Promise.reject(err);
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos);
          resolve({
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy:  pos.coords.accuracy
          });
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [handlePosition, handleError]);

  // ── Démarrer le suivi continu ───────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }

    if (watchIdRef.current !== null) {
      console.log('⚠️ Suivi déjà actif');
      return;
    }

    console.log('🎯 Démarrage du suivi GPS (watchPosition uniquement)');
    setLoading(true);
    setIsTracking(true);

    // ✅ watchPosition SEULEMENT.
    // L'ancien setInterval de polling a été supprimé : il dupliquait chaque
    // mesure GPS et provoquait des bursts de requêtes vers /api/geocoding.
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handlePosition, handleError]);

  // ── Arrêter le suivi ────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    console.log('🛑 Arrêt du suivi GPS');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Annuler le debounce en cours pour ne pas appeler geocoding après l'arrêt
    if (geocodeTimerRef.current !== null) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }

    setIsTracking(false);
    setLoading(false);
  }, []);

  // ── Effet : réagir aux changements de `enabled` ────────────────────────────
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [enabled, startTracking, stopTracking]);

  return {
    position,            // {latitude, longitude, accuracy, timestamp} | null
    error,               // message d'erreur | null
    loading,             // true pendant l'acquisition initiale
    isTracking,          // true si watchPosition actif
    getCurrentPosition,  // obtenir position ponctuelle
    startTracking,       // démarrer le suivi manuellement
    stopTracking         // arrêter le suivi manuellement
  };
};

export default useGeolocation;