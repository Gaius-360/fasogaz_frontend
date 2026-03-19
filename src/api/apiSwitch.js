// ==========================================
// FICHIER: src/api/apiSwitch.js
// ✅ CORRECTIONS originales conservées :
//    1. adminAuth.login envoie { email, password }
//    2. Redirection 401 admin → bonne URL secrète
//    3. FIX 429 : intercepteur attache error.response?.status
// ✅ NOUVEAU: refresh token silencieux
//    - Access token réduit à 15 min
//    - 401 → tente POST /auth/refresh (cookie httpOnly envoyé auto)
//    - Si refresh OK → relance la requête originale de façon transparente
//    - File d'attente pour les requêtes parallèles pendant le refresh
//    - withCredentials: true pour que les cookies soient transmis
// ==========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================
// INSTANCES AXIOS
// ============================================

const userApi = axios.create({
  baseURL:         API_URL,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true, // ✅ OBLIGATOIRE — envoie le cookie refresh_token à chaque requête
});

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Pas de withCredentials pour adminApi : les admins utilisent adminToken en localStorage
});

// ============================================
// ÉTAT DU REFRESH (partagé entre les requêtes)
// ============================================

/**
 * Mutex simple pour éviter plusieurs appels /auth/refresh simultanés.
 * Si 5 requêtes arrivent en parallèle avec un token expiré, une seule
 * lance le refresh — les 4 autres attendent dans failedQueue puis
 * sont relancées automatiquement avec le nouveau token.
 */
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

// ============================================
// INTERCEPTEURS — TOKENS (requêtes sortantes)
// ============================================

userApi.interceptors.request.use(
  (config) => {
    const agentToken = localStorage.getItem('agentToken');
    const token      = localStorage.getItem('token');
    const authToken  = agentToken || token;
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// INTERCEPTEURS — ERREURS (réponses entrantes)
// ============================================

userApi.interceptors.response.use(
  // Succès → unwrap response.data (comportement original conservé)
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    // ─────────────────────────────────────────
    // CAS 401 : token expiré → tenter le refresh
    // ─────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Cas particulier : la route /auth/refresh elle-même a répondu 401
      // → le refresh token est invalide/expiré → vraie déconnexion
      if (originalRequest.url?.includes('/auth/refresh')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Si un refresh est déjà en cours, mettre cette requête en file d'attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return userApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Marquer : on est en train de rafraîchir
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Le cookie refresh_token est transmis automatiquement (withCredentials: true)
        const refreshResponse = await userApi.post('/auth/refresh');

        // refreshResponse est déjà unwrappé (notre intercepteur succès retourne response.data)
        const newToken = refreshResponse.token;

        if (!newToken) throw new Error('Pas de token dans la réponse refresh');

        // Sauvegarder le nouveau token
        localStorage.setItem('token', newToken);

        // Mettre à jour le header par défaut pour les prochaines requêtes
        userApi.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        // Débloquer toutes les requêtes en attente
        processQueue(null, newToken);

        // Relancer la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return userApi(originalRequest);

      } catch (refreshError) {
        // Refresh échoué → déconnecter proprement
        processQueue(refreshError, null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');

        // Redirection selon le type de token présent avant déconnexion
        const hadAgentToken = !!localStorage.getItem('agentToken');
        window.location.href = hadAgentToken
          ? '/secure/agent/7h3k9m2p5n8q/login'
          : '/login';

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // ─────────────────────────────────────────
    // CAS 401 sur une route sans retry possible
    // (ex: _retry déjà true → boucle évitée)
    // ─────────────────────────────────────────
    if (error.response?.status === 401 && originalRequest._retry) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ─────────────────────────────────────────
    // ✅ FIX 429 (conservé de la version originale)
    // Enrichit l'objet rejeté avec le status HTTP
    // pour que geocoding.js puisse détecter le 429
    // et ouvrir le circuit breaker correctement.
    // ─────────────────────────────────────────
    const enrichedError = error.response?.data || error;
    enrichedError.status = error.response?.status ?? enrichedError.status ?? null;

    return Promise.reject(enrichedError);
  }
);

adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      // ✅ CORRECTION originale conservée : bonne URL secrète
      window.location.href = '/secure/admin/3k9f2j8h4n7m/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ============================================
// API ENDPOINTS
// ============================================

export const api = {

  // ==========================================
  // AUTH UTILISATEUR
  // ==========================================
  auth: {
    register:               (data) => userApi.post('/auth/register', data),
    verifyOTP:              (data) => userApi.post('/auth/verify-otp', data),
    resendOTP:              (data) => userApi.post('/auth/resend-otp', data),
    login:                  (data) => userApi.post('/auth/login', data),
    // ✅ NOUVEAU — appelé automatiquement par l'intercepteur, mais exposé
    // si un composant veut forcer un refresh manuellement
    refresh:                ()     => userApi.post('/auth/refresh'),
    // ✅ NOUVEAU — déconnexion propre : efface le cookie côté serveur
    logout:                 ()     => userApi.post('/auth/logout'),
    getMe:                  ()     => userApi.get('/auth/me'),
    updateProfile:          (data) => userApi.put('/auth/update-profile', data),
    updateDeliverySettings: (data) => userApi.put('/auth/update-delivery', data),
    changePassword:         (data) => userApi.put('/auth/change-password', data),
    deleteAccount:          (data) => userApi.delete('/auth/delete-account', { data }),
  },

  // ==========================================
  // NOTIFICATIONS IN-APP
  // ==========================================
  notifications: {
    getMyNotifications:     (params) => userApi.get('/notifications', { params }),
    getUnreadCount:         ()       => userApi.get('/notifications/unread-count'),
    markAsRead:             (id)     => userApi.put(`/notifications/${id}/read`),
    markAllAsRead:          ()       => userApi.put('/notifications/mark-all-read'),
    deleteNotification:     (id)     => userApi.delete(`/notifications/${id}`),
    clearReadNotifications: ()       => userApi.delete('/notifications/clear-read'),
  },

  // ==========================================
  // PUSH NOTIFICATIONS
  // ==========================================
  push: {
    subscribe:   (data) => userApi.post('/push/subscribe', data),
    unsubscribe: (data) => userApi.delete('/push/unsubscribe', { data }),
    getStatus:   ()     => userApi.get('/push/status'),
  },

  // ==========================================
  // ACCÈS 24H (CLIENT)
  // ==========================================
  access: {
    getPricing:  ()       => userApi.get('/access/pricing'),
    checkStatus: ()       => userApi.get('/access/status'),
    purchase:    (data)   => userApi.post('/access/purchase', data),
    getHistory:  (params) => userApi.get('/access/history', { params }),
    getStats:    ()       => userApi.get('/access/stats'),
  },

  // ==========================================
  // PRODUCTS
  // ==========================================
  products: {
    searchProducts:    (params)     => userApi.get('/products/search', { params }),
    getSellerProducts: (sellerId)   => userApi.get(`/products/seller/${sellerId}`),
    createProduct:     (data)       => userApi.post('/products', data),
    getMyProducts:     ()           => userApi.get('/products/my-products'),
    updateProduct:     (id, data)   => userApi.put(`/products/${id}`, data),
    deleteProduct:     (id)         => userApi.delete(`/products/${id}`),
    incrementView:     (id)         => userApi.post(`/products/${id}/view`),
  },

  // ==========================================
  // ORDERS
  // ==========================================
  orders: {
    createOrder:  (data) => userApi.post('/orders', data),
    getMyOrders:  ()     => userApi.get('/orders/my-orders'),
    getOrderById: (id)   => userApi.get(`/orders/${id}`),
    cancelOrder:  (id)   => userApi.put(`/orders/${id}/cancel`),
  },

  // ==========================================
  // SUBSCRIPTIONS (REVENDEURS)
  // ==========================================
  subscriptions: {
    getPlans:           ()     => userApi.get('/subscriptions/plans'),
    createSubscription: (data) => userApi.post('/subscriptions', data),
    getMySubscription:  ()     => userApi.get('/subscriptions/my-subscription'),
    earlyRenewal:       (data) => userApi.put('/subscriptions/early-renewal', data),
    deleteSubscription: ()     => userApi.delete('/subscriptions'),
    renewSubscription:  (data) => userApi.put('/subscriptions/renew', data),
  },

  // ==========================================
  // ADDRESSES
  // ==========================================
  addresses: {
    createAddress:     (data)     => userApi.post('/addresses', data),
    getMyAddresses:    ()         => userApi.get('/addresses'),
    getAddressById:    (id)       => userApi.get(`/addresses/${id}`),
    updateAddress:     (id, data) => userApi.put(`/addresses/${id}`, data),
    deleteAddress:     (id)       => userApi.delete(`/addresses/${id}`),
    setDefaultAddress: (id)       => userApi.put(`/addresses/${id}/set-default`),
  },

  // ==========================================
  // REVIEWS
  // ==========================================
  reviews: {
    createReview:       (data)             => userApi.post('/reviews', data),
    getMyReviews:       ()                 => userApi.get('/reviews/my-reviews'),
    getSellerReviews:   (sellerId, params) => userApi.get(`/reviews/seller/${sellerId}`, { params }),
    getReceivedReviews: ()                 => userApi.get('/reviews/received'),
    respondToReview:    (id, data)         => userApi.put(`/reviews/${id}/respond`, data),
  },

  // ==========================================
  // SELLER
  // ==========================================
  seller: {
    getStats:          ()         => userApi.get('/seller/stats'),
    getMyProducts:     ()         => userApi.get('/seller/products'),
    getProductsStats:  ()         => userApi.get('/seller/products/stats'),
    getReceivedOrders: (params)   => userApi.get('/seller/orders', { params }),
    getOrdersStats:    ()         => userApi.get('/seller/orders/stats'),
    acceptOrder:       (id, data) => userApi.put(`/seller/orders/${id}/accept`, data),
    rejectOrder:       (id, data) => userApi.put(`/seller/orders/${id}/reject`, data),
    completeOrder:     (id)       => userApi.put(`/seller/orders/${id}/complete`),
    getReviews:        ()         => userApi.get('/seller/reviews'),
    updateOrderStatus: (id, data) => userApi.put(`/orders/${id}/status`, data),
  },

  // ==========================================
  // ADMIN AUTH
  // ✅ CORRECTION conservée : login envoie { email, password }
  // ==========================================
  adminAuth: {
    login: (email, password) =>
      adminApi.post('/admin/auth/login', { email, password }),
    getProfile: () =>
      adminApi.get('/admin/auth/profile'),
    changePassword: (currentPassword, newPassword) =>
      adminApi.put('/admin/auth/change-password', { currentPassword, newPassword }),
  },

  // ==========================================
  // ADMIN STATS
  // ==========================================
  adminStats: {
    getDashboardStats: ()       => adminApi.get('/admin/stats/dashboard'),
    getRevenueChart:   (period) => adminApi.get('/admin/stats/revenue', { params: { period } }),
    getTopSellers:     (limit)  => adminApi.get('/admin/stats/top-sellers', { params: { limit } }),
  },

  // ==========================================
  // ADMIN — Namespace principal
  // ==========================================
  admin: {

    wallet: {
      getBalance:     ()                        => adminApi.get('/admin/wallet/balance'),
      getWithdrawals: ()                        => adminApi.get('/admin/wallet/withdrawals'),
      withdraw:       (amount, method, details) =>
        adminApi.post('/admin/wallet/withdraw', { amount, method, details }),
    },

    transactions: {
      getAll:   (params) => adminApi.get('/admin/transactions', { params }),
      getStats: (period) => adminApi.get('/admin/transactions/stats', { params: { period } }),
      validate: (id)     => adminApi.put(`/admin/transactions/${id}/validate`),
    },

    settings: {
      get:           ()     => adminApi.get('/admin/settings'),
      update:        (data) => adminApi.put('/admin/settings', data),
      getPricing:    ()     => adminApi.get('/admin/settings/pricing'),
      updatePricing: (data) => adminApi.put('/admin/settings/pricing', data),
    },

    pricing: {
      getAll:             ()       => adminApi.get('/admin/pricing'),
      updateClient:       (data)   => adminApi.put('/admin/pricing/client', data),
      updateRevendeur:    (data)   => adminApi.put('/admin/pricing/revendeur', data),
      getClientStats:     ()       => adminApi.get('/admin/pricing/client/stats'),
      getClientPurchases: (params) => adminApi.get('/admin/pricing/client/purchases', { params }),
    },

    sellers: {
      getAll:        (params)          => adminApi.get('/admin/sellers', { params }),
      getById:       (id)              => adminApi.get(`/admin/sellers/${id}`),
      getPending:    ()                => adminApi.get('/admin/sellers/pending'),
      validate:      (id, message)     => adminApi.put(`/admin/sellers/${id}/validate`, { message }),
      reject:        (id, reason, msg) => adminApi.put(`/admin/sellers/${id}/reject`, { reason, message: msg }),
      suspend:       (id, reason, dur) => adminApi.put(`/admin/sellers/${id}/suspend`, { reason, duration: dur }),
      reactivate:    (id)              => adminApi.put(`/admin/sellers/${id}/reactivate`),
      delete:        (id)              => adminApi.delete(`/admin/sellers/${id}`),
      resetPassword: (id, newPassword) => adminApi.put(`/admin/users/${id}/reset-password`, { newPassword }),
    },

    clients: {
      getAll:        (params)          => adminApi.get('/admin/clients', { params }),
      getById:       (id)              => adminApi.get(`/admin/clients/${id}`),
      block:         (id, reason)      => adminApi.put(`/admin/clients/${id}/block`, { reason }),
      unblock:       (id)              => adminApi.put(`/admin/clients/${id}/unblock`),
      delete:        (id)              => adminApi.delete(`/admin/clients/${id}`),
      resetPassword: (id, newPassword) => adminApi.put(`/admin/users/${id}/reset-password`, { newPassword }),
    },

    agents: {
      getAll:         (params)   => adminApi.get('/admin/agents', { params }),
      getById:        (id)       => adminApi.get(`/admin/agents/${id}`),
      create:         (data)     => adminApi.post('/admin/agents', data),
      update:         (id, data) => adminApi.put(`/admin/agents/${id}`, data),
      toggleStatus:   (id)       => adminApi.put(`/admin/agents/${id}/toggle-status`),
      delete:         (id)       => adminApi.delete(`/admin/agents/${id}`),
      regenerateCode: (id)       => adminApi.put(`/admin/agents/${id}/regenerate-code`),
    },
  },

  // ==========================================
  // AGENT AUTH
  // ==========================================
  agentAuth: {
    login:         (agentCode) => userApi.post('/agent/auth/login', { agentCode }),
    verifyCode:    (agentCode) => userApi.post('/agent/auth/verify-code', { agentCode }),
    getProfile:    ()          => userApi.get('/agent/auth/profile'),
    updateProfile: (data)      => userApi.put('/agent/auth/profile', data),
  },

  // ==========================================
  // PRICING — Config publique
  // ==========================================
  pricing: {
    getClientConfig:    () => userApi.get('/pricing/client'),
    getRevendeurConfig: () => userApi.get('/pricing/revendeur'),
    getAccessStatus:    () => userApi.get('/pricing/status'),
  },

  // ==========================================
  // INVITATIONS
  // ==========================================
  invitations: {
    verify: (token) => userApi.get(`/invitations/verify/${token}`),

    generate: (data) => {
      const adminToken = localStorage.getItem('adminToken');
      const agentToken = localStorage.getItem('agentToken');
      if (adminToken) return adminApi.post('/invitations/generate', data);
      if (agentToken) return userApi.post('/invitations/generate', data);
      return Promise.reject({ message: 'Non authentifié' });
    },

    getMyInvitations: (params) => {
      const adminToken = localStorage.getItem('adminToken');
      const agentToken = localStorage.getItem('agentToken');
      if (adminToken) return adminApi.get('/invitations/my-invitations', { params });
      if (agentToken) return userApi.get('/invitations/my-invitations', { params });
      return Promise.reject({ message: 'Non authentifié' });
    },

    revoke:   (id, reason) => adminApi.put(`/invitations/${id}/revoke`, { reason }),
    getStats: (period)     => adminApi.get('/invitations/stats', { params: { period } }),
  },

  // ==========================================
  // PAIEMENTS LIGDICASH
  // ==========================================
  payments: {
    initiatePayment: (data)              => userApi.post('/payments/initiate', data),
    checkStatus:     (transactionNumber) => userApi.get(`/payments/status/${transactionNumber}`),
    handleCallback:  (data)              => userApi.post('/payments/ligdicash/callback', data),
  },
};

export default userApi;