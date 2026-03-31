// ==========================================
// FICHIER: src/components/layout/ClientLayout.jsx
// ✅ AJOUT: useNavBadges + NavBadgeBorder sur tous les onglets
// ✅ AJOUT: PushNotificationGate role="client" (non bloquant)
// ✅ AJOUT: NotificationBell desktop + mobile
// ✅ FIX: logo avec skeleton + fallback (LogoImage)
// ==========================================
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Map, ShoppingBag, User, CreditCard, Star,
  X, Settings, Phone, ArrowLeftRight
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useNavBadges from '../../hooks/useNavBadges';
import LogoImage, { FasoGazWordmark } from '../common/LogoImage';
import NotificationBell from '../common/NotificationBell';
import NavBadgeBorder from '../common/NavBadgeBorder';
import PushNotificationGate from '../common/PushNotificationGate';

const ClientLayout = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { badges, clearBadge } = useNavBadges();

  const navItems = [
    { to: '/client/map',             icon: Map,        label: 'Carte',     navKey: 'map'             },
    { to: '/client/orders',          icon: ShoppingBag, label: 'Commandes', navKey: 'orders'          },
    { to: '/client/my-reviews',      icon: Star,        label: 'Avis',      navKey: 'reviews'         },
    { to: '/client/payment-history', icon: CreditCard,  label: 'Paiements', navKey: 'payment-history' },
    { to: '/client/profile',         icon: User,        label: 'Profil',    navKey: null              },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── HEADER ── */}
      <header className="bg-white shadow-md border-b-4 border-gradient-gazbf sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Logo */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
              onClick={() => navigate('/client/map')}
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden ring-2 ring-primary-200 group-hover:ring-primary-400 transition-all">
                <LogoImage
                  src="/logo_gazbf.png"
                  alt="GAZBF Logo"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  wrapperClass="w-full h-full"
                  skeletonClass="rounded-lg"
                  fallbackText="FG"
                />
              </div>
              <div>
                <FasoGazWordmark textSize="text-base sm:text-xl" />
                <p className="text-[10px] sm:text-xs text-neutral-600 hidden sm:block font-medium">
                  Gaz au Burkina Faso
                </p>
              </div>
            </div>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                const count    = item.navKey ? (badges[item.navKey] || 0) : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => item.navKey && clearBadge(item.navKey)}
                    className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all text-xs lg:text-sm font-medium
                      ${isActive
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-gazbf'
                        : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                      }`}
                  >
                    <NavBadgeBorder count={count} seller={false}>
                      <item.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                    </NavBadgeBorder>
                    <span className="hidden lg:inline">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Actions Desktop */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <NotificationBell />

              <button
                onClick={() => navigate('/client/settings')}
                className="p-2 text-neutral-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                title="Paramètres"
              >
                <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
              </button>

              <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-3 border-l-2 border-neutral-200">
                <div className="text-right hidden lg:block">
                  <p className="text-xs lg:text-sm font-bold text-neutral-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] lg:text-xs text-neutral-600">{user?.phone}</p>
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-2 ring-primary-200">
                  <span className="text-xs lg:text-sm font-bold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Retour à la connexion"
              >
                <ArrowLeftRight className="h-4 w-4 lg:h-5 lg:w-5" />
              </button>
            </div>

            {/* Actions Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationBell />

              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="relative"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-2 ring-primary-300 hover:ring-primary-400 transition-all">
                  <span className="text-sm font-bold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Menu profil mobile */}
          {showProfileMenu && (
            <>
              <div
                className="md:hidden fixed inset-0 bg-black/30 z-40 animate-fade-in"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="md:hidden absolute top-16 right-3 w-80 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl z-50 animate-slide-down border-2 border-primary-200">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-neutral-100">
                    <h3 className="text-lg font-bold text-gray-900">Mon Profil</h3>
                    <button
                      onClick={() => setShowProfileMenu(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
                        <span className="text-xl font-bold text-white">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900 truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user?.phone}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-primary-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Ville</p>
                        <p className="text-sm font-semibold text-gray-900">{user?.city || 'N/A'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Statut</p>
                        <p className="text-sm font-semibold text-green-600">Actif</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => { navigate('/client/profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors font-medium"
                    >
                      <User className="h-5 w-5" /><span>Modifier le profil</span>
                    </button>
                    <button
                      onClick={() => { navigate('/client/settings'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors font-medium"
                    >
                      <Settings className="h-5 w-5" /><span>Paramètres</span>
                    </button>
                    <div className="pt-3 mt-1 border-t border-neutral-100">
                      <button
                        onClick={() => { navigate('/login'); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 rounded-xl transition-colors font-medium"
                      >
                        <ArrowLeftRight className="h-5 w-5" /><span>Retour à la connexion</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <style>{`
        @keyframes slide-down { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>

      {/* ── PushNotificationGate client (non bloquant) + contenu ── */}
      <PushNotificationGate role="client">

        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* ── Navigation mobile bottom ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 shadow-lg z-50">
          <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5 safe-area-inset-bottom">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              const count    = item.navKey ? (badges[item.navKey] || 0) : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => item.navKey && clearBadge(item.navKey)}
                  className="flex flex-col items-center justify-center py-1.5 rounded-lg transition-all touch-manipulation"
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-gradient-to-br from-primary-500 to-secondary-500' : ''}`}>
                    <NavBadgeBorder count={count} seller={false}>
                      <item.icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                    </NavBadgeBorder>
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-primary-600' : 'text-neutral-500'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>

      </PushNotificationGate>
    </div>
  );
};

export default ClientLayout;