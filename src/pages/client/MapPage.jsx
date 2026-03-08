// ==========================================
// FICHIER: src/pages/client/MapPage.jsx
// ==========================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Loader2, AlertCircle, Navigation, Plus, Clock, Lock,
  Radio, CreditCard, X, ChevronRight, Flame, Check, Star,
  ChevronDown, Settings2
} from 'lucide-react';
import SearchFilters from '../../components/client/SearchFilters';
import SellerCard from '../../components/client/SellerCard';
import SellerDetailsModal from '../../components/client/SellerDetailsModal';
import AddAddressModal from '../../components/client/AddAddressModal';
import TrackingNotification from '../../components/common/TrackingNotification';
import Alert from '../../components/common/Alert';
import { api } from '../../api/apiSwitch';
import useAuthStore from '../../store/authStore';
import { useGeolocationContext } from '../../contexts/GeolocationContext';
import { getCurrentPosition, openNavigationToLocation } from '../../utils/helpers';

// ─── Drawer de sélection rapide d'adresse ────────────────────────────────────
// Affiché quand l'utilisateur appuie sur la barre d'adresse active.
// Permet de changer l'adresse de référence sans quitter la page.
const AddressDrawer = ({ addresses, activeAddressId, onSelect, onClose, onAddNew }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => {};
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleSelect = (address) => {
    onSelect(address);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{
        background: `rgba(0,0,0,${visible ? .45 : 0})`,
        backdropFilter: `blur(${visible ? 4 : 0}px)`,
        transition: 'background .28s ease, backdrop-filter .28s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          maxHeight: '70vh',
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* titre */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">Changer d'adresse</h3>
          <button onClick={close} className="p-1.5 rounded-full bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* liste */}
        <div className="overflow-y-auto px-4 space-y-2" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {addresses.map((address) => {
            const isActive = address.id === activeAddressId;
            return (
              <button
                key={address.id}
                type="button"
                onClick={() => handleSelect(address)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[.98]
                  ${isActive
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
              >
                {/* icône */}
                <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <MapPin className={`h-4 w-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>

                {/* texte */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-orange-900' : 'text-gray-800'}`}>
                      {address.label}
                    </p>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-semibold flex-shrink-0">
                        <Star className="h-2.5 w-2.5 fill-orange-400" />
                        Défaut
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {address.additionalInfo || address.city}
                  </p>
                </div>

                {/* check actif */}
                {isActive && (
                  <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}

          {/* bouton ajouter */}
          <button
            type="button"
            onClick={() => { close(); setTimeout(onAddNew, 300); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all mt-1"
          >
            <Plus className="h-4 w-4" />
            Ajouter une adresse
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Barre d'adresse active ───────────────────────────────────────────────────
// Bande discrète sous le header qui indique quelle adresse est utilisée
// comme référence de distance. Appuyable pour changer rapidement.
const ActiveAddressBar = ({ address, trackingMode, onPress }) => {
  if (trackingMode) return null; // en mode tracking GPS, inutile d'afficher l'adresse fixe

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-left transition-colors hover:bg-gray-100 active:bg-gray-100"
    >
      {/* dot */}
      <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />

      {/* label */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
        <span className="text-xs text-gray-400 flex-shrink-0">Résultats pour</span>
        <span className="text-xs font-bold text-gray-700 truncate">{address?.label || '—'}</span>
        {address?.isDefault && (
          <span className="text-xs text-gray-400 flex-shrink-0">(par défaut)</span>
        )}
      </div>

      {/* action hint */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-orange-500 font-semibold">Changer</span>
        <ChevronDown className="h-3.5 w-3.5 text-orange-400" />
      </div>
    </button>
  );
};

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

  const [loading, setLoading] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [addresses, setAddresses] = useState([]);
  // ID de l'adresse utilisée comme référence de distance (peut différer de isDefault)
  const [activeAddressId, setActiveAddressId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false);
  const [lastSearchPosition, setLastSearchPosition] = useState(null);
  const [showAutoStopNotification, setShowAutoStopNotification] = useState(false);
  const [showGpsOnboarding, setShowGpsOnboarding] = useState(false);
  const GPS_ONBOARDING_KEY = 'fasogaz_gps_onboarding_seen';

  const trackingModeRef = useRef(false);
  useEffect(() => { trackingModeRef.current = trackingMode; }, [trackingMode]);

  const [accessStatus, setAccessStatus] = useState({
    hasAccess: false, accessType: 'none', expiresAt: null,
    remainingHours: 0, remainingMinutes: 0, price: null, duration: null
  });

  const [filters, setFilters] = useState({
    bottleType: '', brand: '', minPrice: '', maxPrice: '', radius: '10'
  });

  const MAX_DISTANCE_KM = 10;
  const MIN_MOVEMENT_FOR_REFRESH = 100;
  const isSearchingRef = useRef(false);

  // Adresse active dérivée
  const activeAddress = addresses.find(a => a.id === activeAddressId)
    || addresses.find(a => a.isDefault)
    || addresses[0]
    || null;

  useEffect(() => {
    setOnAutoStop(() => {
      setTrackingMode(false);
      trackingModeRef.current = false;
      setShowAutoStopNotification(true);
      if (addresses.length > 0) {
        const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
        if (defaultAddress.latitude && defaultAddress.longitude) {
          const location = {
            latitude: parseFloat(defaultAddress.latitude),
            longitude: parseFloat(defaultAddress.longitude)
          };
          setUserLocation(location);
          searchProducts({ ...filters, latitude: location.latitude, longitude: location.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
        }
      }
    });
  }, [setOnAutoStop, addresses, filters, user?.city]);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  const filterSellersByDistance = (sellersArray) =>
    sellersArray.filter(s => s.distance !== null && s.distance !== undefined && s.distance <= MAX_DISTANCE_KM);

  const checkAccessStatus = useCallback(async () => {
    try {
      const response = await api.access.checkStatus();
      if (response?.success) {
        const s = response.data;
        setAccessStatus({ hasAccess: s.hasAccess, accessType: s.accessType, expiresAt: s.expiresAt, remainingHours: s.remainingHours || 0, remainingMinutes: s.remainingMinutes || 0, price: s.price, duration: s.duration });
      }
    } catch {
      setAccessStatus({ hasAccess: false, accessType: 'error', expiresAt: null, remainingHours: 0, remainingMinutes: 0 });
    } finally {
      setLoadingAccess(false);
    }
  }, []);

  const searchProducts = useCallback(async (searchFilters, forceRefresh = false) => {
    if (isSearchingRef.current && !forceRefresh) return;
    try {
      isSearchingRef.current = true;
      const params = {};
      if (user?.id) params.userId = user.id;
      if (searchFilters.city) params.city = searchFilters.city;
      else if (user?.city) params.city = user.city;
      else { setAlert({ type: 'error', message: 'Impossible de déterminer votre ville.' }); return; }
      if (searchFilters.bottleType) params.bottleType = searchFilters.bottleType;
      if (searchFilters.brand) params.brand = searchFilters.brand;
      if (searchFilters.minPrice) params.minPrice = searchFilters.minPrice;
      if (searchFilters.maxPrice) params.maxPrice = searchFilters.maxPrice;
      if (searchFilters.latitude) params.latitude = searchFilters.latitude;
      if (searchFilters.longitude) params.longitude = searchFilters.longitude;
      params.radius = Math.min(parseFloat(searchFilters.radius) || 10, MAX_DISTANCE_KM);
      const response = await api.products.searchProducts(params);
      if (response.success) {
        const sellersData = response.data.sellers || [];
        const accessInfo = response.data.accessInfo || {};
        setAccessStatus(prev => ({ ...prev, hasAccess: accessInfo.hasAccess || false }));
        let finalSellers = sellersData;
        if (accessInfo.hasAccess && searchFilters.latitude && searchFilters.longitude) {
          finalSellers = filterSellersByDistance(sellersData);
        }
        setSellers(finalSellers);
        setFilteredSellers(finalSellers);
        if (!accessInfo.hasAccess && accessInfo.isSystemActive) {
          setAlert({ type: 'info', message: '💡 Achetez un accès 24h pour voir les coordonnées et obtenir les itinéraires' });
        }
      }
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors de la recherche des revendeurs' });
    } finally {
      isSearchingRef.current = false;
    }
  }, [user?.city, user?.id]);

  const loadAddresses = useCallback(async () => {
    try {
      const response = await api.addresses.getMyAddresses();
      if (response?.success) {
        const addressList = response.data || [];
        setAddresses(addressList);
        if (addressList.length > 0 && !trackingModeRef.current) {
          const defaultAddress = addressList.find(a => a.isDefault) || addressList[0];
          setActiveAddressId(defaultAddress.id);
          if (defaultAddress.latitude && defaultAddress.longitude) {
            setUserLocation({ latitude: parseFloat(defaultAddress.latitude), longitude: parseFloat(defaultAddress.longitude) });
          }
        }
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  const loadProducts = useCallback(async (location) => {
    setLoading(true);
    try {
      if (location?.latitude && location?.longitude) {
        await searchProducts({ ...filters, latitude: location.latitude, longitude: location.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM });
        setLastSearchPosition(location);
      } else {
        try {
          const position = await getCurrentPosition();
          setUserLocation(position);
          await searchProducts({ ...filters, latitude: position.latitude, longitude: position.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM });
          setLastSearchPosition(position);
        } catch {
          await searchProducts({ ...filters, city: user?.city || '', radius: MAX_DISTANCE_KM });
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, searchProducts, user?.city]);

  // ── Sélection rapide d'une adresse depuis le drawer ──────────────────────────
  const handleSelectAddress = useCallback((address) => {
    if (!address.latitude || !address.longitude) {
      setAlert({ type: 'error', message: `"${address.label}" n'a pas de coordonnées GPS.` });
      return;
    }
    const location = { latitude: parseFloat(address.latitude), longitude: parseFloat(address.longitude) };
    setActiveAddressId(address.id);
    setUserLocation(location);
    searchProducts({ ...filters, latitude: location.latitude, longitude: location.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
    setAlert({ type: 'success', message: `📍 Résultats mis à jour pour « ${address.label} »` });
  }, [filters, searchProducts, user?.city]);

  const handleToggleTracking = useCallback(async () => {
    if (trackingMode) {
      disableTracking();
      setTrackingMode(false);
      trackingModeRef.current = false;
      if (addresses.length > 0) {
        const ref = addresses.find(a => a.id === activeAddressId) || addresses.find(a => a.isDefault) || addresses[0];
        if (ref?.latitude && ref?.longitude) {
          const location = { latitude: parseFloat(ref.latitude), longitude: parseFloat(ref.longitude) };
          setUserLocation(location);
          searchProducts({ ...filters, latitude: location.latitude, longitude: location.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
        }
      }
      setAlert({ type: 'info', message: '📍 Mode position fixe activé' });
    } else {
      try {
        setAlert({ type: 'info', message: '📡 Obtention de votre position GPS...' });
        const currentPos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
            (e) => reject(e),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });
        setUserLocation(currentPos);
        setLastSearchPosition(currentPos);
        await searchProducts({ ...filters, latitude: currentPos.latitude, longitude: currentPos.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
        enableTracking((newPosition) => {
          if (lastSearchPosition) {
            const distance = calculateDistance(lastSearchPosition.latitude, lastSearchPosition.longitude, newPosition.latitude, newPosition.longitude);
            if (distance < MIN_MOVEMENT_FOR_REFRESH) return;
          }
          setLastSearchPosition(newPosition);
          setUserLocation(newPosition);
          searchProducts({ ...filters, latitude: newPosition.latitude, longitude: newPosition.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
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
        const msg = gpsError.code === 1 ? '❌ Permission GPS refusée' : gpsError.code === 2 ? '❌ Position GPS non disponible' : gpsError.code === 3 ? '❌ Délai GPS dépassé' : '❌ Impossible d\'obtenir votre position GPS';
        setAlert({ type: 'error', message: msg });
      }
    }
  }, [trackingMode, enableTracking, disableTracking, filters, user?.city, lastSearchPosition, calculateDistance, searchProducts, addresses, activeAddressId]);

  const handleReactivateTracking = useCallback(async () => {
    setShowAutoStopNotification(false);
    await handleToggleTracking();
  }, [handleToggleTracking]);

  const handleApplyFilters = (newFilters) => {
    const limitedFilters = { ...newFilters, radius: Math.min(parseFloat(newFilters.radius) || 10, MAX_DISTANCE_KM).toString() };
    setFilters(limitedFilters);
    if (userLocation) searchProducts({ ...limitedFilters, latitude: userLocation.latitude, longitude: userLocation.longitude, city: user?.city || '' }, true);
    else searchProducts({ ...limitedFilters, city: user?.city || '' }, true);
  };

  const handleCall     = (phone)  => { if (!accessStatus.hasAccess) { setShowAccessModal(true); return; } window.location.href = `tel:${phone}`; };
  const handleNavigate = (seller) => {
    if (!accessStatus.hasAccess) { setShowAccessModal(true); return; }
    if (seller.latitude && seller.longitude) openNavigationToLocation(seller.latitude, seller.longitude, seller.businessName || `Dépôt ${seller.quarter || seller.city}`, userLocation);
    else setAlert({ type: 'error', message: 'Coordonnées GPS du revendeur non disponibles' });
  };
  const handleOrder = (seller, products) => {
    if (!accessStatus.hasAccess) { setShowAccessModal(true); return; }
    navigate('/client/order/new', { state: { seller, products } });
  };

  const handleAddressAdded = async () => {
    setShowAddAddressModal(false);
    setLoadingAddresses(true);
    await loadAddresses();
    const response = await api.addresses.getMyAddresses();
    if (response?.success && response.data?.length > 0) {
      const newAddress = response.data.find(a => a.isDefault) || response.data[0];
      if (newAddress.latitude && newAddress.longitude) {
        const location = { latitude: parseFloat(newAddress.latitude), longitude: parseFloat(newAddress.longitude) };
        setActiveAddressId(newAddress.id);
        setUserLocation(location);
        await loadProducts(location);
      }
    }
    setAlert({ type: 'success', message: '✅ Adresse ajoutée avec succès !' });
  };

  const handleAccessRequired = async () => {
    await checkAccessStatus();
    setAlert({ type: 'success', message: '🎉 Accès activé !' });
    if (userLocation) loadProducts(userLocation);
  };

  const handleBuyAccess = () => { setShowAccessModal(false); navigate('/client/access/purchase'); };
  const formatRemainingTime = () => accessStatus.hasAccess ? `${accessStatus.remainingHours}h ${accessStatus.remainingMinutes}min` : null;

  useEffect(() => {
    if (!trackingMode || !livePosition) return;
    setUserLocation(livePosition);
    searchProducts({ ...filters, latitude: livePosition.latitude, longitude: livePosition.longitude, city: user?.city || '', radius: MAX_DISTANCE_KM }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingMode, livePosition]);

  useEffect(() => { checkAccessStatus(); }, [checkAccessStatus]);
  useEffect(() => { if (!loadingAccess) loadAddresses(); }, [loadingAccess, loadAddresses]);
  useEffect(() => {
    if (!loadingAccess && !loadingAddresses) {
      if (addresses.length > 0) loadProducts(userLocation);
      else setLoading(false);
    }
  }, [loadingAccess, loadingAddresses, addresses.length]);

  // ─── LOADING SCREEN ──────────────────────────────────────────────────────────
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
        <p className="text-gray-500 text-sm mt-1">Vérification de votre accès...</p>
      </div>
    );
  }

  // ─── NO ADDRESS SCREEN ───────────────────────────────────────────────────────
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
          <p className="text-gray-500 text-center text-base leading-relaxed mb-2">Pour trouver du gaz près de chez vous, ajoutez votre adresse avec position GPS.</p>
          <p className="text-gray-400 text-center text-sm mb-8">Cela permet de calculer les distances avec les revendeurs.</p>
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-snug">Activez la géolocalisation sur votre téléphone pour une meilleure précision.</p>
          </div>
          <button onClick={() => setShowAddAddressModal(true)} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-200">
            <Plus className="h-5 w-5" />
            Ajouter mon adresse
          </button>
        </div>
        {showAddAddressModal && <AddAddressModal onClose={() => setShowAddAddressModal(false)} onSuccess={handleAddressAdded} />}
      </div>
    );
  }

  // ─── LOADING SELLERS ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-600 font-medium">Recherche des revendeurs...</p>
        <p className="text-gray-400 text-sm mt-1">Dans un rayon de {MAX_DISTANCE_KM} km</p>
      </div>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        {/* Title row */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Trouver du gaz</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredSellers.length} revendeur{filteredSellers.length !== 1 ? 's' : ''} trouvé{filteredSellers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* GPS tracking pill */}
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

        {/* ── BARRE D'ADRESSE ACTIVE ──────────────────────────────────────────── */}
        {/* Quand le tracking GPS est actif, on affiche la position live à la place */}
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

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="px-4 py-3 space-y-3 pb-24">

        {showAutoStopNotification && autoStopReason && (
          <TrackingNotification reason={autoStopReason} onClose={() => setShowAutoStopNotification(false)} onReactivate={handleReactivateTracking} />
        )}

        {showGpsOnboarding && (
          <div className="bg-green-600 text-white rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <div className="text-2xl flex-shrink-0">📍</div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">L'app vous suit maintenant !</p>
              <p className="text-xs text-green-100 leading-relaxed">
                Les revendeurs affichés sont ceux autour de <strong>votre position actuelle</strong>, pas votre adresse enregistrée. Appuyez à nouveau sur le bouton pour revenir à votre adresse.
              </p>
            </div>
            <button onClick={() => setShowGpsOnboarding(false)} className="flex-shrink-0 p-1 hover:bg-green-500 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {alert && <Alert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}

        {/* Access status cards */}
        {accessStatus.accessType === 'free' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Accès gratuit activé</p>
              <p className="text-xs text-emerald-600">Tarification non activée sur cette zone</p>
            </div>
          </div>
        )}

        {accessStatus.hasAccess && accessStatus.accessType === 'active' && accessStatus.expiresAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-800">Accès actif</p>
                  <p className="text-xs text-blue-600">{formatRemainingTime()} restant</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-400">Expire</p>
                <p className="text-xs font-semibold text-blue-700">
                  {new Date(accessStatus.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {!accessStatus.hasAccess && accessStatus.accessType !== 'free' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 mb-0.5">Aucun accès actif</p>
                <p className="text-xs text-amber-600 mb-2">Achetez un accès pour voir les coordonnées</p>
                {accessStatus.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-800">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(accessStatus.price)}
                    </span>
                    <span className="text-xs text-amber-600">/ {accessStatus.duration}h</span>
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/client/access/purchase')} className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-xl active:scale-95 transition-transform">
                Acheter
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <SearchFilters onApplyFilters={handleApplyFilters} initialFilters={filters} maxRadius={MAX_DISTANCE_KM} accessType={accessStatus.accessType} hasAccess={accessStatus.hasAccess} />

        {/* Sellers list */}
        {filteredSellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-1">Aucun revendeur trouvé</h3>
            <p className="text-sm text-gray-400 text-center leading-relaxed">Aucun revendeur dans votre zone.<br />Modifiez vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSellers.map((seller) => (
              <SellerCard
                key={seller.id}
                seller={seller}
                distance={seller.distance}
                onViewDetails={(s) => setSelectedSeller(s)}
                onCall={handleCall}
                onNavigate={handleNavigate}
                hasAccess={accessStatus.hasAccess}
                onAccessRequired={handleAccessRequired}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS & DRAWERS ── */}

      {/* Drawer sélection rapide d'adresse */}
      {showAddressDrawer && (
        <AddressDrawer
          addresses={addresses}
          activeAddressId={activeAddressId || activeAddress?.id}
          onSelect={handleSelectAddress}
          onClose={() => setShowAddressDrawer(false)}
          onAddNew={() => setShowAddAddressModal(true)}
        />
      )}

      {/* Access purchase modal */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAccessModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <button onClick={() => setShowAccessModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
            <div className="px-6 pb-8 pt-4">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Lock className="h-8 w-8 text-amber-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-1">Accès requis</h3>
              <p className="text-sm text-gray-500 text-center mb-5">Pour appeler, naviguer ou commander, activez l'accès 24h.</p>
              {accessStatus.price && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-5 text-center">
                  <p className="text-xs text-amber-600 mb-1 font-medium uppercase tracking-wide">Accès complet</p>
                  <p className="text-3xl font-extrabold text-amber-900 mb-0.5">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(accessStatus.price)}
                  </p>
                  <p className="text-xs text-amber-600">valable {accessStatus.duration}h</p>
                </div>
              )}
              <div className="space-y-2 mb-5">
                {['Numéros de téléphone visibles', 'Itinéraires GPS', 'Commandes en ligne'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleBuyAccess} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200 mb-3">
                <CreditCard className="h-5 w-5" />
                Acheter l'accès maintenant
              </button>
              <button onClick={() => setShowAccessModal(false)} className="w-full text-gray-400 text-sm py-2 active:text-gray-600 transition-colors">
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller details */}
      {selectedSeller && (
        <SellerDetailsModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} onOrder={handleOrder} onNavigate={handleNavigate} hasAccess={accessStatus.hasAccess} onAccessRequired={handleAccessRequired} />
      )}

      {/* Add address */}
      {showAddAddressModal && (
        <AddAddressModal onClose={() => setShowAddAddressModal(false)} onSuccess={handleAddressAdded} />
      )}
    </div>
  );
};

export default MapPage;