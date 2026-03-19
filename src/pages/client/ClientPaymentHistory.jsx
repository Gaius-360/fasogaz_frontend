// ==========================================
// FICHIER: src/pages/client/ClientPaymentHistory.jsx
// ✅ ADAPTÉ: Abonnements classiques (plus d'accès 24h)
//    Labels mis à jour, logique inchangée
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, CreditCard, TrendingUp, CheckCircle, XCircle,
  Loader2, AlertCircle, DollarSign, Filter, RefreshCw, Crown
} from 'lucide-react';
import { api } from '../../api/apiSwitch';

const PLAN_LABELS = {
  weekly:    'Hebdomadaire',
  monthly:   'Mensuel',
  quarterly: 'Trimestriel',
  yearly:    'Annuel',
};

const ClientPaymentHistory = () => {
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [purchases, setPurchases]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [currentAccess, setCurrentAccess] = useState(null);
  const [pagination, setPagination]   = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters]         = useState({ status: 'all', dateRange: '30days' });
  const [alert, setAlert]             = useState(null);

  useEffect(() => { loadData(); }, [pagination.page, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPurchaseHistory(), loadStats(), loadCurrentAccess()]);
    } catch (error) {
      setAlert({ type: 'error', message: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    const params = { page: pagination.page, limit: pagination.limit };
    if (filters.status !== 'all') params.status = filters.status;
    const response = await api.access.getHistory(params);
    if (response?.success) {
      setPurchases(response.data.purchases || []);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    }
  };

  const loadStats = async () => {
    const response = await api.access.getStats();
    if (response?.success) setStats(response.data);
  };

  const loadCurrentAccess = async () => {
    const response = await api.access.checkStatus();
    if (response?.success) setCurrentAccess(response.data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    setAlert({ type: 'success', message: '✅ Données actualisées' });
    setTimeout(() => setAlert(null), 3000);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatDateShort = (date) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const formatDuration = (hours) => {
    if (!hours) return '—';
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}j`;
    if (days < 30) return `${Math.round(days / 7)} sem.`;
    if (days < 365) return `${Math.round(days / 30)} mois`;
    return `${Math.round(days / 365)} an`;
  };

  const getStatusBadge = (status) => {
    const cfg = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', Icon: CheckCircle, label: 'Actif' },
      active:    { bg: 'bg-green-100', text: 'text-green-800', Icon: CheckCircle, label: 'Actif' },
      pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', Icon: Clock,     label: 'En attente' },
      failed:    { bg: 'bg-red-100',    text: 'text-red-800',    Icon: XCircle,   label: 'Échoué' },
      expired:   { bg: 'bg-gray-100',   text: 'text-gray-800',   Icon: XCircle,   label: 'Expiré' },
    };
    const { bg, text, Icon, label } = cfg[status] || cfg.pending;
    return (
      <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${bg} ${text}`}>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  const getPlanLabel = (purchase) => {
    if (purchase.planType) return PLAN_LABELS[purchase.planType] || purchase.planType;
    // Déduction depuis la durée
    const hours = purchase.durationHours || 0;
    const days = Math.round(hours / 24);
    if (days <= 7)  return 'Hebdomadaire';
    if (days <= 31) return 'Mensuel';
    if (days <= 92) return 'Trimestriel';
    return 'Annuel';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">👑 Mes Abonnements</h1>
            <p className="text-sm sm:text-base text-gray-600">Suivez vos abonnements pour accéder à tous les revendeurs</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Actualiser</span>
          </button>
        </div>

        {/* Alerte */}
        {alert && (
          <div className={`p-3 sm:p-4 rounded-lg border flex items-start sm:items-center gap-2 sm:gap-3 ${alert.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {alert.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
            <p className={`flex-1 text-sm ${alert.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{alert.message}</p>
            <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        {/* Statut abonnement actuel */}
        {currentAccess && (
          <div className={`rounded-xl p-4 sm:p-6 border-2 ${
            currentAccess.hasAccess && currentAccess.accessType === 'active'
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
              : currentAccess.accessType === 'free'
              ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
              : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                currentAccess.hasAccess ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {currentAccess.hasAccess
                  ? <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  : <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  {currentAccess.accessType === 'active' && '✅ Abonnement Actif'}
                  {currentAccess.accessType === 'trial'  && '🎁 Période d\'essai'}
                  {currentAccess.accessType === 'free'   && '🆓 Accès Gratuit'}
                  {currentAccess.accessType === 'none'   && '🔒 Aucun Abonnement'}
                  {currentAccess.accessType === 'error'  && '⚠️ Erreur'}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3">{currentAccess.message}</p>
                {currentAccess.expiresAt && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Expire le {formatDateShort(currentAccess.expiresAt)}</span>
                    </div>
                    {currentAccess.remainingDays != null && (
                      <div className="flex items-center gap-2 font-semibold text-green-600">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{currentAccess.remainingDays} jour{currentAccess.remainingDays > 1 ? 's' : ''} restant{currentAccess.remainingDays > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { Icon: CreditCard,  bg: 'bg-blue-100',   color: 'text-blue-600',   label: 'Total abonnements', value: stats.totalPurchases || 0,  isPrice: false },
              { Icon: DollarSign,  bg: 'bg-green-100',  color: 'text-green-600',  label: 'Total dépensé',     value: stats.totalSpent || 0,       isPrice: true  },
              { Icon: TrendingUp,  bg: 'bg-purple-100', color: 'text-purple-600', label: 'Ce mois-ci',        value: stats.recentPurchases || 0,  isPrice: false },
              { Icon: Crown,       bg: 'bg-orange-100', color: 'text-orange-600', label: 'Dernier abonnement', value: stats.lastPurchase ? new Date(stats.lastPurchase.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Aucun', isPrice: false },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br from-${s.bg.split('-')[1]}-50 to-${s.bg.split('-')[1]}-100 rounded-lg border-2 border-${s.bg.split('-')[1]}-300 p-4 sm:p-6 shadow-sm`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <s.Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                  </div>
                  <p className={`text-lg sm:text-xl font-bold ${s.color} truncate`}>
                    {s.isPrice ? formatPrice(s.value) : s.value}
                  </p>
                </div>
                <p className={`text-xs sm:text-sm ${s.color} font-semibold`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg border p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="completed">Terminés</option>
                <option value="expired">Expirés</option>
                <option value="failed">Échoués</option>
              </select>
              <select value={filters.dateRange} onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="30days">30 derniers jours</option>
                <option value="90days">90 derniers jours</option>
                <option value="all">Tout l'historique</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Aucun abonnement</h3>
              <p className="text-sm sm:text-base text-gray-600">Vous n'avez pas encore souscrit d'abonnement</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border-b px-4 sm:px-6 py-3 hidden lg:grid lg:grid-cols-5 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-2">Date & Plan</div>
                <div>Montant</div>
                <div>Statut</div>
                <div className="text-right">Expiration</div>
              </div>
              <div className="divide-y">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className={`px-4 sm:px-6 py-4 hover:bg-gray-50 transition ${purchase.isActive ? 'bg-green-50' : ''}`}>
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-0.5">{formatDateShort(purchase.purchaseDate)}</p>
                          <p className="text-xs text-gray-600">Plan {getPlanLabel(purchase)} · {formatDuration(purchase.durationHours)}</p>
                        </div>
                        {getStatusBadge(purchase.status)}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-bold text-orange-600">{formatPrice(purchase.amount)}</span>
                        {purchase.expiryDate && <span className="text-xs text-gray-500">Expire: {formatDateShort(purchase.expiryDate)}</span>}
                      </div>
                      {purchase.isActive && (
                        <div className="bg-green-100 border border-green-200 rounded-lg p-2 text-center">
                          <span className="text-xs font-semibold text-green-800">✅ Abonnement actuellement actif</span>
                        </div>
                      )}
                    </div>
                    <div className="hidden lg:grid lg:grid-cols-5 gap-4 items-center">
                      <div className="col-span-2">
                        <p className="font-semibold text-gray-900 mb-0.5">{formatDate(purchase.purchaseDate)}</p>
                        <p className="text-sm text-gray-600">Plan {getPlanLabel(purchase)}</p>
                        {purchase.isActive && <span className="inline-block mt-1 text-xs font-semibold text-green-600">✅ Actif</span>}
                      </div>
                      <div><span className="text-lg font-bold text-orange-600">{formatPrice(purchase.amount)}</span></div>
                      <div>{getStatusBadge(purchase.status)}</div>
                      <div className="text-right">
                        {purchase.expiryDate
                          ? <p className="text-sm text-gray-900 font-medium">{formatDateShort(purchase.expiryDate)}</p>
                          : <span className="text-sm text-gray-400">-</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-gray-600">Page {pagination.page} sur {pagination.totalPages} ({pagination.total} abonnements)</p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="flex-1 sm:flex-none px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Précédent</button>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}
                className="flex-1 sm:flex-none px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPaymentHistory;