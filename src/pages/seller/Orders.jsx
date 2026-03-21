// ==========================================
// FICHIER: src/pages/seller/Orders.jsx
// ✅ MODIFIÉ: Suppression du mode pickup et du filtre type livraison
//            Flux unique: pending → accepted → in_delivery → completed
//            Stats simplifiées (4 cartes)
//            Suppression estimatedTime dans le modal d'acceptation
// ==========================================
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Truck } from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import OrderSellerCard from '../../components/seller/OrderSellerCard';
import OrderDetailsModal from '../../components/client/OrderDetailsModal';
import Input from '../../components/common/Input';
import useSellerStore from '../../store/sellerStore';
import useSellerAccess from '../../hooks/useSellerAccess';
import SubscriptionRequired from '../../components/seller/SubscriptionRequired';
import SellerAccessBanner from '../../components/seller/SellerAccessBanner';

const Orders = () => {
  const {
    orders,
    loading: ordersLoading,
    error,
    fetchReceivedOrders,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    completeOrder,
    clearError
  } = useSellerStore();

  const {
    loading: accessLoading,
    accessStatus,
    pricingConfig,
    hasAccess,
    needsSubscription
  } = useSellerAccess();

  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [alert, setAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // ✅ MODIFIÉ: stats simplifiées (plus de séparation delivery/pickup)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    revenue: 0
  });

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [orderToProcess, setOrderToProcess] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // ==========================================
  // EFFETS
  // ==========================================

  useEffect(() => {
    if (hasAccess && !accessLoading) {
      loadOrders();
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [hasAccess, accessLoading]);

  useEffect(() => {
    if (error) {
      setAlert({ type: 'error', message: error });
      clearError();
    }
  }, [error]);

  useEffect(() => {
    calculateStats();
    applyFilters();
  }, [orders, statusFilter]);

  // ==========================================
  // FONCTIONS
  // ==========================================

  const loadOrders = async () => {
    try {
      await fetchReceivedOrders();
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  };

  // ✅ MODIFIÉ: stats sans pickup/delivery split
  const calculateStats = () => {
    const revenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    setStats({
      total:     orders.length,
      pending:   orders.filter(o => o.status === 'pending').length,
      active:    orders.filter(o => ['accepted', 'in_delivery'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      revenue
    });
  };

  const applyFilters = () => {
    let result = [...orders];

    if (statusFilter === 'pending') {
      result = result.filter(o => o.status === 'pending');
    } else if (statusFilter === 'active') {
      result = result.filter(o => ['accepted', 'in_delivery'].includes(o.status));
    } else if (statusFilter === 'completed') {
      result = result.filter(o => o.status === 'completed');
    }

    result.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFilteredOrders(result);
  };

  // ==========================================
  // GESTIONNAIRES D'ACTIONS
  // ==========================================

  const handleAccept = (order) => {
    setOrderToProcess(order);
    setShowAcceptModal(true);
  };

  const handleReject = (order) => {
    setOrderToProcess(order);
    setShowRejectModal(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setAlert({ type: 'success', message: 'Statut mis à jour avec succès' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la mise à jour' });
    }
  };

  // ✅ MODIFIÉ: suppression de estimatedTime
  const confirmAccept = async () => {
    if (!orderToProcess) return;
    setProcessing(true);
    try {
      await acceptOrder(orderToProcess.id);
      setAlert({ type: 'success', message: 'Commande acceptée avec succès' });
      setShowAcceptModal(false);
      setOrderToProcess(null);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de l\'acceptation' });
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!orderToProcess || !rejectionReason.trim()) {
      setAlert({ type: 'error', message: 'Veuillez indiquer une raison' });
      return;
    }
    setProcessing(true);
    try {
      await rejectOrder(orderToProcess.id, rejectionReason);
      setAlert({ type: 'success', message: 'Commande rejetée' });
      setShowRejectModal(false);
      setOrderToProcess(null);
      setRejectionReason('');
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors du rejet' });
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async (order) => {
    if (!window.confirm('Marquer cette commande comme complétée ?')) return;
    try {
      await completeOrder(order.id);
      setAlert({ type: 'success', message: 'Commande marquée comme complétée' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la mise à jour' });
    }
  };

  // ==========================================
  // RENDU CONDITIONNEL
  // ==========================================

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Vérification de votre accès...</p>
        </div>
      </div>
    );
  }

  if (needsSubscription) {
    return <SubscriptionRequired accessStatus={accessStatus} pricingConfig={pricingConfig} />;
  }

  if (ordersLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-600" />
      </div>
    );
  }

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
      <div className="space-y-4 sm:space-y-6">

        {/* Bannière d'accès */}
        <SellerAccessBanner accessStatus={accessStatus} pricingConfig={pricingConfig} />

        {/* Alertes */}
        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        {/* En-tête */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-2">
            Commandes Reçues
          </h1>
          <p className="text-xs sm:text-base text-gray-500">
            {stats.total} commande{stats.total !== 1 ? 's' : ''} au total
          </p>
        </div>

        {/* ==========================================
            STATISTIQUES — 4 cartes (plus de split pickup/delivery)
            ========================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-300 p-3 sm:p-4">
            <p className="text-xs text-yellow-700 font-semibold mb-1 truncate">⏳ En attente</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 p-3 sm:p-4">
            <p className="text-xs text-blue-700 font-semibold mb-1 truncate">🔄 En cours</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.active}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-300 p-3 sm:p-4">
            <p className="text-xs text-green-700 font-semibold mb-1 truncate">✅ Complétées</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>

          <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border-2 border-secondary-300 p-3 sm:p-4">
            <p className="text-xs text-secondary-700 font-semibold mb-1">💰 CA Total</p>
            <p className="text-lg sm:text-2xl font-bold text-secondary-600 truncate">
              {Math.round(stats.revenue).toLocaleString()} F
            </p>
          </div>
        </div>

        {/* ==========================================
            FILTRES PAR STATUT
            ========================================== */}
        <div className="bg-white rounded-xl border-2 border-neutral-200 p-3 sm:p-4 shadow-sm">
          <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
            Statut
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { key: 'all',       label: `Toutes (${filteredOrders.length})` },
              { key: 'pending',   label: '⏳ En attente' },
              { key: 'active',    label: '🔄 En cours' },
              { key: 'completed', label: '✅ Complétées' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-2 rounded-lg border-2 text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  statusFilter === key
                    ? 'gradient-gazbf border-transparent text-white'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ==========================================
            LISTE DES COMMANDES
            ========================================== */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-neutral-200 p-8 sm:p-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1">
              Aucune commande trouvée
            </h3>
            <p className="text-xs sm:text-base text-gray-500">
              {statusFilter === 'all' && 'Vous n\'avez pas encore reçu de commande'}
              {statusFilter === 'pending' && 'Aucune commande en attente'}
              {statusFilter === 'active' && 'Aucune commande en cours'}
              {statusFilter === 'completed' && 'Aucune commande complétée'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs sm:text-sm text-neutral-500">
                <span className="font-bold text-neutral-800">{filteredOrders.length}</span> commande(s)
              </p>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-xs text-primary-600 underline underline-offset-2 font-medium"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredOrders.map((order) => (
                <OrderSellerCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onUpdateStatus={handleUpdateStatus}
                  onViewDetails={setSelectedOrder}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL ACCEPTATION
            FIX MOBILE :
            - CSS Grid avec 3 rows : header (auto) / scroll (1fr) / footer (auto)
            - minHeight: 0 sur la zone scroll est OBLIGATOIRE
            - mb-[60px] pour ne pas passer sous la bottom nav
            - boutons dans le footer (row 3), jamais cachés
            ========================================== */}
        {showAcceptModal && orderToProcess && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAcceptModal(false); setOrderToProcess(null); } }}
          >
            <div
              className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
              style={{
                maxHeight: 'calc(90dvh - 60px)',
                display: 'grid',
                gridTemplateRows: 'auto 1fr auto',
              }}
            >
              {/* Header — row 1 */}
              <div className="gradient-gazbf p-5 rounded-t-2xl">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Truck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">Accepter la commande</h3>
                  </div>
                  <p className="text-white/90 text-sm">
                    Confirmez la prise en charge de cette livraison
                  </p>
                </div>
              </div>

              {/* Zone scrollable — row 2, minHeight:0 indispensable */}
              <div className="overflow-y-auto overscroll-contain p-5" style={{ minHeight: 0 }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl border-2 border-accent-200">
                    <Truck className="h-5 w-5 text-secondary-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        Commande #{orderToProcess.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">Livraison à domicile</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    En acceptant cette commande, vous vous engagez à la livrer dans les meilleurs délais.
                  </p>
                </div>
              </div>

              {/* Footer boutons — row 3, toujours visible */}
              <div
                className="p-4 sm:p-5 border-t-2 border-neutral-100 bg-white"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => { setShowAcceptModal(false); setOrderToProcess(null); }}
                    disabled={processing}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="gradient"
                    type="button"
                    onClick={confirmAccept}
                    loading={processing}
                    className="flex-1 h-12 text-base font-bold shadow-gazbf-lg"
                  >
                    Accepter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL REJET
            FIX MOBILE :
            - CSS Grid avec 3 rows : header (auto) / scroll (1fr) / footer (auto)
            - minHeight: 0 sur la zone scroll est OBLIGATOIRE
            - mb-[60px] pour ne pas passer sous la bottom nav
            - boutons dans le footer (row 3), jamais cachés
            ========================================== */}
        {showRejectModal && orderToProcess && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowRejectModal(false); setOrderToProcess(null); setRejectionReason(''); } }}
          >
            <div
              className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
              style={{
                maxHeight: 'calc(90dvh - 60px)',
                display: 'grid',
                gridTemplateRows: 'auto 1fr auto',
              }}
            >
              {/* Header — row 1 */}
              <div className="bg-red-600 p-5 rounded-t-2xl">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Truck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">Rejeter la commande</h3>
                  </div>
                  <p className="text-white/90 text-sm">
                    Indiquez la raison du refus au client
                  </p>
                </div>
              </div>

              {/* Zone scrollable — row 2, minHeight:0 indispensable */}
              <div className="overflow-y-auto overscroll-contain p-5" style={{ minHeight: 0 }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200">
                    <Truck className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        Commande #{orderToProcess.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">Livraison à domicile</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {[
                      'Produit en rupture de stock',
                      'Hors zone de livraison',
                      'Fermé actuellement',
                    ].map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={rejectionReason === reason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="flex-shrink-0 accent-primary-600"
                        />
                        <span className="text-sm font-medium text-neutral-800">{reason}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors">
                      <input
                        type="radio"
                        name="reason"
                        value="other"
                        checked={!['Produit en rupture de stock', 'Hors zone de livraison', 'Fermé actuellement'].includes(rejectionReason)}
                        onChange={() => setRejectionReason('')}
                        className="flex-shrink-0 accent-primary-600"
                      />
                      <span className="text-sm font-medium text-neutral-800">Autre raison</span>
                    </label>
                  </div>

                  {!['Produit en rupture de stock', 'Hors zone de livraison', 'Fermé actuellement'].includes(rejectionReason) && (
                    <Input
                      placeholder="Précisez la raison du rejet..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Footer boutons — row 3, toujours visible */}
              <div
                className="p-4 sm:p-5 border-t-2 border-neutral-100 bg-white"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => { setShowRejectModal(false); setOrderToProcess(null); setRejectionReason(''); }}
                    disabled={processing}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    onClick={confirmReject}
                    loading={processing}
                    className="flex-1 h-12 text-base font-bold"
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal détails commande */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCancel={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default Orders;