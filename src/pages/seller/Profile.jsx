// ==========================================
// FICHIER: src/pages/seller/Profile.jsx
// ✅ MODIFIÉ: champ quartier éditable dans la section GPS
// ==========================================
import React, { useState, useEffect } from 'react';
import {
  Building2, Clock, Edit2, Save, X, Truck, AlertCircle,
  Navigation, Loader2, CheckCircle, XCircle, Settings, MapPin,
  Phone, Pencil
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import OpeningHoursEditor from '../../components/seller/OpeningHoursEditor';
import { api } from '../../api/apiSwitch';
import { getCurrentPosition } from '../../utils/helpers';

const SellerProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [editMode, setEditMode]               = useState(false);
  const [editDeliveryMode, setEditDeliveryMode] = useState(false);
  const [editHoursMode, setEditHoursMode]     = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [alert, setAlert]                     = useState(null);
  const [showGPSConfirm, setShowGPSConfirm]   = useState(false);
  const [quarterEditable, setQuarterEditable] = useState(false); // ✅ NOUVEAU

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', businessName: '',
    latitude: null, longitude: null, quarter: '', city: ''
  });

  const [deliveryData, setDeliveryData] = useState({
    deliveryAvailable: false, deliveryFee: 0
  });

  const [hoursData, setHoursData] = useState({
    isOpen24_7: false, isClosed: false,
    schedule: {
      monday:    { enabled: true,  open: '08:00', close: '20:00' },
      tuesday:   { enabled: true,  open: '08:00', close: '20:00' },
      wednesday: { enabled: true,  open: '08:00', close: '20:00' },
      thursday:  { enabled: true,  open: '08:00', close: '20:00' },
      friday:    { enabled: true,  open: '08:00', close: '20:00' },
      saturday:  { enabled: true,  open: '08:00', close: '18:00' },
      sunday:    { enabled: false, open: '09:00', close: '13:00' }
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName:    user.firstName    || '',
        lastName:     user.lastName     || '',
        email:        user.email        || '',
        businessName: user.businessName || '',
        latitude:     user.latitude     || null,
        longitude:    user.longitude    || null,
        quarter:      user.quarter      || '',
        city:         user.city         || ''
      });
      setDeliveryData({
        deliveryAvailable: user.deliveryAvailable || false,
        deliveryFee:       user.deliveryFee        || 0
      });
      if (user.openingHours) setHoursData(user.openingHours);
    }
  }, [user]);

  const fmt = (value, dec = 6) => {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(n) ? null : n.toFixed(dec);
  };

  const normalizeName = (v) =>
    v.trimStart().replace(/[^a-zA-ZÀ-ÿ\s'\-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 25);
  const normalizeBusinessName = (v) =>
    v.trimStart().replace(/\s{2,}/g, ' ').slice(0, 25);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'firstName' || name === 'lastName'
        ? normalizeName(value)
        : name === 'businessName'
          ? normalizeBusinessName(value)
          : value
    }));
  };

  const handleDeliveryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeliveryData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRequestLocation = () => {
    if (user?.latitude && user?.longitude) setShowGPSConfirm(true);
    else handleGetCurrentLocation();
  };

  const handleGetCurrentLocation = async () => {
    setShowGPSConfirm(false);
    setGettingLocation(true);
    setAlert(null);
    try {
      const position = await getCurrentPosition();
      setFormData(prev => ({
        ...prev,
        latitude:  position.latitude,
        longitude: position.longitude,
        ...(position.quarter && { quarter: position.quarter }),
        ...(position.city    && { city:    position.city    })
      }));
      // Si le quartier n'a pas été détecté → ouvrir le champ d'édition
      if (!position.quarter) setQuarterEditable(true);
      else setQuarterEditable(false);

      const locationInfo = position.quarter
        ? `${position.quarter}, ${position.city || 'Ouagadougou'}`
        : `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
      setAlert({
        type: 'success',
        message: `✓ Position GPS obtenue${position.quarter ? ` · ${locationInfo}` : ' — saisissez votre quartier'}`
      });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || "Impossible d'obtenir votre position GPS" });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.businessName) {
      setAlert({ type: 'error', message: 'Le nom du dépôt est obligatoire' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const response = await api.auth.updateProfile({
        ...formData,
        firstName:    formData.firstName.trim(),
        lastName:     formData.lastName.trim(),
        businessName: formData.businessName.trim(),
      });
      if (response.success) {
        updateUser(response.data.user);
        setAlert({ type: 'success', message: 'Profil mis à jour avec succès' });
        setEditMode(false);
        setQuarterEditable(false);
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Erreur lors de la mise à jour' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDelivery = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const response = await api.auth.updateProfile(deliveryData);
      if (response.success) {
        updateUser(response.data.user);
        setAlert({ type: 'success', message: 'Options de livraison mises à jour' });
        setEditDeliveryMode(false);
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Erreur' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHours = async (newHours) => {
    setLoading(true);
    setAlert(null);
    try {
      const response = await api.auth.updateProfile({ openingHours: newHours });
      if (response.success) {
        updateUser(response.data.user);
        setHoursData(newHours);
        setAlert({ type: 'success', message: "Heures d'ouverture mises à jour" });
        setEditHoursMode(false);
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Erreur' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProfile = () => {
    setFormData({
      firstName:    user?.firstName    || '',
      lastName:     user?.lastName     || '',
      email:        user?.email        || '',
      businessName: user?.businessName || '',
      latitude:     user?.latitude     || null,
      longitude:    user?.longitude    || null,
      quarter:      user?.quarter      || '',
      city:         user?.city         || ''
    });
    setEditMode(false);
    setQuarterEditable(false);
    setAlert(null);
  };

  const handleCancelDelivery = () => {
    setDeliveryData({ deliveryAvailable: user?.deliveryAvailable || false, deliveryFee: user?.deliveryFee || 0 });
    setEditDeliveryMode(false);
    setAlert(null);
  };

  const handleCancelHours = () => {
    setHoursData(user?.openingHours || hoursData);
    setEditHoursMode(false);
    setAlert(null);
  };

  const hasGPS = formData.latitude && formData.longitude;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

      {/* ── Modale confirmation GPS ── */}
      {showGPSConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Modifier la position GPS ?</h3>
                <p className="text-sm text-gray-500">Cette action mettra à jour votre localisation</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ Vous allez <strong>remplacer les coordonnées GPS</strong> de votre dépôt.
                Assurez-vous d'être <strong>physiquement présent à votre point de vente</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" fullWidth onClick={() => setShowGPSConfirm(false)}>
                <X className="h-4 w-4 mr-2" />Annuler
              </Button>
              <Button variant="primary" fullWidth onClick={handleGetCurrentLocation}>
                <Navigation className="h-4 w-4 mr-2" />Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Mon Profil</h1>
          <p className="text-sm text-gray-500">Gérez les informations de votre dépôt</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/seller/settings')} className="w-full sm:w-auto">
          <Settings className="h-4 w-4 mr-2" />Paramètres
        </Button>
      </div>

      {/* ── Informations du dépôt ── */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Informations du dépôt</h2>
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="w-full sm:w-auto">
              <Edit2 className="h-4 w-4 mr-2" />Modifier
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={handleCancelProfile} disabled={loading} className="flex-1 sm:flex-none">
                <X className="h-4 w-4" />
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProfile} loading={loading} className="flex-1 sm:flex-none">
                <Save className="h-4 w-4 mr-2" />Enregistrer
              </Button>
            </div>
          )}
        </div>

        {/* Avatar + nom */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-secondary-600" />
          </div>
          <div className="flex-1 w-full min-w-0">
            {!editMode ? (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                  {user?.businessName || 'Nom du dépôt non défini'}
                </h3>
                <p className="text-sm text-gray-600 break-all">{user?.phone}</p>
                {user?.email && <p className="text-xs text-gray-500 break-all">{user.email}</p>}
              </>
            ) : (
              <div className="space-y-3 w-full">
                <Input name="businessName" value={formData.businessName} onChange={handleChange}
                  placeholder="Nom du dépôt *" maxLength={25} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Prénom" maxLength={25} />
                  <Input name="lastName"  value={formData.lastName}  onChange={handleChange} placeholder="Nom"    maxLength={25} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {[
            { icon: Phone,     label: 'Téléphone',    value: user?.phone },
            { icon: MapPin,    label: 'Localisation',  value: user?.quarter ? `${user.quarter}, ${user.city || 'Ouagadougou'}` : (user?.city || 'Ouagadougou') },
            { icon: Building2, label: 'Type de compte', value: user?.role },
            { icon: Clock,     label: 'Membre depuis', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-' }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-2 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-600 mb-1">
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <p className="text-xs sm:text-sm">{label}</p>
              </div>
              <p className="font-medium text-xs sm:text-base capitalize break-all">{value}</p>
            </div>
          ))}
        </div>

        {/* ══ Section GPS — mode édition ══ */}
        {editMode && (
          <div className="mt-4 sm:mt-6 rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden">

            {/* Header GPS */}
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-100 border-b border-blue-200">
              <Navigation className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-semibold text-blue-900 text-sm">Coordonnées GPS du dépôt</h3>
            </div>

            <div className="p-4 space-y-4">

              {/* État actuel des coords */}
              {hasGPS ? (
                <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-3">

                  {/* Coords lat/lon */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />Définie
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block">Latitude</span>
                      <span className="font-mono font-semibold text-gray-800">{fmt(formData.latitude)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Longitude</span>
                      <span className="font-mono font-semibold text-gray-800">{fmt(formData.longitude)}</span>
                    </div>
                  </div>

                  {/* ── Quartier ── */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quartier</span>
                      {!quarterEditable && (
                        <button
                          type="button"
                          onClick={() => setQuarterEditable(true)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          {formData.quarter ? 'Corriger' : 'Ajouter'}
                        </button>
                      )}
                    </div>

                    {quarterEditable ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="quarter"
                          value={formData.quarter}
                          onChange={handleChange}
                          placeholder="Ex : Gounghin, Pissy, Zogona…"
                          className="flex-1 px-3 py-2 text-sm border-2 border-blue-300 rounded-xl bg-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-400"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setQuarterEditable(false)}
                          className="flex-shrink-0 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <p className={`text-sm font-medium ${formData.quarter ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {formData.quarter || 'Non renseigné'}
                      </p>
                    )}
                    {quarterEditable && (
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        {formData.quarter ? 'Corrigez si le quartier détecté est inexact' : 'Quartier non détecté — saisissez-le manuellement'}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Aucune coordonnée GPS enregistrée. Cliquez sur le bouton ci-dessous.
                  </p>
                </div>
              )}

              {/* Bouton GPS */}
              <Button
                variant="primary"
                fullWidth
                onClick={handleRequestLocation}
                loading={gettingLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Détection en cours…</>
                ) : (
                  <><Navigation className="h-4 w-4 mr-2" />
                    {hasGPS ? 'Mettre à jour ma position GPS' : 'Obtenir ma position GPS'}</>
                )}
              </Button>
              <p className="text-xs text-center text-gray-400">
                💡 Activez la géolocalisation dans votre navigateur
              </p>
            </div>
          </div>
        )}

        {/* ══ Section GPS — mode lecture ══ */}
        {!editMode && user?.latitude && user?.longitude && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-green-600 flex-shrink-0" />
              <h4 className="font-semibold text-green-900 text-sm">Position GPS enregistrée</h4>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700">
              {user.quarter && (
                <p><span className="text-gray-500">Quartier :</span> <span className="font-medium">{user.quarter}</span></p>
              )}
              {user.city && (
                <p><span className="text-gray-500">Ville :</span> <span className="font-medium">{user.city}</span></p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <p className="text-xs font-mono text-gray-600">Lat: {fmt(user.latitude, 5)}</p>
                <p className="text-xs font-mono text-gray-600">Lng: {fmt(user.longitude, 5)}</p>
              </div>
            </div>
          </div>
        )}

        {!editMode && (!user?.latitude || !user?.longitude) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-1 text-sm">Coordonnées GPS manquantes</h4>
                <p className="text-xs text-yellow-800 mb-3">
                  Ajoutez vos coordonnées GPS pour que les clients puissent vous localiser.
                </p>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="w-full sm:w-auto">
                  Ajouter mes coordonnées
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Livraison ── */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-600 flex-shrink-0" />
            <h3 className="font-semibold text-base sm:text-lg text-gray-900">Options de livraison</h3>
          </div>
          {!editDeliveryMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditDeliveryMode(true)} className="w-full sm:w-auto">
              <Edit2 className="h-4 w-4 mr-2" />Modifier
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={handleCancelDelivery} disabled={loading} className="flex-1 sm:flex-none"><X className="h-4 w-4" /></Button>
              <Button variant="primary" size="sm" onClick={handleSaveDelivery} loading={loading} className="flex-1 sm:flex-none">
                <Save className="h-4 w-4 mr-2" />Enregistrer
              </Button>
            </div>
          )}
        </div>

        {!editDeliveryMode ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user?.deliveryAvailable ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Truck className={`w-4 h-4 sm:w-5 sm:h-5 ${user?.deliveryAvailable ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <span className="text-sm text-gray-700 font-medium">Livraison à domicile</span>
              </div>
              <span className={`font-semibold text-sm ${user?.deliveryAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                {user?.deliveryAvailable ? 'Activée' : 'Désactivée'}
              </span>
            </div>
            {user?.deliveryAvailable && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-secondary-50 rounded-lg border border-secondary-200 gap-2">
                <span className="text-sm text-gray-700 font-medium">Frais de livraison</span>
                <span className="font-bold text-secondary-600 text-base sm:text-lg">
                  {user?.deliveryFee > 0 ? `${user.deliveryFee} FCFA` : 'Gratuit'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <input type="checkbox" id="deliveryAvailable" name="deliveryAvailable"
                checked={deliveryData.deliveryAvailable} onChange={handleDeliveryChange}
                className="w-5 h-5 text-secondary-600 border-gray-300 rounded mt-0.5 flex-shrink-0" />
              <label htmlFor="deliveryAvailable" className="flex-1 cursor-pointer">
                <span className="text-gray-900 font-medium block text-sm">Activer la livraison à domicile</span>
                <span className="text-xs text-gray-600">Vos clients pourront demander la livraison</span>
              </label>
            </div>
            {deliveryData.deliveryAvailable && (
              <div className="p-3 sm:p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                <Input label="Frais de livraison (FCFA)" name="deliveryFee" type="number"
                  value={deliveryData.deliveryFee} onChange={handleDeliveryChange}
                  min="0" step="1" placeholder="0" helpText="Laisser à 0 pour livraison gratuite" />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Heures d'ouverture ── */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-600 flex-shrink-0" />
            <h3 className="font-semibold text-base sm:text-lg text-gray-900">Heures d'ouverture</h3>
          </div>
          {!editHoursMode && (
            <Button variant="outline" size="sm" onClick={() => setEditHoursMode(true)} className="w-full sm:w-auto">
              <Edit2 className="h-4 w-4 mr-2" />Modifier
            </Button>
          )}
        </div>
        {editHoursMode ? (
          <OpeningHoursEditor initialHours={hoursData} onSave={handleSaveHours} onCancel={handleCancelHours} loading={loading} />
        ) : (
          <OpeningHoursReadOnly openingHours={user?.openingHours} />
        )}
      </Card>
    </div>
  );
};

/* ── Lecture seule heures ── */
const OpeningHoursReadOnly = ({ openingHours }) => {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const fr   = { monday:'Lundi', tuesday:'Mardi', wednesday:'Mercredi', thursday:'Jeudi', friday:'Vendredi', saturday:'Samedi', sunday:'Dimanche' };

  if (!openingHours) return (
    <div className="bg-gray-50 rounded-lg p-6 text-center">
      <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-1">Aucun horaire défini</p>
      <p className="text-xs text-gray-500">Cliquez sur "Modifier" pour configurer vos heures</p>
    </div>
  );

  if (openingHours.isOpen24_7) return (
    <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-green-900 font-semibold">Ouvert 24h/24 7j/7</p>
        <p className="text-green-700 text-sm mt-0.5">Votre dépôt est toujours ouvert</p>
      </div>
    </div>
  );

  if (openingHours.isClosed) return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-900 font-semibold">Fermé temporairement</p>
        <p className="text-red-700 text-sm mt-0.5">Votre dépôt est hors service</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {days.map(day => {
        const s = openingHours.schedule?.[day];
        if (!s) return null;
        return (
          <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900 text-sm w-28">{fr[day]}</span>
            {s.enabled
              ? <span className="text-gray-700 text-sm">{s.open} - {s.close}</span>
              : <span className="text-gray-400 italic text-sm">Fermé</span>}
          </div>
        );
      })}
    </div>
  );
};

export default SellerProfile;