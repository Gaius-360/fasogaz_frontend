// ==========================================
// FICHIER: src/pages/admin/AdminClientDetail.jsx
// VERSION RESPONSIVE - CORRIGÉE
// ✅ AJOUT: Bouton + modale "Réinitialiser mot de passe"
// ==========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  Ban,
  CheckCircle,
  Trash2,
  CreditCard,
  Lock,
  X
} from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Input from '../../components/common/Input';
import { formatPrice, formatDateTime } from '../../utils/helpers';
import useAdmin from '../../hooks/useAdmin';

const AdminClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    loading,
    error,
    clearError,
    getClientById,
    blockClient,
    unblockClient,
    deleteClient,
    resetUserPassword  // ✅ nouveau hook exposé
  } = useAdmin();

  const [client, setClient]       = useState(null);
  const [alert, setAlert]         = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ── État modale reset MDP ──
  const [showResetModal, setShowResetModal]   = useState(false);
  const [newPassword, setNewPassword]         = useState('');
  const [resetLoading, setResetLoading]       = useState(false);

  useEffect(() => { loadClientDetail(); }, [id]);

  const loadClientDetail = async () => {
    try {
      const response = await getClientById(id);
      if (response?.success) setClient(response.data);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors du chargement' });
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Bloquer ${client.firstName} ${client.lastName} ?`)) return;
    const reason = prompt('Raison du blocage :');
    if (!reason) return;
    try {
      const response = await blockClient(client.id, reason);
      if (response?.success) { setAlert({ type: 'success', message: 'Client bloqué' }); loadClientDetail(); }
    } catch (err) { setAlert({ type: 'error', message: err.message || 'Erreur lors du blocage' }); }
  };

  const handleUnblock = async () => {
    if (!window.confirm(`Débloquer ${client.firstName} ${client.lastName} ?`)) return;
    try {
      const response = await unblockClient(client.id);
      if (response?.success) { setAlert({ type: 'success', message: 'Client débloqué' }); loadClientDetail(); }
    } catch (err) { setAlert({ type: 'error', message: err.message || 'Erreur lors du déblocage' }); }
  };

  const handleDelete = async () => {
    const confirmation = prompt(
      `⚠️ ATTENTION: Cette action est IRRÉVERSIBLE!\n\nPour supprimer ${client.firstName} ${client.lastName}, tapez: SUPPRIMER`
    );
    if (confirmation !== 'SUPPRIMER') return;
    try {
      const response = await deleteClient(client.id);
      if (response?.success) {
        setAlert({ type: 'success', message: 'Client supprimé' });
        setTimeout(() => navigate('/admin/clients'), 2000);
      }
    } catch (err) { setAlert({ type: 'error', message: err.message || 'Erreur lors de la suppression' }); }
  };

  // ── Réinitialisation mot de passe ──
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetUserPassword(client.id, newPassword);
      if (response?.success) {
        setAlert({
          type: 'success',
          message: `Mot de passe réinitialisé. Communiquez le nouveau mot de passe à ${client.firstName} via WhatsApp.`
        });
        setShowResetModal(false);
        setNewPassword('');
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la réinitialisation' });
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setNewPassword('');
  };

  // ── Loading ──
  if (loading && !client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Client non trouvé</p>
          <Button onClick={() => navigate('/admin/clients')}>Retour</Button>
        </div>
      </div>
    );
  }

  // ── Tabs config ──
  const tabs = [
    { key: 'overview',   label: "Vue d'ensemble" },
    { key: 'orders',     label: `Commandes (${client.orders?.length || 0})` },
    { key: 'addresses',  label: `Adresses (${client.addresses?.length || 0})` },
  ];

  // ── Statistiques depuis client.orders ──
  const totalOrders      = client.orders?.length || 0;
  const completedOrders  = client.orders?.filter(o => o.status === 'completed')?.length || 0;
  const totalSpent       = client.orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const avgOrderValue    = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <div className="space-y-4">

      {/* ── En-tête : retour + nom + boutons action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Côté gauche */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" onClick={() => navigate('/admin/clients')} className="p-1.5 sm:p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">Client #{client.id.slice(-8)}</p>
            </div>
          </div>
        </div>

        {/* Côté droit : boutons action */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* ✅ NOUVEAU: Bouton reset MDP */}
          <Button
            variant="outline"
            onClick={() => setShowResetModal(true)}
            disabled={loading}
            className="text-sm sm:text-base"
          >
            <Lock className="h-4 w-4 mr-1.5" /> Réinitialiser MDP
          </Button>

          {!client.isBlocked ? (
            <Button variant="outline" onClick={handleBlock} disabled={loading} className="text-sm sm:text-base">
              <Ban className="h-4 w-4 mr-1.5" /> Bloquer
            </Button>
          ) : (
            <Button variant="primary" onClick={handleUnblock} disabled={loading} className="text-sm sm:text-base">
              <CheckCircle className="h-4 w-4 mr-1.5" /> Débloquer
            </Button>
          )}

          <Button variant="danger" onClick={handleDelete} disabled={loading} className="text-sm sm:text-base">
            <Trash2 className="h-4 w-4 mr-1.5" /> Supprimer
          </Button>
        </div>
      </div>

      {/* ── Alertes ── */}
      {(alert || error) && (
        <Alert
          type={alert?.type || 'error'}
          message={alert?.message || error}
          onClose={() => { setAlert(null); clearError(); }}
        />
      )}

      {/* ── Carte principale ── */}
      <div className="bg-white rounded-lg border p-4 sm:p-6">

        {/* Badges statut */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {client.isBlocked ? (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">🚫 Bloqué</span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ Actif</span>
          )}
          {client.subscription?.isActive ? (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">Abonné</span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">Non abonné</span>
          )}
        </div>

        {/* Info personnelle + abonnement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Informations personnelles</h3>
            <div className="text-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="break-all">{client.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{client.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>Inscrit le {formatDateTime(client.createdAt).split(' à ')[0]}</span>
              </div>
            </div>
          </div>

          {client.subscription && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Abonnement</h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  <strong>Plan :</strong>{' '}
                  {client.subscription.planType === 'weekly' ? '1 semaine' : '1 mois'}
                </p>
                <p className="text-gray-600">
                  <strong>Début :</strong>{' '}
                  {formatDateTime(client.subscription.startDate).split(' à ')[0]}
                </p>
                <p className="text-gray-600">
                  <strong>Expire :</strong>{' '}
                  {formatDateTime(client.subscription.endDate).split(' à ')[0]}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Raison blocage */}
        {client.blockReason && (
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-1">Raison du blocage</p>
            <p className="text-sm text-red-700">{client.blockReason}</p>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-5 mt-5 border-t">
          {[
            { Icon: ShoppingCart,  bg: 'bg-blue-100',   color: 'text-blue-600',   value: totalOrders,     label: 'Commandes',     isPrice: false },
            { Icon: CheckCircle,   bg: 'bg-green-100',  color: 'text-green-600',  value: completedOrders, label: 'Complétées',    isPrice: false },
            { Icon: DollarSign,    bg: 'bg-purple-100', color: 'text-purple-600', value: totalSpent,      label: 'Total dépensé', isPrice: true  },
            { Icon: CreditCard,    bg: 'bg-yellow-100', color: 'text-yellow-600', value: avgOrderValue,   label: 'Panier moyen',  isPrice: true  },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className={`flex items-center justify-center w-11 h-11 ${s.bg} rounded-lg mx-auto mb-2`}>
                <s.Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {s.isPrice ? formatPrice(s.value) : s.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="border-b overflow-x-auto">
          <div className="flex min-w-max sm:min-w-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">

          {/* ── Vue d'ensemble ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Activité</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Taux de complétion</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Fréquence</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalOrders > 0
                        ? (totalOrders /
                           Math.max(1, Math.floor(
                             (Date.now() - new Date(client.createdAt)) / (7 * 86400000)
                           ))).toFixed(1)
                        : 0}
                    </p>
                    <p className="text-xs text-gray-500">commandes / semaine</p>
                  </div>
                </div>
              </div>

              {client.orders?.[0] && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">Dernière commande</p>
                  <p className="text-sm text-blue-700">
                    {formatDateTime(
                      client.orders
                        .slice()
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Commandes ── */}
          {activeTab === 'orders' && (
            <div>
              {client.orders && client.orders.length > 0 ? (
                <div className="space-y-3">
                  {client.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          Commande #{order.orderNumber}
                        </h4>
                        <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary-600">{formatPrice(order.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800'    :
                                                         'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune commande</p>
                </div>
              )}
            </div>
          )}

          {/* ── Adresses ── */}
          {activeTab === 'addresses' && (
            <div>
              {client.addresses && client.addresses.length > 0 ? (
                <div className="space-y-3">
                  {client.addresses.map((address) => (
                    <div key={address.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h4 className="font-semibold text-gray-900">{address.label}</h4>
                            {address.isDefault && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                Par défaut
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 break-words">{address.fullAddress}</p>
                          <p className="text-sm text-gray-600">{address.quarter}, {address.city}</p>
                        </div>
                        <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune adresse enregistrée</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ MODALE RESET MOT DE PASSE ════ */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">

            {/* En-tête modale */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900">Réinitialiser le mot de passe</h3>
              </div>
              <button
                onClick={closeResetModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info client */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Client : <strong className="text-gray-900">
                  {client.firstName} {client.lastName}
                </strong>
              </p>
              <p className="text-sm text-gray-600">
                Tél : <strong className="text-gray-900">{client.phone}</strong>
              </p>
            </div>

            {/* Avertissement flux WhatsApp */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 leading-relaxed">
                ⚠️ Assurez-vous d'avoir vérifié l'identité du client via WhatsApp avant
                de réinitialiser son mot de passe. Communiquez-lui ensuite le nouveau
                mot de passe temporaire via la même conversation.
              </p>
            </div>

            {/* Champ nouveau MDP */}
            <Input
              label="Nouveau mot de passe temporaire"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={Lock}
              placeholder="Minimum 6 caractères"
            />

            {/* Boutons */}
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                fullWidth
                onClick={closeResetModal}
                disabled={resetLoading}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                fullWidth
                loading={resetLoading}
                onClick={handleResetPassword}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminClientDetail;