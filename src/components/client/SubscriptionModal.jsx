// ==========================================
// FICHIER: src/components/client/SubscriptionModal.jsx
// ✅ NOUVEAU: Remplace AccessPurchaseModal
//    Affiche les plans d'abonnement, initie le paiement via LigdiCash
// ✅ FIX MOBILE: même pattern que ProductFormModal
//    - mb-[60px] sm:mb-0 pour ne pas passer sous la bottom nav
//    - CSS Grid 3 rows: header(auto) / scroll(1fr) / footer(auto)
//    - minHeight:0 sur la zone scroll (obligatoire pour que 1fr scroll)
//    - footer toujours visible, jamais caché par la nav ni le clavier
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Crown, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { api } from '../../api/apiSwitch';
import { usePayment } from '../../hooks/usePayment';

const PLAN_META = {
  weekly:    { label: 'Hebdomadaire', icon: '📅', highlight: false },
  monthly:   { label: 'Mensuel',      icon: '⭐', highlight: true  },
  quarterly: { label: 'Trimestriel',  icon: '🔥', highlight: false },
  yearly:    { label: 'Annuel',       icon: '👑', highlight: false },
};

const SubscriptionModal = ({ onClose, onSuccess, hiddenCount = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans]     = useState({});
  const [selected, setSelected] = useState(null);
  const modalRef = useRef();

  const { loading: paymentLoading, error: paymentError, initiatePayment, clearError } = usePayment();

  useEffect(() => { loadPricing(); }, []);

  const loadPricing = async () => {
    try {
      const response = await api.access.getPricing();
      if (response?.success && response.data?.plans) {
        const enabledPlans = Object.fromEntries(
          Object.entries(response.data.plans).filter(([, p]) => p.enabled)
        );
        setPlans(enabledPlans);
        if (enabledPlans.monthly)                        setSelected('monthly');
        else if (Object.keys(enabledPlans).length > 0)  setSelected(Object.keys(enabledPlans)[0]);
      }
    } catch (err) {
      console.error('Erreur chargement plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selected || !plans[selected]) return;
    clearError();
    try {
      await initiatePayment(plans[selected].price, 'client_subscription', { planType: selected });
    } catch {
      // L'erreur est gérée par usePayment
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(price);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const isSimulationMode = import.meta.env.VITE_LIGDICASH_SIMULATION === 'true';

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      {/*
        FIX MOBILE (même pattern que ProductFormModal) :
        - mb-[60px] sm:mb-0 : laisse la bottom nav visible en dessous
        - maxHeight: calc(90dvh - 60px) mobile / 90dvh desktop
        - CSS Grid 3 rows : header(auto) / contenu scrollable(1fr) / footer(auto)
        - minHeight:0 sur la zone scroll : obligatoire pour que 1fr fonctionne
      */}
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
        style={{
          maxHeight: 'calc(90dvh - 60px)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >

        {/* ── ROW 1 : HEADER (drag handle + gradient) ── */}
        <div className="flex-shrink-0">
          {/* Drag handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header gradient */}
          <div className="px-6 pt-4 pb-5 bg-gradient-to-br from-orange-500 to-amber-500 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">Débloquer tous les revendeurs</h2>
                <p className="text-sm text-white/85">Abonnez-vous pour accéder à la carte complète</p>
              </div>
            </div>

            {hiddenCount > 0 && (
              <div className="bg-white/15 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Zap className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-semibold">
                  {hiddenCount} revendeur{hiddenCount > 1 ? 's' : ''} supplémentaire{hiddenCount > 1 ? 's' : ''} disponible{hiddenCount > 1 ? 's' : ''} près de vous
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 2 : CONTENU SCROLLABLE ── minHeight:0 obligatoire */}
        <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-4" style={{ minHeight: 0 }}>

          {/* Mode test */}
          {isSimulationMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <span className="font-bold">Mode test</span> — Aucun paiement réel ne sera effectué
              </p>
            </div>
          )}

          {/* Avantages */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-bold text-orange-900 mb-2">✅ Avec l'abonnement</p>
            <ul className="space-y-1.5">
              {[
                'Tous les revendeurs de votre ville',
                'Triés par distance depuis votre position',
                'Filtres avancés (type, marque, prix, rayon)',
                'Commandes en ligne avec tous les revendeurs'
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-orange-800">
                  <CheckCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Plans */}
          {Object.keys(plans).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">Aucun plan disponible pour le moment.</p>
              <p className="text-gray-400 text-xs mt-1">Contactez l'administrateur.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choisissez votre offre</p>
              {Object.entries(plans).map(([key, plan]) => {
                const meta       = PLAN_META[key] || { label: key, icon: '📦', highlight: false };
                const isSelected = selected === key;
                const pricePerMonth = plan.duration >= 30
                  ? Math.round(plan.price / (plan.duration / 30))
                  : null;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[.98] ${
                      isSelected
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{meta.icon}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold text-sm ${isSelected ? 'text-orange-900' : 'text-gray-800'}`}>
                          {meta.label}
                        </p>
                        {meta.highlight && (
                          <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">
                            Populaire
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.duration} jours d'accès complet</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-extrabold ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>
                        {formatPrice(plan.price)}
                      </p>
                      {pricePerMonth && (
                        <p className="text-[10px] text-gray-400">
                          ≈ {formatPrice(pricePerMonth)}/mois
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Info paiement */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-sm flex-shrink-0 mt-0.5">💳</span>
            <p className="text-xs text-blue-800">
              Paiement sécurisé via <strong>LigdiCash</strong> — Orange Money &amp; Moov Money.
              Activation immédiate après paiement confirmé.
            </p>
          </div>

          {/* Erreur paiement */}
          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{paymentError}</p>
            </div>
          )}
        </div>

        {/* ── ROW 3 : FOOTER — toujours visible, jamais caché ── */}
        <div
          className="px-6 pt-4 border-t border-gray-100 bg-white"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSubscribe}
            disabled={paymentLoading || !selected || Object.keys(plans).length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"
          >
            {paymentLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Redirection en cours...</>
            ) : (
              <><Crown className="h-5 w-5" /> S'abonner maintenant</>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-400 text-sm py-2.5 mt-1 hover:text-gray-600 active:text-gray-600 transition-colors"
          >
            Peut-être plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;