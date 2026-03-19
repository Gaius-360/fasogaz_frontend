// ==========================================
// FICHIER: src/components/common/LogoImage.jsx
// Composant logo avec skeleton de chargement et fallback initiales
// ✅ Simplifié : le SplashScreen n'utilise plus d'image → pas de flamme ici
//    Le fallback reste utile pour Login/Register sur connexion lente
// ==========================================
import React, { useState } from 'react';

/**
 * FasoGazWordmark — logo textuel inline, zéro réseau.
 * Utilisé à côté du logo dans la navbar, login, register.
 */
export const FasoGazWordmark = ({ className = '', textSize = 'text-xl' }) => (
  <span className={`font-extrabold tracking-wide ${textSize} ${className}`}>
    <span className="text-red-600">F</span>
    <span className="text-yellow-500">a</span>
    <span className="text-yellow-500">s</span>
    <span className="text-green-600">o</span>
    <span className="text-red-600">G</span>
    <span className="text-yellow-500">a</span>
    <span className="text-green-600">z</span>
  </span>
);

/**
 * LogoImage — <img> avec 3 états :
 *  - loading  → skeleton shimmer
 *  - loaded   → image visible avec fade-in
 *  - error    → initiales "FG" sur fond sombre (fallback léger hors ligne)
 *
 * Props :
 *  - src          : chemin de l'image
 *  - alt          : texte alternatif
 *  - className    : classes Tailwind pour l'image elle-même
 *  - wrapperClass : classes du conteneur (taille, forme…)
 *  - fallbackText : lettres affichées en cas d'erreur (défaut "FG")
 *  - skeletonClass: classes supplémentaires pour le skeleton
 */
const LogoImage = ({
  src,
  alt = 'Logo',
  className = '',
  wrapperClass = '',
  fallbackText = 'FG',
  skeletonClass = '',
}) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'

  return (
    <div className={`relative inline-flex items-center justify-center ${wrapperClass}`}>

      {/* ── Skeleton shimmer ── */}
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-lg overflow-hidden ${skeletonClass}`}
          style={{
            background:     'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize: '200% 100%',
            animation:      'fg-shimmer 1.4s ease-in-out infinite',
          }}
        />
      )}

      {/* ── Fallback initiales (hors ligne / 404) ── */}
      {status === 'error' && (
        <div
          aria-label={alt}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-red-900 to-red-800 border border-red-700"
        >
          <span className="font-extrabold text-white text-sm leading-none select-none">
            {fallbackText.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Image réelle ── */}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />

      <style>{`
        @keyframes fg-shimmer {
          0%   { background-position: 200% 0;  }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LogoImage;