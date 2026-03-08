// ==========================================
// FICHIER: src/components/client/AddAddressModal.jsx
// Modal d'ajout d'adresse — redesign mobile-first
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, CheckCircle, Home, Briefcase, MapPinned, Zap, ChevronDown } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { api } from '../../api/apiSwitch';
import { getCurrentPosition } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';

/* ─── Micro pill badge ───────────────────────────────────────── */
const Pill = ({ active, color, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',
      transform: active ? 'scale(1.04)' : 'scale(1)',
    }}
    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 text-sm font-semibold select-none
      ${active
        ? `border-${color}-400 bg-${color}-50 text-${color}-700 shadow-sm`
        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
      }`}
  >
    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
    {label}
  </button>
);

/* ─── GPS card ───────────────────────────────────────────────── */
const GPSCard = ({ hasGPS, loading, coords, onGetLocation }) => (
  <div
    className={`rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
      hasGPS ? 'border-emerald-300 bg-emerald-50' : 'border-orange-200 bg-orange-50'
    }`}
  >
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div className={`p-2.5 rounded-2xl shadow-sm ${hasGPS ? 'bg-emerald-500' : 'bg-orange-400'}`}>
        <Navigation className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-neutral-900 text-sm leading-tight">Position GPS</p>
        <p className={`text-xs mt-0.5 ${hasGPS ? 'text-emerald-600' : 'text-orange-600'}`}>
          {hasGPS ? '✓ Coordonnées enregistrées' : 'Requis pour la livraison'}
        </p>
      </div>
      {hasGPS && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
    </div>

    {hasGPS && coords && (
      <div className="mx-4 mb-3 bg-white/70 backdrop-blur-sm rounded-2xl px-3 py-2.5 border border-emerald-200">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-neutral-400 block mb-0.5">Lat</span>
            <span className="font-mono font-bold text-neutral-800">{parseFloat(coords.lat).toFixed(5)}</span>
          </div>
          <div className="w-px bg-emerald-200" />
          <div>
            <span className="text-neutral-400 block mb-0.5">Lng</span>
            <span className="font-mono font-bold text-neutral-800">{parseFloat(coords.lng).toFixed(5)}</span>
          </div>
        </div>
      </div>
    )}

    <div className="px-4 pb-4">
      <button
        type="button"
        onClick={onGetLocation}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[.98]
          ${hasGPS
            ? 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            : 'bg-orange-500 text-white shadow-md shadow-orange-200 hover:bg-orange-600'
          }
          ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Localisation…
          </>
        ) : hasGPS ? (
          <><Zap className="h-4 w-4" />Mettre à jour</>
        ) : (
          <><Navigation className="h-4 w-4" />Obtenir ma position</>
        )}
      </button>
      {!hasGPS && (
        <p className="text-center text-xs text-neutral-500 mt-2">
          💡 Autorisez la géolocalisation dans votre navigateur
        </p>
      )}
    </div>
  </div>
);

/* ─── Section label ──────────────────────────────────────────── */
const SectionLabel = ({ children, required }) => (
  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
    {children}{required && <span className="text-orange-400 ml-1">*</span>}
  </label>
);

/* ══════════════════════════════════════════════════════════════ */
/**
 * @param {object}  editAddress           — adresse en cours d'édition (null = création)
 * @param {object}  currentDefaultAddress — adresse actuellement par défaut (null si aucune)
 *                  Passé depuis ManageAddresses pour afficher l'avertissement de remplacement.
 */
const AddAddressModal = ({ onClose, onSuccess, editAddress = null, currentDefaultAddress = null }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [alert, setAlert] = useState(null);
  const [hasGPS, setHasGPS] = useState(false);
  const [visible, setVisible] = useState(false);
  const bodyRef = useRef(null);

  const [formData, setFormData] = useState({
    label: editAddress?.label || '',
    city: editAddress?.city || user?.city || 'Ouagadougou',
    latitude: editAddress?.latitude || null,
    longitude: editAddress?.longitude || null,
    phoneNumber: editAddress?.phoneNumber || user?.phone || '',
    additionalInfo: editAddress?.additionalInfo || '',
    isDefault: editAddress?.isDefault || false,
  });

  useEffect(() => {
    if (formData.latitude && formData.longitude) setHasGPS(true);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setVisible(true));
    return () => { document.body.style.overflow = ''; };
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    setAlert(null);
    try {
      const pos = await getCurrentPosition();
      setFormData(prev => ({ ...prev, latitude: pos.latitude, longitude: pos.longitude }));
      setHasGPS(true);
      setAlert({ type: 'success', message: '📍 Position GPS obtenue !' });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Impossible d\'obtenir la position GPS' });
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
      setAlert({ type: 'error', message: 'Veuillez obtenir votre position GPS' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const payload = { ...formData, fullAddress: formData.city };
      if (editAddress) await api.addresses.updateAddress(editAddress.id, payload);
      else await api.addresses.createAddress(payload);
      onSuccess();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setLoading(false);
    }
  };

  const shortcuts = [
    { icon: Home,      label: 'Maison', color: 'primary'   },
    { icon: Briefcase, label: 'Bureau', color: 'secondary' },
    { icon: MapPinned, label: 'Autre',  color: 'accent'    },
  ];

  /**
   * Affiche l'avertissement de remplacement quand :
   *  - la checkbox "par défaut" est cochée
   *  - il existe déjà une adresse par défaut
   *  - ce n'est pas la même adresse qu'on édite
   */
  const showReplaceWarning =
    formData.isDefault &&
    currentDefaultAddress !== null &&
    currentDefaultAddress.id !== editAddress?.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{
        background: `rgba(0,0,0,${visible ? .55 : 0})`,
        backdropFilter: `blur(${visible ? 6 : 0}px)`,
        transition: 'background .3s ease, backdrop-filter .3s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] bg-neutral-50 shadow-2xl"
        style={{
          maxHeight: 'calc(94dvh - 60px)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          marginBottom: 60,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .35s cubic-bezier(.32,.72,0,1)',
        }}
      >

        {/* ── HEADER ──────────────────────────────────────── */}
        <div className="relative gradient-gazbf rounded-t-[2rem] px-5 pt-5 pb-6 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 top-6 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full sm:hidden" />

          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 p-2 bg-black/15 hover:bg-black/25 rounded-full transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                {editAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
              </h2>
              <p className="text-white/75 text-xs mt-0.5">Livraisons précises grâce au GPS</p>
            </div>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          className="overflow-y-auto overscroll-contain px-4 pt-5 pb-2 space-y-5"
          style={{ minHeight: 0 }}
        >
          {alert && (
            <div
              className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium border
                ${alert.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
                }`}
              style={{ animation: 'fadeSlide .25s ease' }}
            >
              <span className="flex-1">{alert.message}</span>
              <button type="button" onClick={() => setAlert(null)} className="opacity-50 hover:opacity-100 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* GPS */}
          <GPSCard
            hasGPS={hasGPS}
            loading={gettingLocation}
            coords={hasGPS ? { lat: formData.latitude, lng: formData.longitude } : null}
            onGetLocation={handleGetLocation}
          />

          {/* Nom de l'adresse */}
          <div>
            <SectionLabel required>Nom de l'adresse</SectionLabel>
            <div className="flex gap-2 mb-3">
              {shortcuts.map(s => (
                <Pill
                  key={s.label}
                  active={formData.label === s.label}
                  color={s.color}
                  icon={s.icon}
                  label={s.label}
                  onClick={() => setFormData(prev => ({ ...prev, label: s.label }))}
                />
              ))}
            </div>
            <Input
              name="label"
              value={formData.label}
              onChange={handleChange}
              placeholder="Ou tapez un nom personnalisé…"
              required
            />
          </div>

          {/* Ville */}
          <div>
            <SectionLabel required>Ville</SectionLabel>
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <SectionLabel>Téléphone</SectionLabel>
            <Input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+226 XX XX XX XX"
            />
          </div>

          {/* Indications */}
          <div>
            <SectionLabel>Indications supplémentaires</SectionLabel>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows={3}
              placeholder="Ex : portail bleu, 2ème maison à gauche…"
              className="w-full px-4 py-3 border-2 border-neutral-200 bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 resize-none transition-all text-sm text-neutral-800 placeholder-neutral-400"
            />
          </div>

          {/* ── Adresse par défaut + avertissement de remplacement ── */}
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

            {/* Avertissement affiché dynamiquement si un remplacement va se produire */}
            {showReplaceWarning && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-2xl"
                style={{ animation: 'fadeSlide .2s ease' }}
              >
                <span className="text-base flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold">« {currentDefaultAddress.label} »</span> perdra
                  son statut par défaut et sera remplacée par cette adresse.
                </p>
              </div>
            )}
          </div>

          <div className="h-1" />
        </div>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <div
          className="flex gap-3 px-4 py-4 bg-white border-t border-neutral-100"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="flex-1 py-3.5 rounded-2xl border-2 border-neutral-200 bg-white font-bold text-sm text-neutral-700 hover:bg-neutral-50 active:scale-[.98] transition-all disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!hasGPS || loading}
            className="flex-1 py-3.5 rounded-2xl gradient-gazbf font-bold text-sm text-white shadow-lg active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: hasGPS && !loading ? '0 4px 14px rgba(var(--color-primary-500), .35)' : 'none' }}
          >
            {loading ? (
              <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement…</>
            ) : (
              editAddress ? 'Mettre à jour' : 'Enregistrer'
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AddAddressModal;