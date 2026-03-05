// ==========================================
// FICHIER: src/components/layout/AdminLayout.jsx
// Layout administrateur — VERSION RESPONSIVE AVEC AGENTS
// ✅ FIX: logo avec skeleton + fallback (LogoImage)
// ==========================================
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Store, CreditCard, Wallet, Settings,
  LogOut, Menu, X, Shield, Bell, ChevronDown, DollarSign, UserCog, Link2
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAdmin from '../../hooks/useAdmin';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { getPendingSellers } = useAdmin();

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setShowUserMenu(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const response = await getPendingSellers();
        if (response?.success) setPendingCount(response.data?.length || 0);
      } catch (err) {
        console.error('Erreur chargement demandes en attente:', err);
      }
    };
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, [getPendingSellers]);

  const menuItems = [
    { path: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/sellers',      icon: Store,           label: 'Revendeurs' },
    { path: '/admin/clients',      icon: Users,           label: 'Clients' },
    { path: '/admin/agents',       icon: UserCog,         label: 'Agents' },
    { path: '/admin/invitations',  icon: Link2,           label: 'Invitations' },
    { path: '/admin/transactions', icon: CreditCard,      label: 'Transactions' },
    { path: '/admin/wallet',       icon: Wallet,          label: 'Portefeuille' },
    { path: '/admin/pricing',      icon: DollarSign,      label: 'Tarification' },
    { path: '/admin/settings',     icon: Settings,        label: 'Paramètres' },
  ];

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      navigate('/admin/login');
    }
  };

  const sidebarWidth = isMobile ? 0 : (sidebarOpen ? 256 : 80);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ═══ SIDEBAR ═══ */}
      <aside
        ref={el => {
          if (el) {
            if (isMobile) {
              el.style.transform = sidebarOpen ? 'translateX(0)' : 'translateX(-100%)';
              el.style.width = '256px';
            } else {
              el.style.transform = 'translateX(0)';
              el.style.width = sidebarOpen ? '256px' : '80px';
            }
          }
        }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 shadow-2xl transition-all duration-300 ease-in-out"
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 flex-shrink-0">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {/* ✅ FIX: Shield icon reste pour l'admin (pas de logo image ici — contexte sécurisé) */}
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">FasoGaz</h1>
                  <p className="text-xs text-gray-400 truncate">Administration</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors mx-auto">
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path === '/admin/clients'     && location.pathname.startsWith('/admin/clients')) ||
              (item.path === '/admin/sellers'     && location.pathname.startsWith('/admin/sellers')) ||
              (item.path === '/admin/agents'      && location.pathname.startsWith('/admin/agents')) ||
              (item.path === '/admin/invitations' && location.pathname.startsWith('/admin/invitations'));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
                {sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
                {!sidebarOpen && !isMobile && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-gray-700">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-700 p-3 flex-shrink-0">
          <div
            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors ${!sidebarOpen && 'justify-center'}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.firstName || user?.username || 'Admin'}</p>
                  <p className="text-xs text-gray-400 truncate">Administrateur</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </>
            )}
          </div>

          {showUserMenu && sidebarOpen && (
            <div className="mt-2 space-y-1">
              <button onClick={() => { navigate('/admin/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Shield className="w-4 h-4" /> Mon Profil
              </button>
              <button onClick={() => { navigate('/admin/settings'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-4 h-4" /> Paramètres
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col transition-all duration-300 overflow-hidden" style={{ marginLeft: sidebarWidth }}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {menuItems.find(item => location.pathname.startsWith(item.path))?.label || 'Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Bienvenue, {user?.firstName || user?.username || 'Admin'} 👋
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">{user?.username?.charAt(0).toUpperCase() || 'A'}</span>
                </div>
                <span className="hidden lg:inline text-sm font-medium text-gray-700 truncate max-w-[120px]">
                  {user?.firstName || user?.username || 'Admin'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:inline" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button onClick={() => { navigate('/admin/profile'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Shield className="w-4 h-4" /> Mon Profil
                  </button>
                  <button onClick={() => { navigate('/admin/settings'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="w-4 h-4" /> Paramètres
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                    <LogOut className="w-4 h-4" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default AdminLayout;