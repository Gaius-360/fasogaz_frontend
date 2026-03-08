// ==========================================
// FICHIER: src/components/addresses/AddressForm.jsx
// ==========================================
import React, { useState } from 'react';
import { MapPin, Navigation, Save, X, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { getCurrentPosition } from '../../utils/helpers';

/**
 * @param {object}  initialData           — données existantes (édition) ou null (création)
 * @param {object}  currentDefaultAddress — adresse actuellement par défaut (null si aucune)
 *                  Permet d'afficher un avertissement de remplacement avant soumission.
 * @param {function} onSubmit
 * @param {function} onCancel
 * @param {boolean}  loading
 */
const AddressForm = ({
  initialData = null,
  currentDefaultAddress = null,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    label:          initialData?.label          || '',
    city:           initialData?.city           || 'Ouagadougou',
    latitude:       initialData?.latitude       || null,
    longitude:      initialData?.longitude      || null,
    phoneNumber:    initialData?.phoneNumber    || '',
    additionalInfo: initialData?.additionalInfo || '',
    isDefault:      initialData?.isDefault      || false,
  });

  const [gettingLocation, setGettingLocation] = useState(false);
  const [alert, setAlert] = useState(null);

  const hasGPS = !!(formData.latitude && formData.longitude);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    setAlert(null);
    try {
      const position = await getCurrentPosition();
      setFormData(prev => ({
        ...prev,
        latitude:  position.latitude,
        longitude: position.longitude,
        city:      position.city || prev.city,
      }));
      setAlert({ type: 'success', message: '📍 Position GPS obtenue !' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: error.message });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.label) {
      setAlert({ type: 'error', message: 'Le nom de l\'adresse est obligatoire' });
      return;
    }
    onSubmit(formData);
  };

  /**
   * Avertissement de remplacement :
   * visible si on coche "par défaut" ET qu'une autre adresse l'est déjà
   */
  const showReplaceWarning =
    formData.isDefault &&
    currentDefaultAddress !== null &&
    currentDefaultAddress.id !== initialData?.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {alert && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium border
            ${alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}
        >
          <span className="flex-1">{alert.message}</span>
          <button type="button" onClick={() => setAlert(null)} className="opacity-50 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Nom */}
      <Input
        label="Nom de l'adresse *"
        name="label"
        value={formData.label}
        onChange={handleChange}
        placeholder="Ex : Maison, Bureau…"
        required
      />

      {/* GPS */}
      <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
        hasGPS ? 'border-emerald-300 bg-emerald-50' : 'border-orange-200 bg-orange-50'
      }`}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className={`p-2.5 rounded-xl ${hasGPS ? 'bg-emerald-500' : 'bg-orange-400'}`}>
            <Navigation className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-neutral-900 text-sm">Position GPS</p>
            <p className={`text-xs mt-0.5 ${hasGPS ? 'text-emerald-600' : 'text-orange-600'}`}>
              {hasGPS ? '✓ Coordonnées enregistrées' : 'Recommandée pour la livraison'}
            </p>
          </div>
          {hasGPS && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
        </div>

        {hasGPS && (
          <div className="mx-4 mb-3 bg-white/70 rounded-xl px-3 py-2 border border-emerald-200">
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Lat</span>
                <span className="font-mono font-bold text-neutral-800">
                  {parseFloat(formData.latitude).toFixed(5)}
                </span>
              </div>
              <div className="w-px bg-emerald-200" />
              <div>
                <span className="text-neutral-400 block mb-0.5">Lng</span>
                <span className="font-mono font-bold text-neutral-800">
                  {parseFloat(formData.longitude).toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[.98]
              ${hasGPS
                ? 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                : 'bg-orange-500 text-white hover:bg-orange-600'
              }
              ${gettingLocation ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {gettingLocation ? (
              <><span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Localisation…</>
            ) : hasGPS ? (
              <><Zap className="h-3.5 w-3.5" />Mettre à jour ma position</>
            ) : (
              <><Navigation className="h-3.5 w-3.5" />Obtenir ma position GPS</>
            )}
          </button>
          {!hasGPS && (
            <p className="text-center text-xs text-neutral-500 mt-2">
              💡 Activez la géolocalisation dans votre navigateur
            </p>
          )}
        </div>
      </div>

      {/* Ville */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
          Ville <span className="text-orange-400">*</span>
        </label>
        <div className="relative">
          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full appearance-none px-4 py-3 pr-10 border-2 border-neutral-200 bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all font-semibold text-neutral-800 text-sm"
            required
          >
            <option value="Ouagadougou">Ouagadougou</option>
            <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </div>
      </div>

      {/* Téléphone */}
      <Input
        label="Numéro de téléphone"
        name="phoneNumber"
        value={formData.phoneNumber}
        onChange={handleChange}
        placeholder="+226 XX XX XX XX"
        type="tel"
      />

      {/* Indications */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
          Indications supplémentaires
        </label>
        <textarea
          name="additionalInfo"
          value={formData.additionalInfo}
          onChange={handleChange}
          rows={3}
          placeholder="Ex : portail bleu, 2ème maison à gauche…"
          className="w-full px-4 py-3 border-2 border-neutral-200 bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 resize-none transition-all text-sm text-neutral-800 placeholder-neutral-400"
        />
      </div>

      {/* Adresse par défaut + avertissement de remplacement */}
      <div className="space-y-2">
        <label
          className={`flex items-center gap-4 p-4 rounded-3xl border-2 cursor-pointer transition-all duration-200
            ${formData.isDefault
              ? 'border-primary-300 bg-primary-50'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
        >
          <div
            className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
              ${formData.isDefault ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 bg-white'}`}
          >
            {formData.isDefault && (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,5 4.5,8.5 11,1.5" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            name="isDefault"
            checked={formData.isDefault}
            onChange={handleChange}
            className="sr-only"
          />
          <div className="flex-1">
            <p className="font-bold text-neutral-900 text-sm">Adresse par défaut</p>
            <p className="text-xs text-neutral-500 mt-0.5">Utilisée automatiquement à la commande</p>
          </div>
        </label>

        {/* Avertissement de remplacement */}
        {showReplaceWarning && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-2xl">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">« {currentDefaultAddress.label} »</span> perdra
              son statut par défaut et sera remplacée par cette adresse.
            </p>
          </div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-3.5 rounded-2xl border-2 border-neutral-200 bg-white font-bold text-sm text-neutral-700 hover:bg-neutral-50 active:scale-[.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3.5 rounded-2xl gradient-gazbf font-bold text-sm text-white active:scale-[.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement…</>
          ) : (
            <><Save className="h-4 w-4" />{initialData ? 'Mettre à jour' : 'Enregistrer'}</>
          )}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;