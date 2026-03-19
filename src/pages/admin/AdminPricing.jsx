// ==========================================
// FICHIER: src/pages/admin/AdminPricing.jsx
// ✅ REFONTE: Section client utilise plans (mensuel/trimestriel/annuel)
//    Suppression: accessPrice24h, accessDurationHours
//    Ajout: info "sans abonnement = 5 revendeurs max"
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  DollarSign, Users, Store, Save, Loader2, AlertCircle,
  CheckCircle, TrendingUp, CreditCard, Info, Crown
} from 'lucide-react';
import { api } from '../../api/apiSwitch';

const planLabels = {
  weekly:    'Hebdomadaire',
  monthly:   'Mensuel',
  quarterly: 'Trimestriel',
  yearly:    'Annuel'
};

const AdminPricing = () => {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [activeTab, setActiveTab] = useState('client');
  const [stats, setStats]         = useState(null);

  const DEFAULT_PLANS = {
    weekly:    { price: 0,     duration: 7,   enabled: false },
    monthly:   { price: 2500,  duration: 30,  enabled: true  },
    quarterly: { price: 6500,  duration: 90,  enabled: false },
    yearly:    { price: 22000, duration: 365, enabled: false }
  };

  // ── État CLIENT ────────────────────────────────────────────────────────
  const [clientConfig, setClientConfig] = useState({
    isActive: false,
    plans:    { ...DEFAULT_PLANS },
    options:  { autoRenew: true, gracePeriodDays: 3, notifyBeforeExpiry: 7 }
  });

  // ── État REVENDEUR ─────────────────────────────────────────────────────
  const [revendeurConfig, setRevendeurConfig] = useState({
    isActive:      false,
    freeTrialDays: 0,
    plans: {
      weekly:    { price: 1000,  duration: 7,   enabled: false },
      monthly:   { price: 3500,  duration: 30,  enabled: false },
      quarterly: { price: 9000,  duration: 90,  enabled: false },
      yearly:    { price: 30000, duration: 365, enabled: false }
    },
    options: { autoRenew: true, gracePeriodDays: 3, notifyBeforeExpiry: 7 }
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.admin.pricing.getAll();
      if (response?.success) {
        const { client, revendeur } = response.data;

        if (client) {
          setClientConfig({
            isActive: client.isActive || false,
            plans:    client.plans || { ...DEFAULT_PLANS },
            options:  client.options || { autoRenew: true, gracePeriodDays: 3, notifyBeforeExpiry: 7 }
          });
        }

        if (revendeur) {
          setRevendeurConfig({
            isActive:      revendeur.isActive || false,
            freeTrialDays: 0,
            plans:         revendeur.plans || {
              weekly: { price: 1000, duration: 7, enabled: false },
              monthly: { price: 3500, duration: 30, enabled: false },
              quarterly: { price: 9000, duration: 90, enabled: false },
              yearly: { price: 30000, duration: 365, enabled: false }
            },
            options: revendeur.options || { autoRenew: true, gracePeriodDays: 3, notifyBeforeExpiry: 7 }
          });
        }
      }

      try {
        const statsRes = await api.admin.pricing.getClientStats();
        if (statsRes?.success) setStats({ client: statsRes.data });
      } catch { /* stats optionnelles */ }

    } catch (error) {
      setAlert({ type: 'error', message: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  // ── Sauvegarde CLIENT ──────────────────────────────────────────────────
  const handleSaveClient = async () => {
    setSaving(true);
    try {
      if (clientConfig.isActive) {
        const enabledPlans = Object.values(clientConfig.plans).filter(p => p.enabled);
        if (enabledPlans.length === 0) {
          setAlert({ type: 'error', message: 'Activez au moins un plan avant d\'activer le système' });
          return;
        }
      }

      const response = await api.admin.pricing.updateClient(clientConfig);
      if (response?.success) {
        setAlert({
          type:    'success',
          message: clientConfig.isActive
            ? '✅ Tarification client activée — sans abonnement les clients voient 3 revendeurs max'
            : '✅ Tarification client désactivée — Accès gratuit illimité'
        });
        await loadData();
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  // ── Sauvegarde REVENDEUR ───────────────────────────────────────────────
  const handleSaveRevendeur = async () => {
    setSaving(true);
    try {
      const response = await api.admin.pricing.updateRevendeur(revendeurConfig);
      if (response?.success) {
        setAlert({
          type:    'success',
          message: revendeurConfig.isActive
            ? '✅ Tarification revendeur activée'
            : '✅ Tarification revendeur désactivée — Accès gratuit illimité'
        });
        await loadData();
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers plans ──────────────────────────────────────────────────────
  const updateClientPlan = (planType, field, value) => {
    setClientConfig(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [planType]: {
          ...prev.plans[planType],
          [field]: field === 'enabled' ? value : parseFloat(value) || 0
        }
      }
    }));
  };

  const updateRevendeurPlan = (planType, field, value) => {
    setRevendeurConfig(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [planType]: {
          ...prev.plans[planType],
          [field]: field === 'enabled' ? value : parseFloat(value) || 0
        }
      }
    }));
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(price);

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── PlanRow component ──────────────────────────────────────────────────
  const PlanRow = ({ planType, plan, onUpdate }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={plan.enabled}
          onChange={(e) => onUpdate(planType, 'enabled', e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <label className="font-medium text-gray-900">{planLabels[planType]}</label>
        {plan.enabled && (
          <span className="ml-auto text-sm font-semibold text-gray-500">
            {formatPrice(plan.price)} / {plan.duration} jours
          </span>
        )}
      </div>

      {plan.enabled && (
        <div className="grid grid-cols-2 gap-3 ml-7">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Prix (FCFA)</label>
            <input
              type="number" min="0" step="100"
              value={plan.price}
              onChange={(e) => onUpdate(planType, 'price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Durée (jours)</label>
            <input
              type="number" min="1"
              value={plan.duration}
              onChange={(e) => onUpdate(planType, 'duration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Titre */}
      <div className="flex items-center gap-2 sm:gap-3">
        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Gestion de la Tarification</h1>
          <p className="text-xs sm:text-sm text-gray-500">Configuration des abonnements clients et revendeurs</p>
        </div>
      </div>

      {/* Alerte */}
      {alert && (
        <div className={`p-3 sm:p-4 rounded-lg border flex items-start gap-3 ${
          alert.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {alert.type === 'success'
            ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-sm flex-1 ${alert.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {alert.message}
          </p>
          <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-gray-700 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1.5">📋 Système de tarification par abonnement</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>CLIENT :</strong> Abonnement pour voir tous les revendeurs — sans abonnement = 5 revendeurs max (les plus proches)</li>
              <li>• <strong>REVENDEUR :</strong> Abonnement pour être visible sur la carte</li>
              <li>• Si désactivé : accès gratuit illimité pour tous</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('client')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base transition ${
              activeTab === 'client' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Client</span>
              {clientConfig.isActive && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('revendeur')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base transition ${
              activeTab === 'revendeur' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Store className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Revendeur</span>
              {revendeurConfig.isActive && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ══════════ TAB CLIENT ══════════ */}
      {activeTab === 'client' && (
        <div className="space-y-4 sm:space-y-6">

          {/* Stats */}
          {stats?.client && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { Icon: CreditCard,  bg: 'bg-blue-100',   color: 'text-blue-600',   label: 'Total abonnements', value: stats.client.overview?.totalPurchases || 0,  isPrice: false },
                { Icon: DollarSign,  bg: 'bg-green-100',  color: 'text-green-600',  label: 'Revenus total',      value: stats.client.overview?.totalRevenue || 0,    isPrice: true  },
                { Icon: Users,       bg: 'bg-purple-100', color: 'text-purple-600', label: 'Abonnés actifs',     value: stats.client.overview?.activeClients || 0,   isPrice: false },
                { Icon: TrendingUp,  bg: 'bg-orange-100', color: 'text-orange-600', label: "Aujourd'hui",        value: stats.client.today?.purchases || 0,          isPrice: false },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg border p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <s.Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{s.label}</p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {s.isPrice ? formatPrice(s.value) : s.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Configuration */}
          <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-5">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              Configuration — Abonnements clients
            </h2>

            {/* Toggle */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clientConfig.isActive}
                  onChange={(e) => setClientConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-gray-900 block mb-1">Activer la tarification client</span>
                  <p className="text-sm text-gray-600">
                    {clientConfig.isActive
                      ? '✅ Les clients devront s\'abonner pour voir tous les revendeurs. Sans abonnement : 3 revendeurs les plus proches seulement.'
                      : '⚪ Accès gratuit illimité — tous les revendeurs visibles pour tous'}
                  </p>
                </div>
              </label>
            </div>

            {/* Info limite */}
            {clientConfig.isActive && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Sans abonnement, les clients ne verront que les <strong>5 revendeurs les plus proches</strong> de leur adresse.
                  Avec un abonnement actif, ils accèdent à l'ensemble de la carte et aux filtres avancés.
                </p>
              </div>
            )}

            {/* Plans */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Plans disponibles</h3>
              {Object.entries(clientConfig.plans).map(([planType, plan]) => (
                <PlanRow
                  key={planType}
                  planType={planType}
                  plan={plan}
                  onUpdate={updateClientPlan}
                />
              ))}
            </div>

            {/* Aperçu */}
            {clientConfig.isActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">👁️ Ce que voient les clients</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>• <strong>Sans abonnement :</strong> 3 revendeurs les plus proches, filtres verrouillés</p>
                  {Object.entries(clientConfig.plans)
                    .filter(([, p]) => p.enabled)
                    .map(([key, p]) => (
                      <p key={key}>• <strong>Plan {planLabels[key]} ({formatPrice(p.price)}) :</strong> tous les revendeurs + filtres débloqués pendant {p.duration} jours</p>
                    ))}
                </div>
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={handleSaveClient}
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Enregistrement…</>
                : <><Save className="h-5 w-5" /> Enregistrer la configuration client</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ══════════ TAB REVENDEUR ══════════ */}
      {activeTab === 'revendeur' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              Configuration — Abonnements revendeurs
            </h2>

            {/* Toggle */}
            <div className="mb-5 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revendeurConfig.isActive}
                  onChange={(e) => setRevendeurConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 text-orange-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-gray-900 block mb-1">Activer la tarification revendeur</span>
                  <p className="text-sm text-gray-600">
                    {revendeurConfig.isActive
                      ? '✅ Les revendeurs devront s\'abonner pour être visibles sur la carte'
                      : '⚪ Visibilité gratuite illimitée pour tous les revendeurs'}
                  </p>
                </div>
              </label>
            </div>

            {/* Jours gratuits — non modifiable */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">🎁 Jours gratuits (nouveaux revendeurs)</label>
              <input
                type="number" value={0} readOnly disabled
                className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Aucun jour gratuit (non modifiable)</p>
            </div>

            {/* Plans */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Plans disponibles</h3>
              {Object.entries(revendeurConfig.plans).map(([planType, plan]) => (
                <PlanRow
                  key={planType}
                  planType={planType}
                  plan={plan}
                  onUpdate={updateRevendeurPlan}
                />
              ))}
            </div>

            {/* Bouton */}
            <button
              onClick={handleSaveRevendeur}
              disabled={saving}
              className="mt-6 w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium transition flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Enregistrement…</>
                : <><Save className="h-5 w-5" /> Enregistrer la configuration revendeur</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPricing;