// ==========================================
// FICHIER: src/pages/RegisterRevendeur.jsx
// ✅ REVENDEURS — Inscription via lien d'invitation, sans OTP
// ✅ RESPONSIVE: Optimisé pour mobile (320px+), tablette et desktop
// ✅ FIX: logo avec skeleton + fallback (LogoImage)
// ==========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Lock, Building2, AlertCircle, MapPin, Shield } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import useAuthStore from '../store/authStore';
import { api } from '../api/apiSwitch';
import LogoImage, { FasoGazWordmark } from '../components/common/LogoImage';

const RegisterRevendeur = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [searchParams] = useSearchParams();

  const tokenFromUrl = searchParams.get('token');

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [formData, setFormData] = useState({
    phone: '+226',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    city: '',
    businessName: '',
    quarter: '',
    businessAddress: ''
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!tokenFromUrl) {
        setAlert({ type: 'error', message: 'Lien d\'invitation invalide. Vous devez recevoir un lien de la part d\'un agent ou administrateur.' });
        setLoading(false);
        return;
      }
      try {
        const response = await api.invitations.verify(tokenFromUrl);
        if (response.success && response.data.isValid) {
          setTokenValid(true);
          setTokenInfo(response.data);
          setStep(2);
        } else {
          setAlert({ type: 'error', message: response.message || 'Ce lien d\'invitation n\'est pas valide' });
        }
      } catch (error) {
        setAlert({ type: 'error', message: error.message || 'Impossible de vérifier le lien. Veuillez réessayer.' });
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [tokenFromUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (!value.startsWith('+226')) {
        setFormData(prev => ({ ...prev, phone: '+226' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!formData.phone || formData.phone.length < 12) { setAlert({ type: 'error', message: 'Numéro de téléphone invalide' }); return; }
    if (formData.password.length < 6) { setAlert({ type: 'error', message: 'Le mot de passe doit contenir au moins 6 caractères' }); return; }
    if (formData.password !== formData.confirmPassword) { setAlert({ type: 'error', message: 'Les mots de passe ne correspondent pas' }); return; }
    if (!formData.firstName || !formData.lastName || !formData.businessName || !formData.city) {
      setAlert({ type: 'error', message: 'Tous les champs obligatoires doivent être remplis' }); return;
    }

    setLoading(true);
    try {
      const response = await api.auth.register({
        token: tokenFromUrl,
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        city: formData.city,
        businessName: formData.businessName,
        quarter: formData.quarter,
        businessAddress: formData.businessAddress,
        role: 'revendeur'
      });

      if (response.success) {
        const { token, user } = response.data;
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agentUser');
        login(token, user);
        navigate('/seller/dashboard');
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Erreur lors de l\'inscription' });
    } finally {
      setLoading(false);
    }
  };

  // ── Vérification token en cours ──
  if (step === 1 && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Vérification du lien d'invitation...</p>
        </div>
      </div>
    );
  }

  // ── Token invalide ──
  if (step === 1 && !tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Lien invalide</h2>
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} className="mb-6" />}
          <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">
            Ce lien d'invitation n'est pas valide ou a expiré. Pour devenir revendeur, veuillez contacter notre équipe.
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/devenir-revendeur')}>
            En savoir plus
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulaire d'inscription ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-md w-full">

        {/* Logo - ✅ FIX: LogoImage avec skeleton + fallback */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-2xl px-4 sm:px-8 py-3 sm:py-5">
            <LogoImage
              src="/logo_gazbf.png"
              alt="FasoGaz Logo"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain"
              wrapperClass="h-12 sm:h-14 md:h-16"
              skeletonClass="rounded-xl w-12 sm:w-14 md:w-16"
              fallbackText="FG"
            />
            <FasoGazWordmark textSize="text-2xl sm:text-3xl" />
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8">

          {tokenInfo && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold text-green-900">Lien d'invitation valide</p>
                </div>
              </div>
            </div>
          )}

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} className="mb-4 sm:mb-6" />}

          <form onSubmit={handleSubmitRegistration} className="space-y-3 sm:space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Inscription Revendeur</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 px-2">
                Complétez votre profil pour activer votre compte
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Prénom" name="firstName" value={formData.firstName} onChange={handleChange} required />
              <Input label="Nom" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>

            <Input label="Téléphone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+226XXXXXXXX" icon={Phone} required />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Mot de passe" name="password" type="password" value={formData.password} onChange={handleChange} icon={Lock} required />
              <Input label="Confirmer" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} icon={Lock} required />
            </div>

            <Input label="Nom du dépôt" name="businessName" value={formData.businessName} onChange={handleChange} icon={Building2} placeholder="Ex: Dépôt Wend Konta" required />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                  required
                >
                  <option value="">Sélectionner</option>
                  <option value="Ouagadougou">Ouagadougou</option>
                  <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterRevendeur;