// ==========================================
// FICHIER: src/pages/client/MapPage.jsx
// ✅ REFONTE: Abonnement classique
//    Sans abonnement → 3 revendeurs visibles (ville du client uniquement) + bannière
//    Avec abonnement → tous les revendeurs + filtre ville (Ouaga / Bobo / Toutes)
//    Suppression: système accès 24h, AccessPurchaseModal, showAccessModal
// ==========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Loader2, AlertCircle, Navigation, Plus, Clock, Crown,
  Radio, X, ChevronRight, Flame, Check, Star, ChevronDown, Lock
} from 'lucide-react';
import SearchFilters from '../../components/client/SearchFilters';
import SellerCard from '../../components/client/SellerCard';
import SellerDetailsModal from '../../components/client/SellerDetailsModal';
import AddAddressModal from '../../components/client/AddAddressModal';
import TrackingNotification from '../../components/common/TrackingNotification';
import SubscriptionModal from '../../components/client/SubscriptionModal';
import Alert from '../../components/common/Alert';
import { api } from '../../api/apiSwitch';
import useAuthStore from '../../store/authStore';
import { useGeolocationContext } from '../../contexts/GeolocationContext';
import { openNavigationToLocation } from '../../utils/helpers';

// ── Villes disponibles ────────────────────────────────────────────────────────
const AVAILABLE_CITIES = ['Ouagadougou', 'Bobo-Dioulasso'];

// ─── AddressDrawer ────────────────────────────────────────────────────────────
const AddressDrawer = ({ addresses, activeAddressId, onSelect, onClose, onAddNew }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 280); };
  const handleSelect = (address) => { onSelect(address); close(); };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{
        background:    `rgba(0,0,0,${visible ? .45 : 0})`,
        backdropFilter: `blur(${visible ? 4 : 0}px)`,
        transition:    'background .28s ease, backdrop-filter .28s ease'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{
          transform:  visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          maxHeight:  '70vh'
        }}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">Changer d'adresse</h3>
          <button onClick={close} className="p-1.5 rounded-full bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 space-y-2" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {addresses.map((address) => {
            const isActive = address.id === activeAddressId;
            return (
              <button key={address.id} type="button" onClick={() => handleSelect(address)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[.98] ${
                  isActive ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <MapPin className={`h-4 w-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-orange-900' : 'text-gray-800'}`}>
                      {address.label}
                    </p>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-semibold flex-shrink-0">
                        <Star className="h-2.5 w-2.5 fill-orange-400" />Défaut
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {address.quarter ? `${address.quarter}, ${address.city}` : address.city}
                  </p>
                </div>
                {isActive && (
                  <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
          <button type="button" onClick={() => { close(); setTimeout(onAddNew, 300); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all mt-1"
          >
            <Plus className="h-4 w-4" />Ajouter une adresse
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ActiveAddressBar ─────────────────────────────────────────────────────────
const ActiveAddressBar = ({ address, trackingMode, onPress }) => {
  if (trackingMode) return null;
  return (
    <button type="button" onClick={onPress}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-left hover:bg-gray-100 active:bg-gray-100"
    >
      <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
        <span className="text-xs text-gray-400 flex-shrink-0">Résultats pour</span>
        <span className="text-xs font-bold text-gray-700 truncate">{address?.label || '—'}</span>
        {address?.isDefault && (
          <span className="text-xs text-gray-400 flex-shrink-0">(par défaut)</span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-orange-500 font-semibold">Changer</span>
        <ChevronDown className="h-3.5 w-3.5 text-orange-400" />
      </div>
    </button>
  );
};

// ─── Bannière abonnement ──────────────────────────────────────────────────────
const SubscriptionBanner = ({ hiddenCount, plans, onSubscribe }) => {
  const cheapestPlan = Object.values(plans || {}).sort((a, b) => a.price - b.price)[0];

  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-lg shadow-orange-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-white mb-0.5">
            {hiddenCount > 0
              ? `${hiddenCount} revendeur${hiddenCount > 1 ? 's' : ''} supplémentaire${hiddenCount > 1 ? 's' : ''} près de vous`
              : 'Voir tous les revendeurs'}
          </p>
          <p className="text-xs text-white/85 mb-2">
            Abonnez-vous pour accéder à toute la carte, aux deux villes et aux filtres avancés
          </p>
          {cheapestPlan && (
            <p className="text-xs text-white/70">
              À partir de {new Intl.NumberFormat('fr-FR', {
                style: 'currency', currency: 'XOF', minimumFractionDigits: 0
              }).format(cheapestPlan.price)}
            </p>
          )}
        </div>
        <button
          onClick={onSubscribe}
          className="flex-shrink-0 bg-white text-orange-600 text-xs font-extrabold py-2 px-3.5 rounded-xl active:scale-95 transition-transform shadow"
        >
          S'abonner
        </button>
      </div>
    </div>
  );
};

// ─── Sélecteur de ville (abonnés uniquement) ──────────────────────────────────
const CitySelector = ({ selectedCity, onChange, sellersCount }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
    <div className="flex items-center gap-3">
      <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-gray-400 font-medium mb-1.5">Ville</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '',               label: 'Toutes' },
            { value: 'Ouagadougou',    label: 'Ouagadougou' },
            { value: 'Bobo-Dioulasso', label: 'Bobo-Dioulasso' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                selectedCity === value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {sellersCount > 0 && (
        <span className="text-xs text-orange-500 font-semibold flex-shrink-0">
          {sellersCount} dépôt{sellersCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const MapPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    position: livePosition,
    isTracking,
    enableTracking,
    disableTracking,
    autoStopReason,
    setOnAutoStop
  } = useGeolocationContext();

  const [loading, setLoading]                   = useState(true);
  const [loadingAccess, setLoadingAccess]       = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [sellers, setSellers]                   = useState([]);
  const [filteredSellers, setFilteredSellers]   = useState([]);
  const [hiddenCount, setHiddenCount]           = useState(0);
  const [selectedSeller, setSelectedSeller]     = useState(null);
  const [userLocation, setUserLocation]         = useState(null);
  const [addresses, setAddresses]               = useState([]);
  const [activeAddressId, setActiveAddressId]   = useState(null);
  const [alert, setAlert]                       = useState(null);
  const [showAddAddressModal, setShowAddAddressModal]     = useState(false);
  const [showAddressDrawer, setShowAddressDrawer]         = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [trackingMode, setTrackingMode]         = useState(false);
  const [lastSearchPosition, setLastSearchPosition] = useState(null);
  const [showAutoStopNotification, setShowAutoStopNotification] = useState(false);
  const [showGpsOnboarding, setShowGpsOnboarding] = useState(false);

  // ✅ Filtre ville — '' = toutes (abonnés uniquement)
  const [selectedCity, setSelectedCity] = useState('');

  const GPS_ONBOARDING_KEY = 'fasogaz_gps_onboarding_seen';

  const trackingModeRef = useRef(false);
  useEffect(() => { trackingModeRef.current = trackingMode; }, [trackingMode]);

  // ✅ accessStatus — sans accès 24h
  const [accessStatus, setAccessStatus] = useState({
    hasAccess:      false,
    accessType:     'none',
    isSystemActive: false,
    maxSellers:     3,
    expiresAt:      null,
    remainingDays:  0,
    plans:          {}
  });

  const [filters, setFilters] = useState({
    bottleType: '', brand: '', minPrice: '', maxPrice: '', radius: ''
  });

  const MIN_MOVEMENT_FOR_REFRESH = 100;
  const isSearchingRef = useRef(false);

  const activeAddress = addresses.find(a => a.id === activeAddressId)
    || addresses.find(a => a.isDefault)
    || addresses[0]
    || null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Retourne la ville à utiliser dans la recherche selon l'abonnement.
   * - Non-abonné : ville du client (forcée)
   * - Abonné avec filtre '' : on envoie '' → backend retourne toutes les villes
   * - Abonné avec filtre ville : on envoie la ville choisie
   */
  const getSearchCity = useCallback((overrideCity) => {
    if (accessStatus.hasAccess) {
      // '' envoyé tel quel → backend comprend "toutes les villes"
      return overrideCity !== undefined ? overrideCity : selectedCity;
    }
    // Non-abonné : toujours sa propre ville
    return user?.city || '';
  }, [accessStatus.hasAccess, selectedCity, user?.city]);

  // ── Auto-stop GPS ────────────────────────────────────────────────────────
  useEffect(() => {
    setOnAutoStop(() => {
      setTrackingMode(false);
      trackingModeRef.current = false;
      setShowAutoStopNotification(true);
      if (addresses.length > 0) {
        const ref = addresses.find(a => a.isDefault) || addresses[0];
        if (ref?.latitude && ref?.longitude) {
          const location = {
            latitude:  parseFloat(ref.latitude),
            longitude: parseFloat(ref.longitude)
          };
          setUserLocation(location);
          searchProducts(
            { ...filters, latitude: location.latitude, longitude: location.longitude, city: getSearchCity() },
            true
          );
        }
      }
    });
  }, [setOnAutoStop, addresses, filters, getSearchCity]);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R    = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // ── Vérification abonnement ──────────────────────────────────────────────
  const checkAccessStatus = useCallback(async () => {
    try {
      const response = await api.access.checkStatus();
      if (response?.success) {
        const s = response.data;
        setAccessStatus({
          hasAccess:      s.hasAccess,
          accessType:     s.accessType,
          isSystemActive: s.isSystemActive || false,
          maxSellers:     s.maxSellers,
          expiresAt:      s.expiresAt,
          remainingDays:  s.remainingDays || 0,
          plans:          s.plans || {}
        });
      }
    } catch {
      setAccessStatus({
        hasAccess:      false,
        accessType:     'error',
        isSystemActive: false,
        maxSellers:     3,
        plans:          {}
      });
    } finally {
      setLoadingAccess(false);
    }
  }, []);

  // ── searchProducts ───────────────────────────────────────────────────────
  const searchProducts = useCallback(async (searchFilters, forceRefresh = false) => {
    if (isSearchingRef.current && !forceRefresh) return;
    try {
      isSearchingRef.current = true;
      const params = {};

      // ✅ city peut être '' (abonné, toutes villes) ou une ville précise
      //    Si '' → on ne l'envoie pas → backend détecte l'absence et retourne tout
      //    Si ville précise → on l'envoie
      const city = searchFilters.city !== undefined ? searchFilters.city : '';
      if (city) params.city = city;

      if (searchFilters.bottleType) params.bottleType = searchFilters.bottleType;
      if (searchFilters.brand)      params.brand      = searchFilters.brand;
      if (searchFilters.minPrice)   params.minPrice   = searchFilters.minPrice;
      if (searchFilters.maxPrice)   params.maxPrice   = searchFilters.maxPrice;
      if (searchFilters.latitude)   params.latitude   = searchFilters.latitude;
      if (searchFilters.longitude)  params.longitude  = searchFilters.longitude;
      if (searchFilters.radius && parseFloat(searchFilters.radius) > 0) {
        params.radius = parseFloat(searchFilters.radius);
      }

      const response = await api.products.searchProducts(params);
      if (response.success) {
        const sellersData = response.data.sellers  || [];
        const accessInfo  = response.data.accessInfo || {};

        // ✅ Mettre à jour accessStatus depuis la réponse
        if (accessInfo.hasAccess !== undefined) {
          setAccessStatus(prev => ({
            ...prev,
            hasAccess:      accessInfo.hasAccess,
            accessType:     accessInfo.accessType     || prev.accessType,
            maxSellers:     accessInfo.maxSellers      ?? prev.maxSellers,
            isSystemActive: accessInfo.isSystemActive  ?? prev.isSystemActive
          }));
        }

        setSellers(sellersData);
        setFilteredSellers(sellersData);
        setHiddenCount(accessInfo.hiddenCount || 0);
      }
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors de la recherche des revendeurs' });
    } finally {
      isSearchingRef.current = false;
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    try {
      const response = await api.addresses.getMyAddresses();
      if (response?.success) {
        const list = response.data || [];
        setAddresses(list);
        if (list.length > 0 && !trackingModeRef.current) {
          const def = list.find(a => a.isDefault) || list[0];
          setActiveAddressId(def.id);
          if (def.latitude && def.longitude) {
            const loc = {
              latitude:  parseFloat(def.latitude),
              longitude: parseFloat(def.longitude)
            };
            setUserLocation(loc);
            return loc;
          }
        }
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
    return null;
  }, []);

  const loadProducts = useCallback(async (location, cityOverride) => {
    setLoading(true);
    try {
      const city = cityOverride !== undefined ? cityOverride : getSearchCity();
      await searchProducts({
        ...filters,
        city,
        ...(location?.latitude  && { latitude:  location.latitude  }),
        ...(location?.longitude && { longitude: location.longitude })
      });
      if (location) setLastSearchPosition(location);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters, searchProducts, getSearchCity]);

  // ── Handler : changement de ville (abonnés) ──────────────────────────────
  const handleCityChange = useCallback((city) => {
    setSelectedCity(city);
    searchProducts({
      ...filters,
      city,
      ...(userLocation?.latitude  && { latitude:  userLocation.latitude  }),
      ...(userLocation?.longitude && { longitude: userLocation.longitude })
    }, true);
  }, [filters, userLocation, searchProducts]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectAddress = useCallback((address) => {
    if (!address.latitude || !address.longitude) {
      setAlert({ type: 'error', message: `"${address.label}" n'a pas de coordonnées GPS.` });
      return;
    }
    const location = {
      latitude:  parseFloat(address.latitude),
      longitude: parseFloat(address.longitude)
    };
    setActiveAddressId(address.id);
    setUserLocation(location);
    searchProducts({
      ...filters,
      latitude:  location.latitude,
      longitude: location.longitude,
      city:      getSearchCity()
    }, true);
    setAlert({ type: 'success', message: `📍 Résultats mis à jour pour « ${address.label} »` });
  }, [filters, searchProducts, getSearchCity]);

  const handleToggleTracking = useCallback(async () => {
    if (trackingMode) {
      disableTracking();
      setTrackingMode(false);
      trackingModeRef.current = false;
      if (addresses.length > 0) {
        const ref = addresses.find(a => a.id === activeAddressId)
          || addresses.find(a => a.isDefault)
          || addresses[0];
        if (ref?.latitude && ref?.longitude) {
          const location = {
            latitude:  parseFloat(ref.latitude),
            longitude: parseFloat(ref.longitude)
          };
          setUserLocation(location);
          searchProducts({
            ...filters,
            latitude:  location.latitude,
            longitude: location.longitude,
            city:      getSearchCity()
          }, true);
        }
      }
      setAlert({ type: 'info', message: '📍 Mode position fixe activé' });
    } else {
      try {
        setAlert({ type: 'info', message: '📡 Obtention de votre position GPS...' });
        const currentPos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({
              latitude:  p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy:  p.coords.accuracy
            }),
            (e) => reject(e),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });
        setUserLocation(currentPos);
        setLastSearchPosition(currentPos);
        await searchProducts({
          ...filters,
          latitude:  currentPos.latitude,
          longitude: currentPos.longitude,
          city:      getSearchCity()
        }, true);
        enableTracking((newPosition) => {
          if (lastSearchPosition) {
            const dist = calculateDistance(
              lastSearchPosition.latitude,
              lastSearchPosition.longitude,
              newPosition.latitude,
              newPosition.longitude
            );
            if (dist < MIN_MOVEMENT_FOR_REFRESH) return;
          }
          setLastSearchPosition(newPosition);
          setUserLocation(newPosition);
          searchProducts({
            ...filters,
            latitude:  newPosition.latitude,
            longitude: newPosition.longitude,
            city:      getSearchCity()
          }, true);
        });
        setTrackingMode(true);
        trackingModeRef.current = true;
        const alreadySeen = localStorage.getItem(GPS_ONBOARDING_KEY);
        if (!alreadySeen) {
          setShowGpsOnboarding(true);
          localStorage.setItem(GPS_ONBOARDING_KEY, 'true');
          setTimeout(() => setShowGpsOnboarding(false), 5000);
        }
        setAlert({ type: 'success', message: '🎯 Suivi GPS activé' });
      } catch (gpsError) {
        const msg =
          gpsError.code === 1 ? '❌ Permission GPS refusée'
          : gpsError.code === 2 ? '❌ Position GPS non disponible'
          : gpsError.code === 3 ? '❌ Délai GPS dépassé'
          : "❌ Impossible d'obtenir votre position GPS";
        setAlert({ type: 'error', message: msg });
      }
    }
  }, [
    trackingMode, enableTracking, disableTracking, filters,
    lastSearchPosition, calculateDistance, searchProducts,
    addresses, activeAddressId, getSearchCity
  ]);

  const handleReactivateTracking = useCallback(async () => {
    setShowAutoStopNotification(false);
    await handleToggleTracking();
  }, [handleToggleTracking]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    searchProducts({
      ...newFilters,
      city:      getSearchCity(),
      ...(userLocation?.latitude  && { latitude:  userLocation.latitude  }),
      ...(userLocation?.longitude && { longitude: userLocation.longitude })
    }, true);
  };

  const handleCall     = (phone)         => window.location.href = `tel:${phone}`;
  const handleNavigate = (seller, userLoc) => {
    const lat = seller.latitude  ? parseFloat(seller.latitude)  : null;
    const lon = seller.longitude ? parseFloat(seller.longitude) : null;
    if (lat && lon) {
      const loc = userLoc || userLocation;
      openNavigationToLocation(
        lat, lon,
        seller.businessName || `Dépôt ${seller.quarter || seller.city}`,
        loc
      );
    } else {
      setAlert({ type: 'error', message: 'Coordonnées GPS du revendeur non disponibles' });
    }
  };
  const handleOrder = (seller, products) => {
    navigate('/client/order/new', { state: { seller, products } });
  };

  const handleAddressAdded = async () => {
    setShowAddAddressModal(false);
    setLoadingAddresses(true);
    await loadAddresses();
    const response = await api.addresses.getMyAddresses();
    if (response?.success && response.data?.length > 0) {
      const newAddr = response.data.find(a => a.isDefault) || response.data[0];
      if (newAddr.latitude && newAddr.longitude) {
        const location = {
          latitude:  parseFloat(newAddr.latitude),
          longitude: parseFloat(newAddr.longitude)
        };
        setActiveAddressId(newAddr.id);
        setUserLocation(location);
        await loadProducts(location);
      }
    }
    setAlert({ type: 'success', message: 'Adresse ajoutée avec succès !' });
  };

  const handleSubscriptionSuccess = async () => {
    setShowSubscriptionModal(false);
    await checkAccessStatus();
    setAlert({ type: 'success', message: '🎉 Abonnement activé ! Tous les revendeurs sont maintenant visibles.' });
    if (userLocation) loadProducts(userLocation);
    else loadProducts(null);
  };

  // ── Live tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trackingMode || !livePosition) return;
    setUserLocation(livePosition);
    searchProducts({
      ...filters,
      latitude:  livePosition.latitude,
      longitude: livePosition.longitude,
      city:      getSearchCity()
    }, true);
  }, [trackingMode, livePosition]);

  useEffect(() => { checkAccessStatus(); }, [checkAccessStatus]);

  useEffect(() => {
    if (!loadingAccess) {
      loadAddresses().then(loc => {
        loadProducts(loc);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAccess]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingAccess || loadingAddresses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Flame className="h-8 w-8 text-orange-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          </div>
        </div>
        <p className="text-gray-800 font-semibold text-lg">Chargement en cours</p>
        <p className="text-gray-500 text-sm mt-1">Recherche des dépôts de gaz...</p>
      </div>
    );
  }

  // ── No address ────────────────────────────────────────────────────────────
  if (addresses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Trouver du gaz</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center shadow-sm">
              <Navigation className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Plus className="h-4 w-4 text-orange-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Enregistrez votre adresse</h2>
          <p className="text-gray-500 text-center text-base leading-relaxed mb-8">
            Pour voir les dépôts de gaz disponibles dans votre ville, ajoutez votre adresse avec position GPS.
          </p>
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">Activez la géolocalisation pour une meilleure précision.</p>
          </div>
          <button
            onClick={() => setShowAddAddressModal(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-200"
          >
            <Plus className="h-5 w-5" />Ajouter mon adresse
          </button>
        </div>
        {showAddAddressModal && (
          <AddAddressModal onClose={() => setShowAddAddressModal(false)} onSuccess={handleAddressAdded} />
        )}
      </div>
    );
  }

  // ── Loading sellers ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-600 font-medium">Recherche des dépôts...</p>
        <p className="text-gray-400 text-sm mt-1">
          {accessStatus.hasAccess && !selectedCity
            ? 'Tous les dépôts disponibles'
            : `Tous les dépôts de ${selectedCity || user?.city || 'votre ville'}`}
        </p>
      </div>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Trouver du gaz</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredSellers.length} dépôt{filteredSellers.length !== 1 ? 's' : ''}
              {hiddenCount > 0 && (
                <span className="text-orange-500 font-semibold">
                  {' '}· {hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}
                </span>
              )}
              {accessStatus.hasAccess && !selectedCity
                ? ' · toutes villes'
                : selectedCity
                  ? ` · ${selectedCity}`
                  : ` · ${user?.city || 'votre ville'}`}
            </p>
          </div>
          <button
            onClick={handleToggleTracking}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              trackingMode
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${trackingMode ? 'animate-pulse' : ''}`} />
            {trackingMode ? 'Arrêter le suivi' : 'Je bouge, suis-moi'}
          </button>
        </div>

        {trackingMode && userLocation ? (
          <div className="px-4 pb-2.5">
            <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-xs text-green-700 font-medium truncate">
                Suivi en direct · {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
              </p>
            </div>
          </div>
        ) : (
          <ActiveAddressBar
            address={activeAddress}
            trackingMode={trackingMode}
            onPress={() => setShowAddressDrawer(true)}
          />
        )}
      </div>

      {/* Contenu */}
      <div className="px-4 py-3 space-y-3 pb-24">

        {showAutoStopNotification && autoStopReason && (
          <TrackingNotification
            reason={autoStopReason}
            onClose={() => setShowAutoStopNotification(false)}
            onReactivate={handleReactivateTracking}
          />
        )}

        {showGpsOnboarding && (
          <div className="bg-green-600 text-white rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <div className="text-2xl flex-shrink-0">📍</div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">L'app vous suit maintenant !</p>
              <p className="text-xs text-green-100 leading-relaxed">
                Les dépôts sont triés par distance à partir de votre position actuelle.
              </p>
            </div>
            <button
              onClick={() => setShowGpsOnboarding(false)}
              className="flex-shrink-0 p-1 hover:bg-green-500 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {alert && (
          <Alert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />
        )}

        {/* ✅ Bannière abonnement actif */}
        {accessStatus.hasAccess && accessStatus.accessType === 'active' && accessStatus.expiresAt && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Crown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">Abonnement actif</p>
                <p className="text-xs text-green-600">
                  {accessStatus.remainingDays} jour{accessStatus.remainingDays > 1 ? 's' : ''} restant{accessStatus.remainingDays > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-400">Expire le</p>
              <p className="text-xs font-semibold text-green-700">
                {new Date(accessStatus.expiresAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short'
                })}
              </p>
            </div>
          </div>
        )}

        {/* ✅ Bannière invitation à s'abonner */}
        {!accessStatus.hasAccess && accessStatus.isSystemActive && (
          <SubscriptionBanner
            hiddenCount={hiddenCount}
            plans={accessStatus.plans}
            onSubscribe={() => setShowSubscriptionModal(true)}
          />
        )}

        {/* ✅ Sélecteur de ville — abonnés uniquement */}
        {accessStatus.hasAccess && (
          <CitySelector
            selectedCity={selectedCity}
            onChange={handleCityChange}
            sellersCount={filteredSellers.length}
          />
        )}

        <SearchFilters
          onApplyFilters={handleApplyFilters}
          initialFilters={filters}
          accessType={accessStatus.hasAccess ? 'active' : accessStatus.accessType}
          hasAccess={accessStatus.hasAccess}
        />

        {/* Liste dépôts */}
        {filteredSellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-1">Aucun dépôt trouvé</h3>
            <p className="text-sm text-gray-400 text-center">
              Aucun dépôt disponible
              {selectedCity ? ` à ${selectedCity}` : accessStatus.hasAccess ? ' dans les villes disponibles' : ` à ${user?.city || 'votre ville'}`}.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSellers.map((seller) => (
                <SellerCard
                  key={seller.id}
                  seller={seller}
                  distance={seller.distance}
                  onViewDetails={(s) => setSelectedSeller(s)}
                  onCall={handleCall}
                  onNavigate={handleNavigate}
                  hasAccess={true}
                  onAccessRequired={() => setShowSubscriptionModal(true)}
                />
              ))}
            </div>

            {/* ✅ Teaser revendeurs cachés */}
            {hiddenCount > 0 && !accessStatus.hasAccess && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full border-2 border-dashed border-orange-300 rounded-2xl py-5 px-4 flex items-center justify-center gap-3 bg-orange-50 hover:bg-orange-100 active:scale-[.98] transition-all"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-orange-800">
                    {hiddenCount} revendeur{hiddenCount > 1 ? 's' : ''} masqué{hiddenCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-orange-600">S'abonner pour voir la carte complète</p>
                </div>
                <ChevronRight className="h-5 w-5 text-orange-400 ml-auto flex-shrink-0" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddressDrawer && (
        <AddressDrawer
          addresses={addresses}
          activeAddressId={activeAddressId || activeAddress?.id}
          onSelect={handleSelectAddress}
          onClose={() => setShowAddressDrawer(false)}
          onAddNew={() => setShowAddAddressModal(true)}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={handleSubscriptionSuccess}
          hiddenCount={hiddenCount}
        />
      )}

      {selectedSeller && (
        <SellerDetailsModal
          seller={selectedSeller}
          onClose={() => setSelectedSeller(null)}
          onOrder={handleOrder}
          onNavigate={handleNavigate}
          userLocation={userLocation}
          hasAccess={true}
          onAccessRequired={() => setShowSubscriptionModal(true)}
        />
      )}

      {showAddAddressModal && (
        <AddAddressModal
          onClose={() => setShowAddAddressModal(false)}
          onSuccess={handleAddressAdded}
        />
      )}
    </div>
  );
};

export default MapPage;