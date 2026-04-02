// ==========================================
// FICHIER: src/App.jsx
// ✅ isInitializing lu depuis authStore
//    → spinner pendant la restauration de session
//    → plus de flash vers /login au démarrage
// ✅ CORRECTION BUG 3 PWA: refresh proactif sur visibilitychange
//    → quand l'app revient au premier plan après suspension,
//      le accessToken (1h) est rafraîchi silencieusement avant
//      que la moindre requête échoue avec 401
// ==========================================

import React, { useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { GeolocationProvider } from './contexts/GeolocationContext';

import ProtectedRoute from './components/common/ProtectedRoute';
import ProtectedAdminRoute from './components/common/ProtectedAdminRoute';
import ProtectedAgentRoute from './components/common/ProtectedAgentRoute';

// Layouts
import ClientLayout from './components/layout/ClientLayout';
import SellerLayout from './components/layout/SellerLayout';
import AdminLayout from './components/layout/AdminLayout';
import AgentLayout from './components/layout/AgentLayout';

// Pages publiques
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DevenirRevendeur from './pages/DevenirRevendeur';
import RegisterRevendeur from './pages/RegisterRevendeur';

// Pages Admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSellers from './pages/admin/AdminSellers';
import AdminSellerDetail from './pages/admin/AdminSellerDetail';
import AdminPendingSellers from './pages/admin/AdminPendingSellers';
import AdminClients from './pages/admin/AdminClients';
import AdminClientDetail from './pages/admin/AdminClientDetail';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminWallet from './pages/admin/AdminWallet';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPricing from './pages/admin/AdminPricing';
import AdminAgents from './pages/admin/AdminAgents';
import AdminInvitations from './pages/admin/AdminInvitations';

// Pages Client
import MapPage from './pages/client/MapPage';
import ClientOrders from './pages/client/OrdersPage';
import CreateOrder from './pages/client/CreateOrder';
import ClientProfile from './pages/client/Profile';
import ManageAddresses from './pages/client/ManageAddresses';
import ClientPaymentHistory from './pages/client/ClientPaymentHistory';
import ClientReviews from './pages/client/Reviews';
import ClientSettings from './pages/client/Settings';
import MyReviews from './pages/client/MyReviews';

// Pages Revendeur
import SellerDashboard from './pages/seller/Dashboard';
import SellerOrders from './pages/seller/Orders';
import Products from './pages/seller/Products';
import Customers from './pages/seller/Customers';
import SellerReviews from './pages/seller/Reviews';
import SellerProfile from './pages/seller/Profile';
import SellerSettings from './pages/seller/Settings';
import SellerSubscription from './pages/seller/Subscription';

// Pages Agent
import AgentLogin from './pages/agent/AgentLogin';
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentInvitations from './pages/agent/AgentInvitations';
import AgentProfile from './pages/agent/AgentProfile';

// ── CONFIGURATION DES ROUTES SÉCURISÉES ──────────────────────────
const ADMIN_LOGIN_PATH = import.meta.env.VITE_ADMIN_LOGIN_PATH;
const AGENT_LOGIN_PATH = import.meta.env.VITE_AGENT_LOGIN_PATH;

if (import.meta.env.DEV && (!ADMIN_LOGIN_PATH || !AGENT_LOGIN_PATH)) {
  console.error('❌ ERREUR CRITIQUE : Les routes Admin ou Agent ne sont pas définies dans le .env');
}

// ============================================
// SPINNER DE DÉMARRAGE
// Affiché pendant la restauration de session (~1ms, imperceptible)
// mais indispensable pour ne pas flasher vers /login
// ============================================
const AppLoader = () => (
  <div style={{
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100vh',
    background:     'transparent'
  }}>
    <div style={{
      width:        '36px',
      height:       '36px',
      border:       '3px solid #e5e7eb',
      borderTop:    '3px solid #f97316',
      borderRadius: '50%',
      animation:    'fg-spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes fg-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ============================================
// APP PRINCIPALE
// ============================================
function App() {
  const { isAuthenticated, isInitializing, user, initAuth, login } = useAuthStore();

  // ✅ CORRECTION BUG 3 PWA : refresh proactif au retour au premier plan
  //
  // Problème : sur mobile PWA, le système tue le processus quand l'app
  // passe en arrière-plan. Quand l'utilisateur revient, React remonte
  // depuis zéro. initAuth() restaure la session depuis localStorage,
  // mais le accessToken (1h) peut être expiré si l'app était suspendue
  // longtemps. Aucune requête API n'est lancée immédiatement, donc
  // l'intercepteur 401 ne se déclenche pas encore. Résultat : la 1ère
  // requête réelle échoue avec 401, le refresh s'exécute, mais si le
  // réseau est lent (2G, Render cold start), ça prend du temps et
  // certains composants redirigent vers /login avant que le refresh
  // n'ait fini.
  //
  // Solution : dès que l'app redevient visible, on tente un refresh
  // silencieux en arrière-plan AVANT que les composants lancent leurs
  // requêtes. Si ça réussit, le nouveau token est en place. Si ça
  // échoue (pas de réseau, refresh token expiré), l'intercepteur
  // prendra le relais normalement sur la 1ère vraie requête.
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    // On ne rafraîchit que si l'utilisateur est censé être connecté
    const hasSession =
      localStorage.getItem('token') ||
      localStorage.getItem('agentToken');
    if (!hasSession) return;

    console.log('👁 App revenue au premier plan — refresh proactif du token');

    try {
      // Import dynamique pour éviter les imports circulaires au démarrage
      const { api } = await import('./api/apiSwitch');
      const response = await api.auth.refresh(refreshToken);

      // ResponseHandler.success enveloppe dans .data
      // → response = { success, message, data: { token, refreshToken, user } }
      const payload = response?.data || response;
      const newAccessToken  = payload?.token;
      const newRefreshToken = payload?.refreshToken;
      const updatedUser     = payload?.user;

      if (!newAccessToken) {
        console.warn('⚠️ Refresh proactif : pas de token dans la réponse');
        return;
      }

      // Mettre à jour le localStorage avec les nouveaux tokens
      const hadAgentToken = !!localStorage.getItem('agentToken');
      if (hadAgentToken) {
        localStorage.setItem('agentToken', newAccessToken);
      } else {
        localStorage.setItem('token', newAccessToken);
      }
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      // Mettre à jour le store si on a les données user
      if (updatedUser) {
        login(newAccessToken, updatedUser, newRefreshToken);
      }

      console.log('✅ Refresh proactif réussi — token renouvelé silencieusement');

    } catch (err) {
      // Échec silencieux : l'intercepteur 401 prendra le relais
      // sur la prochaine requête réelle. On ne force pas /login ici
      // pour ne pas déconnecter l'utilisateur sur simple perte réseau.
      console.warn('⚠️ Refresh proactif échoué (sera retenté sur la prochaine requête) :', err?.message || err);
    }
  }, [login]);

  useEffect(() => {
    // Restauration de session (lit le localStorage, ~1ms)
    initAuth();

    // ✅ Écouter le retour au premier plan (PWA, changement d'onglet)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fermeture du splash natif PWA
    const timer = setTimeout(() => {
      if (typeof window.__FG_HIDE_SPLASH__ === 'function') {
        window.__FG_HIDE_SPLASH__();
      }
    }, 2200);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timer);
    };
  }, [initAuth, handleVisibilityChange]);

  // ✅ GARDE CRITIQUE — bloquer tout le rendu pendant la restauration
  // Sans ça : React rend les ProtectedRoute avec isAuthenticated=false
  // et redirige vers /login avant même d'avoir lu le localStorage
  if (isInitializing) {
    return <AppLoader />;
  }

  return (
    <Router>
      <GeolocationProvider>
        <Routes>

          {/* ========================================= */}
          {/* ROUTES PUBLIQUES & REDIRECTIONS           */}
          {/* ========================================= */}
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <Home />
              ) : user?.role === 'client' ? (
                <Navigate to="/client/map" replace />
              ) : user?.role === 'revendeur' ? (
                <Navigate to="/seller/dashboard" replace />
              ) : user?.role === 'admin' ? (
                <Navigate to="/admin/dashboard" replace />
              ) : user?.role === 'agent' ? (
                <Navigate to="/agent/dashboard" replace />
              ) : (
                <Home />
              )
            }
          />

          <Route path="/register"           element={<Register />} />
          <Route path="/login"              element={<Login />} />
          <Route path="/devenir-revendeur"  element={<DevenirRevendeur />} />
          <Route path="/register-revendeur" element={<RegisterRevendeur />} />

          {/* ========================================= */}
          {/* 🔐 ACCÈS SÉCURISÉS (URLs du .env)         */}
          {/* ========================================= */}
          {ADMIN_LOGIN_PATH && (
            <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
          )}
          {AGENT_LOGIN_PATH && (
            <Route path={AGENT_LOGIN_PATH} element={<AgentLogin />} />
          )}

          {/* ========================================= */}
          {/* ROUTES CLIENT (Protégées)                 */}
          {/* ========================================= */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route path="map"             element={<MapPage />} />
            <Route path="orders"          element={<ClientOrders />} />
            <Route path="order/new"       element={<CreateOrder />} />
            <Route path="profile"         element={<ClientProfile />} />
            <Route path="addresses"       element={<ManageAddresses />} />
            <Route path="my-reviews"      element={<MyReviews />} />
            <Route path="payment-history" element={<ClientPaymentHistory />} />
            <Route path="reviews"         element={<ClientReviews />} />
            <Route path="settings"        element={<ClientSettings />} />
          </Route>

          {/* ========================================= */}
          {/* ROUTES REVENDEUR (Protégées)              */}
          {/* ========================================= */}
          <Route path="/seller" element={
            <ProtectedRoute allowedRoles={['revendeur']}>
              <SellerLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard"    element={<SellerDashboard />} />
            <Route path="orders"       element={<SellerOrders />} />
            <Route path="products"     element={<Products />} />
            <Route path="customers"    element={<Customers />} />
            <Route path="reviews"      element={<SellerReviews />} />
            <Route path="profile"      element={<SellerProfile />} />
            <Route path="settings"     element={<SellerSettings />} />
            <Route path="subscription" element={<SellerSubscription />} />
          </Route>

          {/* ========================================= */}
          {/* ROUTES AGENT (Protégées)                  */}
          {/* ========================================= */}
          <Route path="/agent" element={
            <ProtectedAgentRoute>
              <AgentLayout />
            </ProtectedAgentRoute>
          }>
            <Route path="dashboard"   element={<AgentDashboard />} />
            <Route path="invitations" element={<AgentInvitations />} />
            <Route path="profile"     element={<AgentProfile />} />
          </Route>

          {/* ========================================= */}
          {/* ROUTES ADMIN (Protégées)                  */}
          {/* ========================================= */}
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }>
            <Route path="dashboard"       element={<AdminDashboard />} />
            <Route path="profile"         element={<AdminProfile />} />
            <Route path="sellers"         element={<AdminSellers />} />
            <Route path="sellers/pending" element={<AdminPendingSellers />} />
            <Route path="sellers/:id"     element={<AdminSellerDetail />} />
            <Route path="clients"         element={<AdminClients />} />
            <Route path="clients/:id"     element={<AdminClientDetail />} />
            <Route path="transactions"    element={<AdminTransactions />} />
            <Route path="wallet"          element={<AdminWallet />} />
            <Route path="pricing"         element={<AdminPricing />} />
            <Route path="settings"        element={<AdminSettings />} />
            <Route path="agents"          element={<AdminAgents />} />
            <Route path="invitations"     element={<AdminInvitations />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </GeolocationProvider>
    </Router>
  );
}

export default App;