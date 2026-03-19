// ==========================================
// FICHIER: src/components/common/PushNotificationGate.jsx
// ✅ FIX: Ne plus auto-déclencher la boîte navigateur côté client
//         → afficher d'abord l'écran de présentation
//         → l'auto-trigger reste uniquement pour le vendeur
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing, ShieldAlert, Package, ShoppingBag,
  AlertTriangle, CheckCircle2, Settings, RefreshCw, Loader2,
  MapPin, CreditCard, Truck,
} from 'lucide-react';
import logo from '../../assets/logo_gazbf.png';
import usePushNotifications from '../../hooks/usePushNotifications';

const REASONS_BY_ROLE = {
  seller: [
    {
      icon:  ShoppingBag,
      color: 'text-red-500',
      bg:    'bg-red-50',
      title: 'Nouvelles commandes',
      desc:  "Alerté instantanément dès qu'un client passe commande.",
    },
    {
      icon:  Package,
      color: 'text-orange-500',
      bg:    'bg-orange-50',
      title: 'Alertes de stock',
      desc:  'Rupture ou stock faible : ne soyez jamais pris au dépourvu.',
    },
    {
      icon:  AlertTriangle,
      color: 'text-yellow-500',
      bg:    'bg-yellow-50',
      title: 'Expiration de commande',
      desc:  'Évitez les annulations automatiques par manque de réponse.',
    },
  ],
  client: [
    {
      icon:  Truck,
      color: 'text-blue-500',
      bg:    'bg-blue-50',
      title: 'Suivi de vos commandes',
      desc:  'Acceptation, refus ou livraison : suivez chaque étape en temps réel.',
    },
    {
      icon:  MapPin,
      color: 'text-green-500',
      bg:    'bg-green-50',
      title: 'Dépôts à proximité',
      desc:  'Un revendeur proche a du gaz disponible ? Soyez le premier informé.',
    },
    {
      icon:  CreditCard,
      color: 'text-purple-500',
      bg:    'bg-purple-50',
      title: 'Confirmations de paiement',
      desc:  'Recevez immédiatement la confirmation après chaque transaction.',
    },
  ],
};

const TITLES_BY_ROLE = {
  seller: {
    heading:        'Activez les notifications',
    sub:            'pour continuer',
    hint:           'Les notifications sont obligatoires pour gérer vos commandes en temps réel.',
    hintActivating: "📲 Une boîte de dialogue va apparaître. Cliquez sur « Autoriser ».",
  },
  client: {
    heading:        'Restez informé',
    sub:            'de vos commandes',
    hint:           'Activez les notifications pour suivre vos commandes en temps réel.',
    hintActivating: "📲 Une boîte de dialogue va apparaître. Cliquez sur « Autoriser ».",
  },
};

const PushNotificationGate = ({ children, role = 'seller' }) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  const [activating, setActivating]         = useState(false);
  const [success, setSuccess]               = useState(false);
  const [dismissed, setDismissed]           = useState(false);
  const [autoRequested, setAutoRequested]   = useState(false);

  const isClient = role === 'client';
  const reasons  = REASONS_BY_ROLE[role] ?? REASONS_BY_ROLE.seller;
  const titles   = TITLES_BY_ROLE[role]  ?? TITLES_BY_ROLE.seller;

  // ✅ handleActivate déclaré en useCallback pour éviter les stale closures
  const handleActivate = useCallback(async () => {
    setActivating(true);
    const ok = await subscribe();
    setActivating(false);
    if (ok) setSuccess(true);
  }, [subscribe]);

  const handleDismiss = () => setDismissed(true);

  // ✅ Auto-trigger uniquement pour le VENDEUR
  //    Le client voit d'abord l'écran, puis clique lui-même sur le bouton
  useEffect(() => {
    if (isClient) return; // ← Pas d'auto-trigger côté client

    const canAutoRequest =
      isSupported        &&
      !isSubscribed      &&
      permission === 'default' &&
      !autoRequested     &&
      !activating;

    if (!canAutoRequest) return;
    setAutoRequested(true);
    const timer = setTimeout(() => handleActivate(), 900);
    return () => clearTimeout(timer);
  }, [isClient, isSupported, isSubscribed, permission, autoRequested, activating, handleActivate]);

  // ── Accès direct : déjà abonné, non supporté, ou dismissed (client) ──
  if (!isSupported || isSubscribed || success || (isClient && dismissed)) {
    return <>{children}</>;
  }

  // ── Client : permission refusée → non bloquant, on laisse passer ──
  if (isClient && permission === 'denied') {
    return <>{children}</>;
  }

  // ── Vendeur : permission refusée → bloquant ──
  if (!isClient && permission === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Notifications bloquées
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Vous avez bloqué les notifications dans votre navigateur.
                FasoGaz ne peut plus les demander automatiquement.
                Vous devez les autoriser manuellement pour continuer.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-6 space-y-4">
                <p className="font-bold text-sm text-amber-800 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Comment débloquer les notifications :
                </p>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">📱 Chrome Android</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Appuyez sur 🔒 dans la barre d'adresse → <em>Autorisations</em> → <em>Notifications</em> → <strong>Autoriser</strong>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">🍎 Safari iOS (≥ 16.4)</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Réglages iPhone → <em>Applications</em> → <em>Safari</em> → <em>Notifications</em> → <strong>Autoriser</strong>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">💻 Chrome Bureau</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Cliquez sur 🔒 → <em>Paramètres du site</em> → <em>Notifications</em> → <strong>Autoriser</strong>
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                J'ai autorisé — Recharger la page
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Sans notifications, vous ne pouvez pas gérer vos commandes en temps réel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran principal (permission 'default') ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1.2s' }}
        />
      </div>

      <div className="relative max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-600 via-yellow-400 to-green-600" />
          <div className="p-7">

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-primary-100 shadow-lg">
                  <img src={logo} alt="FasoGaz" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                  <BellRing className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight">
                {titles.heading}<br />
                <span className="text-primary-600">{titles.sub}</span>
              </h2>
              <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
                {activating || isLoading ? titles.hintActivating : titles.hint}
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {reasons.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 ${r.bg} rounded-xl`}>
                  <r.icon className={`h-5 w-5 ${r.color} flex-shrink-0`} />
                  <div>
                    <p className="font-bold text-sm text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {success ? (
              <div className="flex items-center justify-center gap-3 py-4 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="font-bold text-green-700">Notifications activées !</span>
              </div>
            ) : (
              <button
                onClick={handleActivate}
                disabled={activating || isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-extrabold text-base hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {activating || isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cliquez sur « Autoriser »…
                  </>
                ) : (
                  <>
                    <BellRing className="h-5 w-5" />
                    Activer les notifications
                  </>
                )}
              </button>
            )}

            {/* ✅ Bouton "passer" — client uniquement */}
            {isClient && !success && (
              <button
                onClick={handleDismiss}
                className="w-full mt-3 py-2.5 text-sm text-neutral-400 hover:text-neutral-600 font-medium rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Continuer sans notifications
              </button>
            )}

            <p className="text-xs text-center text-gray-400 mt-4 leading-relaxed">
              🔒 Uniquement les alertes liées à votre activité FasoGaz.<br />
              Aucune donnée personnelle partagée.
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          FasoGaz — Plateforme de livraison de gaz au Burkina Faso
        </p>
      </div>
    </div>
  );
};

export default PushNotificationGate;