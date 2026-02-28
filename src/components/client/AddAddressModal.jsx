// ==========================================
// FICHIER: src/components/client/AddAddressModal.jsx
// Modal d'ajout d'adresse avec couleurs FasoGaz
// ==========================================
import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Loader2, CheckCircle, Home, Briefcase, MapPinned, Zap } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { api } from '../../api/apiSwitch';
import { getCurrentPosition } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';

const AddAddressModal = ({ onClose, onSuccess, editAddress = null }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [alert, setAlert] = useState(null);
  const [hasGPS, setHasGPS] = useState(false);

  const [formData, setFormData] = useState({
    label: editAddress?.label || '',
    city: editAddress?.city || user?.city || 'Ouagadougou',
    latitude: editAddress?.latitude || null,
    longitude: editAddress?.longitude || null,
    phoneNumber: editAddress?.phoneNumber || user?.phone || '',
    additionalInfo: editAddress?.additionalInfo || '',
    isDefault: editAddress?.isDefault || false
  });

  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      setHasGPS(true);
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    setAlert(null);
    try {
      const position = await getCurrentPosition();
      setFormData(prev => ({
        ...prev,
        latitude: position.latitude,
        longitude: position.longitude
      }));
      setHasGPS(true);
      setAlert({ type: 'success', message: 'Position GPS obtenue avec succès !' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Impossible d\'obtenir votre position GPS' });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.label) {
      setAlert({ type: 'error', message: 'Le nom de l\'adresse est obligatoire' });
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setAlert({ type: 'error', message: 'Vous devez obtenir votre position GPS' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const addressData = { ...formData, fullAddress: formData.city };
      if (editAddress) {
        await api.addresses.updateAddress(editAddress.id, addressData);
      } else {
        await api.addresses.createAddress(addressData);
      }
      onSuccess();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setLoading(false);
    }
  };

  const labelShortcuts = [
    { icon: Home,      label: 'Maison', color: 'primary'   },
    { icon: Briefcase, label: 'Bureau', color: 'secondary' },
    { icon: MapPinned, label: 'Autre',  color: 'accent'    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
       * Le conteneur est flex-col avec 3 zones distinctes :
       *   1. Header      — flex-shrink-0 (hauteur fixe)
       *   2. Body/form   — flex-1 + overflow-y-auto (scrollable)
       *   3. Footer      — flex-shrink-0 (hauteur fixe, JAMAIS écrasé)
       *
       * Grâce à flex-col + overflow-hidden sur ce div, le footer reste
       * toujours visible même quand le contenu est long.
       */}
      <form
        onSubmit={handleSubmit}
        className="
          bg-white w-full
          rounded-t-3xl sm:rounded-3xl
          flex flex-col
          max-h-[92dvh] sm:max-h-[90vh]
          sm:max-w-2xl
          shadow-2xl
          overflow-hidden
        "
      >
        {/* ── Header gradient ─────────────────────────────── */}
        <div className="relative gradient-gazbf p-5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <MapPin className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">
                {editAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
              </h2>
            </div>
            <p className="text-white/90 text-sm">
              Enregistrez votre position pour des livraisons précises
            </p>
          </div>
        </div>

        {/* ── Body scrollable ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          {alert && (
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          )}

          {/* GPS */}
          <div className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
            hasGPS
              ? 'border-accent-300 bg-gradient-to-br from-accent-50 to-accent-100'
              : 'border-secondary-300 bg-gradient-to-br from-secondary-50 to-secondary-100'
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${hasGPS ? 'bg-accent-500' : 'bg-secondary-500'}`}>
                  <Navigation className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-neutral-900">Position GPS</h3>
                  <p className="text-sm text-neutral-600">
                    {hasGPS ? 'Position enregistrée ✓' : 'Position requise'}
                  </p>
                </div>
                {hasGPS && (
                  <div className="p-2 bg-accent-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-accent-600" />
                  </div>
                )}
              </div>

              {hasGPS && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 mb-4 border border-accent-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-600">Latitude :</span>
                      <p className="font-mono font-bold text-neutral-900">
                        {parseFloat(formData.latitude).toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <span className="text-neutral-600">Longitude :</span>
                      <p className="font-mono font-bold text-neutral-900">
                        {parseFloat(formData.longitude).toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant={hasGPS ? 'outline' : 'primary'}
                fullWidth
                onClick={handleGetLocation}
                loading={gettingLocation}
                disabled={gettingLocation}
                className="h-13 text-base font-bold"
              >
                {gettingLocation ? (
                  'Localisation en cours...'
                ) : hasGPS ? (
                  <><Zap className="h-5 w-5 mr-2" />Mettre à jour ma position</>
                ) : (
                  <><Navigation className="h-5 w-5 mr-2" />Obtenir ma position GPS</>
                )}
              </Button>

              {!hasGPS && (
                <p className="text-xs text-center text-neutral-600 mt-3">
                  💡 Activez la géolocalisation dans votre navigateur
                </p>
              )}
            </div>
          </div>

          {/* Nom de l'adresse */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-neutral-900">
              Nom de l'adresse *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {labelShortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, label: shortcut.label }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                    formData.label === shortcut.label
                      ? `border-${shortcut.color}-500 bg-${shortcut.color}-50 text-${shortcut.color}-700`
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <shortcut.icon className="h-4 w-4" />
                  {shortcut.label}
                </button>
              ))}
            </div>
            <Input
              name="label"
              value={formData.label}
              onChange={handleChange}
              placeholder="Ou tapez un nom personnalisé..."
              required
            />
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-2">Ville *</label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
              required
            >
              <option value="Ouagadougou">Ouagadougou</option>
              <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
            </select>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-2">Numéro de téléphone</label>
            <Input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+226 XX XX XX XX"
            />
          </div>

          {/* Indications supplémentaires */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-2">
              Indications supplémentaires
            </label>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows={3}
              placeholder="Ex: Près de l'école, portail bleu, 2ème maison à gauche..."
              className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 resize-none transition-all"
            />
          </div>

          {/* Adresse par défaut */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl border-2 border-primary-200">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
              className="w-6 h-6 text-primary-600 border-neutral-300 rounded-lg focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="isDefault" className="flex-1 cursor-pointer">
              <span className="text-neutral-900 font-bold block mb-1">Adresse par défaut</span>
              <span className="text-sm text-neutral-600">
                Sera utilisée automatiquement pour vos commandes
              </span>
            </label>
            {formData.isDefault && (
              <div className="p-2 bg-primary-500 rounded-full">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer fixe — HORS du scroll ────────────────── */}
        {/*
         * flex-shrink-0 garantit que ce bloc ne sera jamais compressé
         * ni caché, quelle que soit la hauteur du contenu au-dessus.
         * pb-safe compense la barre de navigation iOS/Android.
         */}
        <div
          className="flex-shrink-0 flex gap-3 p-5 border-t-2 border-neutral-100 bg-white"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="gradient"
            loading={loading}
            disabled={!hasGPS || loading}
            className="flex-1 h-13 text-base font-bold"
          >
            {editAddress ? 'Mettre à jour' : 'Enregistrer l\'adresse'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddAddressModal;