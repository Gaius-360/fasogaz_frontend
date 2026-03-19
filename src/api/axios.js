// ==========================================
// FICHIER: src/api/axios.js
// ✅ VERSION FINALE
//    - Token correct selon le rôle actif (admin / agent / client)
//    - Redirection vers la bonne page de login en cas de 401
// ==========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ==========================================
// HELPER : récupérer le token actif selon le rôle
// Priorité : admin > agent > client/revendeur
// ==========================================
const getActiveToken = () =>
  localStorage.getItem('adminToken') ||
  localStorage.getItem('agentToken') ||
  localStorage.getItem('token') ||
  null;

// ==========================================
// INTERCEPTEUR REQUEST : injecter le token
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = getActiveToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// INTERCEPTEUR RESPONSE : gérer les 401
// ==========================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Rediriger vers la bonne page selon le rôle actif
      if (localStorage.getItem('adminToken')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/secure/admin/3k9f2j8h4n7m/login';
        return Promise.reject(error);
      }

      if (localStorage.getItem('agentToken')) {
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        window.location.href = '/secure/agent/7h3k9m2p5n8q/login';
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;