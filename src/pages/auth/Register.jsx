// ==========================================
// FICHIER: src/pages/auth/Register.jsx
// ✅ CLIENTS UNIQUEMENT - Inscription directe avec vérification GPS obligatoire
// ✅ RESPONSIVE: Optimisé pour mobile (320px+), tablette et desktop
// ✅ FIX: logo avec skeleton + fallback (LogoImage)
// ==========================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, Building2, MapPin, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import useAuthStore from '../../store/authStore';
import { api } from '../../api/apiSwitch';
import { verifyUserLocationForCity } from '../../utils/locationValidation';
import LogoImage, { FasoGazWordmark } from '../../components/common/LogoImage';

const GPS_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    phone: '+226',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    city: ''
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(GPS_STATUS.IDLE);
  const [gpsMessage, setGpsMessage] = useState('');
  const [gpsData, setGpsData] = useState(null);
  const [gpsSuggestedCity, setGpsSuggestedCity] = useState(null);

  const handleCityChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, city: value }));
    setGpsStatus(GPS_STATUS.IDLE);
    setGpsMessage('');
    setGpsData(null);
    setGpsSuggestedCity(null);
    setAlert(null);
  };

  const sanitizePhone = (value) => value.replace(/\s/g, '');

  const handleNameBeforeInput = (e) => {
    if (e.data && !/^[a-zA-Z\u00C0-\u00FF\s'\-]$/.test(e.data)) {
      e.preventDefault();
    }
  };

  const handleNamePaste = (e, fieldName) => {
    e.preventDefault();
    const cleaned = e.clipboardData.getData('text')
      .replace(/[^a-zA-Z\u00C0-\u00FF\s'\-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trimStart()
      .slice(0, 25);
    setFormData(prev => ({ ...prev, [fieldName]: cleaned }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const sanitized = sanitizePhone(value);
      if (!sanitized.startsWith('+226')) {
        setFormData(prev => ({ ...prev, phone: '+226' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: sanitized }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVerifyLocation = async () => {
    if (!formData.city) {
      setAlert({ type: 'error', message: 'Veuillez d\'abord sélectionner une ville.' });
      return;
    }
    setGpsStatus(GPS_STATUS.LOADING);
    setGpsMessage('');
    setGpsSuggestedCity(null);
    setAlert(null);

    try {
      const result = await verifyUserLocationForCity(formData.city);
      if (result.valid) {
        setGpsStatus(GPS_STATUS.SUCCESS);
        setGpsMessage(result.message);
        setGpsData({ latitude: result.latitude, longitude: result.longitude, distance: result.distance, accuracy: result.accuracy });
      } else {
        setGpsStatus(GPS_STATUS.ERROR);
        setGpsMessage(result.message);
        setGpsData(null);
        if (result.suggestedCity) setGpsSuggestedCity(result.suggestedCity);
      }
    } catch (error) {
      setGpsStatus(GPS_STATUS.ERROR);
      setGpsMessage(error.message || 'Impossible d\'obtenir votre position GPS.');
      setGpsData(null);
    }
  };

  const applySuggestedCity = () => {
    if (gpsSuggestedCity) {
      setFormData(prev => ({ ...prev, city: gpsSuggestedCity }));
      setGpsStatus(GPS_STATUS.IDLE);
      setGpsMessage('');
      setGpsData(null);
      setGpsSuggestedCity(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!formData.phone || formData.phone.length < 12) { setAlert({ type: 'error', message: 'Numéro de téléphone invalide' }); return; }
    if (formData.password.length < 6) { setAlert({ type: 'error', message: 'Le mot de passe doit contenir au moins 6 caractères' }); return; }
    if (formData.password !== formData.confirmPassword) { setAlert({ type: 'error', message: 'Les mots de passe ne correspondent pas' }); return; }
    if (!formData.firstName || !formData.lastName) { setAlert({ type: 'error', message: 'Prénom et nom requis' }); return; }
    if (!formData.city) { setAlert({ type: 'error', message: 'Veuillez sélectionner une ville' }); return; }
    if (gpsStatus !== GPS_STATUS.SUCCESS) {
      setAlert({ type: 'error', message: 'Vous devez vérifier votre position GPS avant de vous inscrire.' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.register({
        phone: formData.phone,
        password: formData.password,
        role: 'client',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        city: formData.city,
        latitude: gpsData?.latitude,
        longitude: gpsData?.longitude,
        locationVerified: true
      });

      if (response.success) {
        const { token, user } = response.data;
        login(token, user);
        navigate('/client/map');
      }
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || error.message || 'Erreur lors de l\'inscription' });
    } finally {
      setLoading(false);
    }
  };

  const renderGPSBadge = () => {
    if (gpsStatus === GPS_STATUS.IDLE) return null;
    if (gpsStatus === GPS_STATUS.LOADING) return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Loader className="h-4 w-4 animate-spin flex-shrink-0" />
        <span>Localisation en cours...</span>
      </div>
    );
    if (gpsStatus === GPS_STATUS.SUCCESS) return (
      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{gpsMessage}</span>
      </div>
    );
    if (gpsStatus === GPS_STATUS.ERROR) return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{gpsMessage}</span>
        </div>
        {gpsSuggestedCity && (
          <button type="button" onClick={applySuggestedCity} className="text-xs text-blue-600 hover:text-blue-800 underline text-left">
            → Changer la ville pour "{gpsSuggestedCity}"
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="max-w-md w-full">

        {/* Titre */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Créer un compte client
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            Rejoignez FasoGaz et trouvez du gaz près de chez vous
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 md:p-8">

          {alert && (
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} className="mb-4 sm:mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Inscription Client</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Prénom" name="firstName" value={formData.firstName} onChange={handleChange} onBeforeInput={handleNameBeforeInput} onPaste={(e) => handleNamePaste(e, 'firstName')} maxLength={25} required />
              <Input label="Nom" name="lastName" value={formData.lastName} onChange={handleChange} onBeforeInput={handleNameBeforeInput} onPaste={(e) => handleNamePaste(e, 'lastName')} maxLength={25} required />
            </div>

            <Input label="Téléphone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+226XXXXXXXX" icon={Phone} required />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Mot de passe" name="password" type="password" value={formData.password} onChange={handleChange} icon={Lock} required />
              <Input label="Confirmer" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} icon={Lock} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleCityChange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                required
              >
                <option value="">Sélectionner une ville</option>
                <option value="Ouagadougou">Ouagadougou</option>
                <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
              </select>
            </div>

            {formData.city && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    FasoGaz est disponible uniquement à <strong>Ouagadougou</strong> et <strong>Bobo-Dioulasso</strong>.
                    Veuillez vérifier que vous êtes bien dans la ville sélectionnée.
                  </p>
                </div>

                {renderGPSBadge()}

                <button
                  type="button"
                  onClick={handleVerifyLocation}
                  disabled={gpsStatus === GPS_STATUS.LOADING}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                    ${gpsStatus === GPS_STATUS.SUCCESS
                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {gpsStatus === GPS_STATUS.LOADING ? <Loader className="h-4 w-4 animate-spin" /> :
                   gpsStatus === GPS_STATUS.SUCCESS ? <CheckCircle className="h-4 w-4" /> :
                   <MapPin className="h-4 w-4" />}
                  {gpsStatus === GPS_STATUS.SUCCESS ? 'Position vérifiée ✓' :
                   gpsStatus === GPS_STATUS.LOADING ? 'Vérification...' : 'Vérifier ma position GPS'}
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading || gpsStatus !== GPS_STATUS.SUCCESS}>
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </Button>

            {formData.city && gpsStatus !== GPS_STATUS.SUCCESS && (
              <p className="text-xs text-center text-gray-500">
                La vérification GPS est requise pour vous inscrire.
              </p>
            )}

            <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold text-orange-900 mb-1">Vous êtes revendeur ?</p>
                  <p className="text-orange-700 mb-2">L'inscription revendeur se fait uniquement via invitation.</p>
                  <button type="button" onClick={() => navigate('/devenir-revendeur')} className="text-orange-600 hover:text-orange-700 font-semibold underline">
                    En savoir plus →
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 text-center">
              <Link to="/login" className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">
                Déjà un compte ? <span className="font-semibold">Se connecter</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;