// ==========================================
// FICHIER: src/components/common/ProtectedAdminRoute.jsx
// ✅ CORRECTION: isInitializing → évite la redirect prématurée
// ==========================================
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  console.log('🔐 ProtectedAdminRoute Check:', {
    isAuthenticated,
    isInitializing,
    role: user?.role,
    user
  });

  // ✅ Attendre la fin de la restauration de session
  // Sans cette garde, les logs ci-dessus afficheraient toujours
  // isAuthenticated=false au premier rendu, même pour un admin connecté
  if (isInitializing) {
    return null; // App.jsx affiche déjà <AppLoader />
  }

  // Non connecté
  if (!isAuthenticated || !user) {
    console.log('❌ Non authentifié - redirection /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  // Pas admin
  if (user.role !== 'admin') {
    console.log('❌ Pas admin - redirection /');
    return <Navigate to="/" replace />;
  }

  console.log('✅ Accès admin autorisé');
  return children;
};

export default ProtectedAdminRoute;