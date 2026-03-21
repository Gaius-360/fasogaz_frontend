// ==========================================
// FICHIER: src/components/common/ProtectedRoute.jsx
// ✅ CORRECTION: isInitializing → spinner au lieu de redirect /login
// ==========================================
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  // ✅ Attendre la fin de la restauration de session
  // initAuth() lit le localStorage (~1ms) mais React rend ce composant
  // avant que useEffect dans App.jsx ait eu le temps de s'exécuter.
  // Sans cette garde : isAuthenticated=false → redirect /login systématique
  if (isInitializing) {
    return null; // App.jsx affiche déjà <AppLoader />, pas besoin d'un 2e spinner
  }

  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si des rôles sont spécifiés et l'utilisateur n'a pas le bon rôle
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'client')    return <Navigate to="/client/map"       replace />;
    if (user?.role === 'revendeur') return <Navigate to="/seller/dashboard" replace />;
    if (user?.role === 'admin')     return <Navigate to="/admin/dashboard"  replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;