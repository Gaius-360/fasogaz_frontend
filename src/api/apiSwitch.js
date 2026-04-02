// ==========================================
// FICHIER: src/api/apiSwitch.js
// ✅ Refresh token envoyé dans le body (pas de cookie)
//    → fiable en cross-domain (fasogaz.onrender.com / fasogaz-backend.onrender.com)
// ✅ CORRECTION BUG 2: lecture de refreshResponse.data.token
//    (ResponseHandler.success enveloppe les données dans .data)
// ==========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================
// INSTANCES AXIOS
// ============================================

const userApi = axios.create({
  baseURL:         API_URL,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: false,
});

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================
// ÉTAT DU REFRESH
// ============================================

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
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {

      // La route /auth/refresh elle-même a échoué → vraie déconnexion
      if (originalRequest.url?.includes('/auth/refresh')) {
        const hadAgentToken = !!localStorage.getItem('agentToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        localStorage.removeItem('refreshToken');
        window.location.href = hadAgentToken
          ? '/secure/agent/7h3k9m2p5n8q/login'
          : '/login';
        return Promise.reject(error);
      }

      // Refresh déjà en cours → file d'attente
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

      originalRequest._retry = true;
      isRefreshing = true;

      // ✅ Lire AVANT toute suppression
      const hadAgentToken = !!localStorage.getItem('agentToken');
      const refreshToken  = localStorage.getItem('refreshToken');

      // Pas de refresh token → déconnexion directe sans appel réseau
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        isRefreshing = false;
        window.location.href = hadAgentToken
          ? '/secure/agent/7h3k9m2p5n8q/login'
          : '/login';
        return Promise.reject(error);
      }

      try {
        // ✅ Refresh token envoyé dans le body
        // L'intercepteur retourne déjà response.data (la couche axios est strippée),
        // donc on reçoit directement { success, message, data: { token, refreshToken, user } }
        // tel que retourné par ResponseHandler.success côté backend.
        const refreshResponse = await userApi.post('/auth/refresh', { refreshToken });

        // ✅ CORRECTION BUG 2 : ResponseHandler.success enveloppe dans .data
        // refreshResponse = { success: true, data: { token, refreshToken, user } }
        const payload         = refreshResponse?.data || refreshResponse;
        const newAccessToken  = payload?.token;
        const newRefreshToken = payload?.refreshToken;

        if (!newAccessToken) throw new Error('Pas de token dans la réponse refresh');

        // Sauvegarder les nouveaux tokens
        if (hadAgentToken) {
          localStorage.setItem('agentToken', newAccessToken);
        } else {
          localStorage.setItem('token', newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        userApi.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return userApi(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        localStorage.removeItem('refreshToken');

        window.location.href = hadAgentToken
          ? '/secure/agent/7h3k9m2p5n8q/login'
          : '/login';

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // 401 après retry → déconnexion
    if (error.response?.status === 401 && originalRequest._retry) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ✅ FIX 429
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
      window.location.href = '/secure/admin/3k9f2j8h4n7m/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ============================================
// API ENDPOINTS
// ============================================

export const api = {

  auth: {
    register:               (data) => userApi.post('/auth/register', data),
    verifyOTP:              (data) => userApi.post('/auth/verify-otp', data),
    resendOTP:              (data) => userApi.post('/auth/resend-otp', data),
    login:                  (data) => userApi.post('/auth/login', data),
    // ✅ Refresh manuel — l'intercepteur l'appelle automatiquement sur 401
    refresh:                (refreshToken) => userApi.post('/auth/refresh', { refreshToken }),
    logout:                 ()     => userApi.post('/auth/logout'),
    getMe:                  ()     => userApi.get('/auth/me'),
    updateProfile:          (data) => userApi.put('/auth/update-profile', data),
    updateDeliverySettings: (data) => userApi.put('/auth/update-delivery', data),
    changePassword:         (data) => userApi.put('/auth/change-password', data),
    deleteAccount:          (data) => userApi.delete('/auth/delete-account', { data }),
  },

  notifications: {
    getMyNotifications:     (params) => userApi.get('/notifications', { params }),
    getUnreadCount:         ()       => userApi.get('/notifications/unread-count'),
    markAsRead:             (id)     => userApi.put(`/notifications/${id}/read`),
    markAllAsRead:          ()       => userApi.put('/notifications/mark-all-read'),
    deleteNotification:     (id)     => userApi.delete(`/notifications/${id}`),
    clearReadNotifications: ()       => userApi.delete('/notifications/clear-read'),
  },

  push: {
    subscribe:   (data) => userApi.post('/push/subscribe', data),
    unsubscribe: (data) => userApi.delete('/push/unsubscribe', { data }),
    getStatus:   ()     => userApi.get('/push/status'),
  },

  access: {
    getPricing:  ()       => userApi.get('/access/pricing'),
    checkStatus: ()       => userApi.get('/access/status'),
    purchase:    (data)   => userApi.post('/access/purchase', data),
    getHistory:  (params) => userApi.get('/access/history', { params }),
    getStats:    ()       => userApi.get('/access/stats'),
  },

  products: {
    searchProducts:    (params)     => userApi.get('/products/search', { params }),
    getSellerProducts: (sellerId)   => userApi.get(`/products/seller/${sellerId}`),
    createProduct:     (data)       => userApi.post('/products', data),
    getMyProducts:     ()           => userApi.get('/products/my-products'),
    updateProduct:     (id, data)   => userApi.put(`/products/${id}`, data),
    deleteProduct:     (id)         => userApi.delete(`/products/${id}`),
    incrementView:     (id)         => userApi.post(`/products/${id}/view`),
  },

  orders: {
    createOrder:  (data) => userApi.post('/orders', data),
    getMyOrders:  ()     => userApi.get('/orders/my-orders'),
    getOrderById: (id)   => userApi.get(`/orders/${id}`),
    cancelOrder:  (id)   => userApi.put(`/orders/${id}/cancel`),
  },

  subscriptions: {
    getPlans:           ()     => userApi.get('/subscriptions/plans'),
    createSubscription: (data) => userApi.post('/subscriptions', data),
    getMySubscription:  ()     => userApi.get('/subscriptions/my-subscription'),
    earlyRenewal:       (data) => userApi.put('/subscriptions/early-renewal', data),
    deleteSubscription: ()     => userApi.delete('/subscriptions'),
    renewSubscription:  (data) => userApi.put('/subscriptions/renew', data),
  },

  addresses: {
    createAddress:     (data)     => userApi.post('/addresses', data),
    getMyAddresses:    ()         => userApi.get('/addresses'),
    getAddressById:    (id)       => userApi.get(`/addresses/${id}`),
    updateAddress:     (id, data) => userApi.put(`/addresses/${id}`, data),
    deleteAddress:     (id)       => userApi.delete(`/addresses/${id}`),
    setDefaultAddress: (id)       => userApi.put(`/addresses/${id}/set-default`),
  },

  reviews: {
    createReview:       (data)             => userApi.post('/reviews', data),
    getMyReviews:       ()                 => userApi.get('/reviews/my-reviews'),
    getSellerReviews:   (sellerId, params) => userApi.get(`/reviews/seller/${sellerId}`, { params }),
    getReceivedReviews: ()                 => userApi.get('/reviews/received'),
    respondToReview:    (id, data)         => userApi.put(`/reviews/${id}/respond`, data),
  },

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

  adminAuth: {
    login: (email, password) =>
      adminApi.post('/admin/auth/login', { email, password }),
    getProfile: () =>
      adminApi.get('/admin/auth/profile'),
    changePassword: (currentPassword, newPassword) =>
      adminApi.put('/admin/auth/change-password', { currentPassword, newPassword }),
  },

  adminStats: {
    getDashboardStats: ()       => adminApi.get('/admin/stats/dashboard'),
    getRevenueChart:   (period) => adminApi.get('/admin/stats/revenue', { params: { period } }),
    getTopSellers:     (limit)  => adminApi.get('/admin/stats/top-sellers', { params: { limit } }),
  },

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

  agentAuth: {
    login:         (agentCode) => userApi.post('/agent/auth/login', { agentCode }),
    verifyCode:    (agentCode) => userApi.post('/agent/auth/verify-code', { agentCode }),
    getProfile:    ()          => userApi.get('/agent/auth/profile'),
    updateProfile: (data)      => userApi.put('/agent/auth/profile', data),
  },

  pricing: {
    getClientConfig:    () => userApi.get('/pricing/client'),
    getRevendeurConfig: () => userApi.get('/pricing/revendeur'),
    getAccessStatus:    () => userApi.get('/pricing/status'),
  },

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

  payments: {
    initiatePayment: (data)              => userApi.post('/payments/initiate', data),
    checkStatus:     (transactionNumber) => userApi.get(`/payments/status/${transactionNumber}`),
    handleCallback:  (data)              => userApi.post('/payments/ligdicash/callback', data),
  },
};

export default userApi;