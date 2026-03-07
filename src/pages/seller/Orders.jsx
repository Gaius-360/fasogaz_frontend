// ==========================================
// FICHIER: src/pages/seller/Orders.jsx
// ✅ SIMPLIFIÉ: Suppression de l'état `preparing`
//
// FLUX RETRAIT SUR PLACE : pending → accepted → completed
// FLUX LIVRAISON         : pending → accepted → in_delivery → completed
// ==========================================
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Truck, Store, Package } from 'lucide-react';
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
  // ==========================================
  // ÉTAT ET HOOKS
  // ==========================================
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

  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stats, setStats] = useState({
    total: 0,
    delivery: { total: 0, pending: 0, active: 0, completed: 0 },
    pickup:   { total: 0, pending: 0, active: 0, completed: 0 },
    byStatus: { pending: 0, active: 0, completed: 0 },
    revenue: 0
  });

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [orderToProcess, setOrderToProcess] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState('20');
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
  }, [orders, deliveryTypeFilter, statusFilter]);

  // ==========================================
  // FONCTIONS DE DONNÉES
  // ==========================================

  const loadOrders = async () => {
    try {
      await fetchReceivedOrders();
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  };

  const calculateStats = () => {
    const deliveryOrders = orders.filter(o => o.deliveryMode === 'delivery');
    const pickupOrders   = orders.filter(o => o.deliveryMode === 'pickup');

    const countByStatus = (ordersList) => ({
      pending:   ordersList.filter(o => o.status === 'pending').length,
      active:    ordersList.filter(o => ['accepted', 'in_delivery'].includes(o.status)).length,
      completed: ordersList.filter(o => o.status === 'completed').length,
      total:     ordersList.length
    });

    const revenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    setStats({
      total: orders.length,
      delivery: countByStatus(deliveryOrders),
      pickup:   countByStatus(pickupOrders),
      byStatus: countByStatus(orders),
      revenue
    });
  };

  const applyFilters = () => {
    let result = [...orders];

    if (deliveryTypeFilter === 'delivery') {
      result = result.filter(o => o.deliveryMode === 'delivery');
    } else if (deliveryTypeFilter === 'pickup') {
      result = result.filter(o => o.deliveryMode === 'pickup');
    }

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

  const confirmAccept = async () => {
    if (!orderToProcess) return;
    setProcessing(true);
    try {
      await acceptOrder(orderToProcess.id, parseInt(estimatedTime));
      setAlert({ type: 'success', message: 'Commande acceptée avec succès' });
      setShowAcceptModal(false);
      setOrderToProcess(null);
      setEstimatedTime('20');
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
  // STATS SELON FILTRE ACTIF
  // ==========================================

  const activeStats = deliveryTypeFilter === 'delivery'
    ? stats.delivery
    : deliveryTypeFilter === 'pickup'
      ? stats.pickup
      : stats.byStatus;

  const revenueCard = deliveryTypeFilter === 'all' && (
    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border-2 border-secondary-300 p-3 sm:p-4">
      <p className="text-xs text-secondary-700 font-semibold mb-1">💰 CA Total</p>
      <p className="text-lg sm:text-2xl font-bold text-secondary-600 truncate">
        {Math.round(stats.revenue).toLocaleString()} F
      </p>
    </div>
  );

  const totalCard = deliveryTypeFilter !== 'all' && (
    <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl border-2 border-secondary-300 p-3 sm:p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {deliveryTypeFilter === 'delivery'
          ? <Truck className="h-3 w-3 text-secondary-600" />
          : <Store className="h-3 w-3 text-secondary-600" />
        }
        <p className="text-xs text-secondary-700 font-semibold truncate">
          {deliveryTypeFilter === 'delivery' ? 'Total Livraison' : 'Total Retrait'}
        </p>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-secondary-600">{activeStats.total}</p>
    </div>
  );

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
            FILTRES TYPE DE LIVRAISON — scroll horizontal sur mobile
            ========================================== */}
        <div className="bg-white rounded-xl border-2 border-neutral-200 p-3 sm:p-4 shadow-sm">
          <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
            Type de livraison
          </p>
          {/* overflow-x-auto + pb-1 pour que la scrollbar ne clipse pas les boutons */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { key: 'all',      label: 'Toutes',   count: stats.total,           icon: <Package className="h-3.5 w-3.5 flex-shrink-0" /> },
              { key: 'delivery', label: 'Livraison', count: stats.delivery.total,  icon: <Truck className="h-3.5 w-3.5 flex-shrink-0" /> },
              { key: 'pickup',   label: 'Retrait',   count: stats.pickup.total,    icon: <Store className="h-3.5 w-3.5 flex-shrink-0" /> },
            ].map(({ key, label, count, icon }) => (
              <button
                key={key}
                onClick={() => setDeliveryTypeFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  deliveryTypeFilter === key
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {icon}
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[20px] text-center ${
                  deliveryTypeFilter === key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ==========================================
            STATISTIQUES — 2 cols sur mobile, 4 sur desktop
            ========================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-2 border-yellow-300 p-3 sm:p-4">
            <p className="text-xs text-yellow-700 font-semibold mb-1 truncate">⏳ En attente</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{activeStats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 p-3 sm:p-4">
            <p className="text-xs text-blue-700 font-semibold mb-1 truncate">🔄 En cours</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{activeStats.active}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-300 p-3 sm:p-4">
            <p className="text-xs text-green-700 font-semibold mb-1 truncate">✅ Complétées</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{activeStats.completed}</p>
          </div>

          {revenueCard}
          {totalCard}
        </div>

        {/* ==========================================
            FILTRES PAR STATUT — scroll horizontal
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
            {deliveryTypeFilter === 'delivery'
              ? <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              : deliveryTypeFilter === 'pickup'
                ? <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                : <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            }
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1">
              Aucune commande trouvée
            </h3>
            <p className="text-xs sm:text-base text-gray-500">
              {deliveryTypeFilter === 'all' && statusFilter === 'all' && 'Vous n\'avez pas encore reçu de commande'}
              {deliveryTypeFilter === 'delivery' && statusFilter === 'all' && 'Aucune commande de livraison'}
              {deliveryTypeFilter === 'pickup' && statusFilter === 'all' && 'Aucune commande de retrait'}
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
              {(deliveryTypeFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => { setDeliveryTypeFilter('all'); setStatusFilter('all'); }}
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
            ========================================== */}
        {showAcceptModal && orderToProcess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 sm:p-6
                            max-h-[90dvh] overflow-y-auto shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Accepter la commande
              </h3>

              <div className="flex items-center gap-3 mb-5 p-3 bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl border-2 border-accent-200">
                {orderToProcess.deliveryMode === 'delivery'
                  ? <Truck className="h-5 w-5 text-secondary-600 flex-shrink-0" />
                  : <Store className="h-5 w-5 text-secondary-600 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">
                    Commande #{orderToProcess.orderNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {orderToProcess.deliveryMode === 'delivery' ? 'Livraison à domicile' : 'Retrait sur place'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button variant="primary" fullWidth onClick={confirmAccept} loading={processing}>
                  Accepter la commande
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => { setShowAcceptModal(false); setOrderToProcess(null); }}
                  disabled={processing}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL REJET
            ========================================== */}
        {showRejectModal && orderToProcess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 sm:p-6
                            max-h-[90dvh] overflow-y-auto shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Rejeter la commande
              </h3>

              <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200">
                {orderToProcess.deliveryMode === 'delivery'
                  ? <Truck className="h-5 w-5 text-red-600 flex-shrink-0" />
                  : <Store className="h-5 w-5 text-red-600 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">
                    Commande #{orderToProcess.orderNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {orderToProcess.deliveryMode === 'delivery' ? 'Livraison à domicile' : 'Retrait sur place'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                {[
                  'Produit en rupture de stock',
                  'Hors zone de livraison',
                  'Fermé actuellement'
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
                <div className="mb-4">
                  <Input
                    placeholder="Précisez la raison du rejet..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button variant="danger" fullWidth onClick={confirmReject} loading={processing}>
                  Rejeter la commande
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => { setShowRejectModal(false); setOrderToProcess(null); setRejectionReason(''); }}
                  disabled={processing}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL DÉTAILS COMMANDE
            ========================================== */}
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