// ==========================================
// FICHIER: src/api/axios.js
// ✅ VERSION FINALE
//    - Token correct selon le rôle actif (admin / agent / client)
//    - Redirection vers la bonne page de login en cas de 401
//    - Détection backend indisponible (ERR_NETWORK) sans retry inutile
//    - Flag isBackendDown pour éviter les cascades d'erreurs réseau
// ==========================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Timeout raisonnable : Render free tier peut mettre ~30s à démarrer
  timeout: 35000,
});

// ==========================================
// ÉTAT INTERNE : backend disponible ou non
// Réinitialisé dès qu'une requête réussit.
// ==========================================
let isBackendDown   = false;
let backendDownSince = null;
const BACKEND_DOWN_RESET_MS = 60_000; // réessayer après 1 min

/**
 * Marque le backend comme down et programme une tentative de réveil.
 * Render free tier : cold start ~30–60s → on retente après 1 min.
 */
function markBackendDown() {
  if (!isBackendDown) {
    isBackendDown    = true;
    backendDownSince = Date.now();
    console.warn('⚠️ Backend injoignable — les requêtes seront suspendues 1 min.');

    setTimeout(() => {
      isBackendDown    = false;
      backendDownSince = null;
      console.log('🔄 Réessai backend autorisé.');
    }, BACKEND_DOWN_RESET_MS);
  }
}

/**
 * Ping léger vers /api/health pour vérifier si le backend est vivant.
 * Utilisé au démarrage de l'app pour déclencher le cold start Render.
 */
export const pingBackend = async () => {
  try {
    const healthUrl = API_URL.replace(/\/api\/?$/, '') + '/api/health';
    await axios.get(healthUrl, { timeout: 40_000 });
    isBackendDown = false;
    console.log('✅ Backend joignable');
    return true;
  } catch {
    markBackendDown();
    return false;
  }
};

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
// INTERCEPTEUR REQUEST
// - Injecte le token Bearer
// - Bloque les requêtes si le backend est connu comme down
//   (évite les cascades d'erreurs et les retries inutiles)
// ==========================================
api.interceptors.request.use(
  (config) => {
    // Routes qui doivent toujours passer même si isBackendDown
    // (ex : health check, ping de réveil)
    const isHealthCheck = config.url?.includes('/health');

    if (isBackendDown && !isHealthCheck) {
      const elapsed = Date.now() - (backendDownSince || 0);
      const remaining = Math.max(0, Math.round((BACKEND_DOWN_RESET_MS - elapsed) / 1000));
      return Promise.reject(
        Object.assign(new Error(`Backend indisponible. Réessai dans ~${remaining}s.`), {
          code:           'BACKEND_DOWN',
          isBackendDown:  true,
        })
      );
    }

    const token = getActiveToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// INTERCEPTEUR RESPONSE
// - Marque le backend comme disponible sur succès
// - Détecte les erreurs réseau (ERR_NETWORK, ERR_NAME_NOT_RESOLVED)
//   et marque le backend comme down pour éviter les cascades
// - Gère les 401 avec redirection vers la bonne page de login
// ==========================================
api.interceptors.response.use(
  (response) => {
    // Requête réussie → backend vivant
    if (isBackendDown) {
      isBackendDown    = false;
      backendDownSince = null;
      console.log('✅ Backend de nouveau joignable');
    }
    return response;
  },
  (error) => {
    // ── Erreur réseau (backend down, DNS, CORS bloqué, timeout Render) ──
    const isNetworkError =
      error.code === 'ERR_NETWORK'            ||
      error.code === 'ERR_NAME_NOT_RESOLVED'  ||
      error.code === 'ECONNABORTED'           || // timeout axios
      (!error.response && error.request);        // requête partie, pas de réponse

    if (isNetworkError && !error.config?.url?.includes('/health')) {
      markBackendDown();
      // On enrichit l'erreur pour que les appelants puissent adapter leur UX
      error.isNetworkError = true;
      error.userMessage    =
        'Serveur temporairement indisponible. Vérifiez votre connexion ou réessayez dans quelques instants.';
      return Promise.reject(error);
    }

    // ── 401 : token expiré ou invalide ──────────────────────────────────
    if (error.response?.status === 401) {
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