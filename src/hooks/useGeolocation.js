// ==========================================
// FICHIER: src/hooks/useGeolocation.js
// ✅ FIX 429 : suppression du setInterval redondant (cause principale des bursts)
// ✅ FIX 429 : debounce 2s sur le callback onPositionChange (→ reverseGeocode)
// ✅ watchPosition SEULEMENT — pas de polling parallèle
// ✅ FIX Vite 7 / Rollup : export default supprimé (conflit avec export nommé)
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
    minDistanceChange = 50,
    geocodeDebounceMs = 2000,
    onPositionChange  = null
  } = options;

  const [position,   setPosition]   = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef      = useRef(null);
  const lastPositionRef = useRef(null);
  const geocodeTimerRef = useRef(null);
  const onPositionRef   = useRef(onPositionChange);

  useEffect(() => {
    onPositionRef.current = onPositionChange;
  }, [onPositionChange]);

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

  const handlePosition = useCallback((geoPosition) => {
    const newPos = {
      latitude:  geoPosition.coords.latitude,
      longitude: geoPosition.coords.longitude,
      accuracy:  geoPosition.coords.accuracy,
      timestamp: geoPosition.timestamp
    };

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

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      if (onPositionRef.current) {
        onPositionRef.current(newPos);
      }
    }, geocodeDebounceMs);
  }, [haversineMeters, minDistanceChange, geocodeDebounceMs]);

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

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handlePosition, handleError]);

  const stopTracking = useCallback(() => {
    console.log('🛑 Arrêt du suivi GPS');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (geocodeTimerRef.current !== null) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }

    setIsTracking(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [enabled, startTracking, stopTracking]);

  return {
    position,
    error,
    loading,
    isTracking,
    getCurrentPosition,
    startTracking,
    stopTracking
  };
};