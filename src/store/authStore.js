// ==========================================
// FICHIER: src/store/authStore.js
// ✅ isInitializing — évite le flash vers /login
// ✅ login() accepte refreshToken en 3e paramètre
// ✅ logout() supprime aussi refreshToken
// ==========================================

import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,

  login: (token, user, refreshToken) => {
    console.log('🔐 Store login appelé:', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      role: user?.role,
      userId: user?.id
    });

    if (!token || !user) {
      console.error('❌ Token ou user manquant');
      return;
    }

    if (user.role === 'admin') {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
    } else if (user.role === 'agent') {
      localStorage.setItem('agentToken', token);
      localStorage.setItem('agentUser', JSON.stringify(user));
    } else {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }

    // ✅ Sauvegarder le refresh token (sauf admin qui utilise un flux différent)
    if (refreshToken && user.role !== 'admin') {
      localStorage.setItem('refreshToken', refreshToken);
    }

    set({
      user,
      token,
      isAuthenticated: true,
      isInitializing: false
    });

    console.log('✅ Login store réussi:', { role: user.role, id: user.id });
  },

  setAuth: (user, token, refreshToken) => {
    get().login(token, user, refreshToken);
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentUser');
    localStorage.removeItem('refreshToken'); // ✅

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitializing: false
    });

    console.log('👋 Déconnexion effectuée');
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    const updatedUser = { ...currentUser, ...userData };

    if (updatedUser.role === 'admin') {
      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    } else if (updatedUser.role === 'agent') {
      localStorage.setItem('agentUser', JSON.stringify(updatedUser));
    } else {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    set({ user: updatedUser });
  },

  initAuth: () => {
    // 1. Session admin
    const adminToken = localStorage.getItem('adminToken');
    const adminUser  = localStorage.getItem('adminUser');
    if (adminToken && adminUser) {
      try {
        const user = JSON.parse(adminUser);
        set({ token: adminToken, user, isAuthenticated: true, isInitializing: false });
        console.log('🔄 Session admin restaurée:', user.username);
        return;
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }

    // 2. Session agent
    const agentToken = localStorage.getItem('agentToken');
    const agentUser  = localStorage.getItem('agentUser');
    if (agentToken && agentUser) {
      try {
        const user = JSON.parse(agentUser);
        set({ token: agentToken, user, isAuthenticated: true, isInitializing: false });
        console.log('🔄 Session agent restaurée:', user.agentCode);
        return;
      } catch {
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
      }
    }

    // 3. Session client/revendeur
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        set({ token, user: userData, isAuthenticated: true, isInitializing: false });
        console.log('🔄 Session restaurée:', userData.role);
        return;
      } catch {
        localStorage.clear();
      }
    }

    // 4. Aucune session
    console.log('ℹ️ Aucune session trouvée — utilisateur non connecté');
    set({ isInitializing: false });
  }
}));

export default useAuthStore;