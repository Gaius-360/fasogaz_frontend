// ==========================================
// FICHIER: src/api/adminAuthService.js
// ✅ VERSION FINALE — Login par email (plus username)
// ==========================================

import api from './axios';

const adminAuthService = {
  // ✅ email + password (l'admin est maintenant en BDD)
  login: async (email, password) => {
    const response = await api.post('/admin/auth/login', { email, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/admin/auth/profile');
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/admin/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  }
};

export default adminAuthService;