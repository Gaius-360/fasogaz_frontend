// ==========================================
// FICHIER: src/pages/client/ManageAddresses.jsx
// Gestion des adresses — une seule adresse par défaut
// ==========================================
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, MapPin, Loader2, Navigation, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AddAddressModal from '../../components/client/AddAddressModal';
import useClientStore from '../../store/clientStore';

// ─── AddressCard défini EN DEHORS du composant parent ────────
// Si défini à l'intérieur, React recrée le composant à chaque render
// ce qui provoque un démontage/remontage et fait "disparaître" les cartes.
const AddressCard = ({
  address,
  isOnlyAddress,
  settingDefaultId,
  onSetDefault,
  onEdit,
  onDelete,
}) => {
  const isDefault = address.isDefault;
  const isSetting = settingDefaultId === address.id;

  const formatCoordinate = (value) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? null : num.toFixed(5);
  };

  return (
    <div
      className={`relative rounded-3xl border-2 p-4 transition-all duration-200 ${
        isDefault
          ? 'border-primary-300 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-sm'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      }`}
    >
      {/* badge par défaut */}
      {isDefault && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-primary-500 text-white text-xs font-bold rounded-full shadow">
          <Star className="h-3 w-3 fill-white" />
          Par défaut
        </div>
      )}

      {/* titre */}
      <div className="flex items-start gap-3 pr-24">
        <div className={`p-2 rounded-2xl flex-shrink-0 ${isDefault ? 'bg-primary-100' : 'bg-neutral-100'}`}>
          <MapPin className={`h-4 w-4 ${isDefault ? 'text-primary-600' : 'text-neutral-500'}`} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-neutral-900 leading-tight">{address.label}</p>
          <p className="text-sm text-neutral-600 mt-0.5">{address.city}</p>
        </div>
      </div>

      {/* détails */}
      <div className="mt-3 ml-11 space-y-1 text-sm text-neutral-600">
        {address.phoneNumber    && <p>📞 {address.phoneNumber}</p>}
        {address.additionalInfo && <p>💡 {address.additionalInfo}</p>}
      </div>

      {/* coordonnées GPS */}
      {address.latitude && address.longitude && (
        <div className="mt-3 ml-11 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-1.5">
          <Navigation className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-mono text-emerald-800">
            {formatCoordinate(address.latitude)}, {formatCoordinate(address.longitude)}
          </span>
        </div>
      )}

      {/* actions */}
      <div className="mt-4 ml-11 flex items-center gap-2 flex-wrap">
        {/* "Définir par défaut" uniquement sur les cartes non-default */}
        {!isDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address)}
            disabled={isSetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-all disabled:opacity-50"
          >
            {isSetting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Star className="h-3.5 w-3.5" />
            }
            Définir par défaut
          </button>
        )}

        <button
          type="button"
          onClick={() => onEdit(address)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
        >
          <Edit className="h-3.5 w-3.5" />
          Modifier
        </button>

        {/* impossible de supprimer la seule adresse existante */}
        {!(isDefault && isOnlyAddress) && (
          <button
            type="button"
            onClick={() => onDelete(address)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
const ManageAddresses = () => {
  const navigate = useNavigate();
  const {
    addresses,
    loading,
    error,
    fetchMyAddresses,
    deleteAddress,
    updateAddress,
    clearError,
  } = useClientStore();

  const [alert, setAlert]                   = useState(null);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  useEffect(() => { loadAddresses(); }, []);

  useEffect(() => {
    if (error) {
      setAlert({ type: 'error', message: error });
      clearError();
    }
  }, [error]);

  const loadAddresses = async () => {
    try { await fetchMyAddresses(); }
    catch { setAlert({ type: 'error', message: 'Erreur lors du chargement des adresses' }); }
  };

  const handleDelete = async (address) => {
    if (!window.confirm(`Supprimer l'adresse "${address.label}" ?`)) return;
    try {
      await deleteAddress(address.id);
      setAlert({ type: 'success', message: 'Adresse supprimée' });
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors de la suppression' });
    }
  };

  const handleSetDefault = async (address) => {
    if (address.isDefault) return;
    setSettingDefaultId(address.id);
    try {
      await updateAddress(address.id, { isDefault: true });
      // Recharge toute la liste : le backend retire isDefault de l'ancienne adresse.
      // Sans ce rechargement, l'ancienne carte garde visuellement son badge "Par défaut".
      await loadAddresses();
      setAlert({ type: 'success', message: `« ${address.label} » est maintenant votre adresse par défaut` });
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors de la mise à jour' });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowAddModal(true);
  };

  const defaultAddress      = addresses.find(a => a.isDefault);
  const nonDefaultAddresses = addresses.filter(a => !a.isDefault);

  // Props communes passées à chaque AddressCard
  const cardProps = {
    isOnlyAddress:   addresses.length === 1,
    settingDefaultId,
    onSetDefault:    handleSetDefault,
    onEdit:          handleEdit,
    onDelete:        handleDelete,
  };

  /* ── Chargement initial ─────────────────────────────────── */
  if (loading && addresses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/client/profile')}
          className="p-2 rounded-2xl border-2 border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-neutral-900">Mes adresses</h1>
          <p className="text-sm text-neutral-500">
            {addresses.length} adresse{addresses.length !== 1 ? 's' : ''} enregistrée{addresses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditingAddress(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 gradient-gazbf text-white text-sm font-bold rounded-2xl shadow-sm active:scale-[.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* ── Bannière info GPS ── */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-3xl p-4">
        <Navigation className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Vos adresses utilisent le GPS pour calculer la distance jusqu'aux dépôts
          et faciliter chaque livraison.
        </p>
      </div>

      {/* ── État vide ── */}
      {addresses.length === 0 && (
        <div className="text-center py-16 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-100 rounded-full mb-4">
            <MapPin className="h-9 w-9 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucune adresse</h3>
          <p className="text-sm text-neutral-500 mb-6">
            Ajoutez une adresse avec votre GPS pour faciliter vos commandes
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 gradient-gazbf text-white font-bold rounded-2xl shadow active:scale-[.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Ajouter ma première adresse
          </button>
        </div>
      )}

      {/* ── Adresse par défaut (en tête, mise en valeur) ── */}
      {defaultAddress && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
            Adresse par défaut
          </p>
          <AddressCard address={defaultAddress} {...cardProps} />
        </div>
      )}

      {/* ── Autres adresses ── */}
      {nonDefaultAddresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
            Autres adresses
          </p>
          <div className="space-y-3">
            {nonDefaultAddresses.map(a => (
              <AddressCard key={a.id} address={a} {...cardProps} />
            ))}
          </div>
        </div>
      )}

      {/* ── Modal ajout / édition ── */}
      {showAddModal && (
        <AddAddressModal
          editAddress={editingAddress}
          currentDefaultAddress={defaultAddress || null}
          onClose={() => { setShowAddModal(false); setEditingAddress(null); }}
          onSuccess={() => {
            loadAddresses();
            setShowAddModal(false);
            setEditingAddress(null);
            setAlert({
              type: 'success',
              message: editingAddress ? 'Adresse mise à jour ✓' : 'Adresse ajoutée ✓',
            });
          }}
        />
      )}
    </div>
  );
};

export default ManageAddresses;