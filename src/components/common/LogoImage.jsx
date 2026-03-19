// ==========================================
// FICHIER: src/components/common/LogoImage.jsx
// Composant logo avec skeleton de chargement et fallback SVG inline
// ✅ FIX HORS LIGNE: fallback SVG flamme FasoGaz (zéro réseau requis)
//    Remplace le fallback texte "FG" par le même SVG que SplashScreen
// ==========================================
import React, { useState } from 'react';

/**
 * FasoGazWordmark — logo textuel SVG inline, chargé instantanément (0 réseau).
 * Utilisé à côté du logo image dans la navbar, login, etc.
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
 * LogoFallbackSVG — flamme FasoGaz entièrement inline.
 * Identique au fallback du SplashScreen pour une cohérence visuelle parfaite.
 * Aucun réseau, aucun cache requis — toujours disponible.
 */
const LogoFallbackSVG = () => (
  <svg
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%' }}
    aria-hidden="true"
  >
    {/* Fond circulaire */}
    <circle cx="60" cy="60" r="58" fill="#1a0000" />

    {/* Flamme principale */}
    <path
      d="M60 20 C60 20 42 38 42 58 C42 72 50 82 60 86
         C70 82 78 72 78 58 C78 38 60 20 60 20Z"
      fill="url(#lgFlameMain)"
    />
    {/* Flamme intérieure */}
    <path
      d="M60 38 C60 38 50 50 50 62 C50 70 54 76 60 78
         C66 76 70 70 70 62 C70 50 60 38 60 38Z"
      fill="url(#lgFlameInner)"
    />
    {/* Lettre G */}
    <text
      x="60"
      y="74"
      textAnchor="middle"
      fontFamily="'Bebas Neue', 'Arial Black', sans-serif"
      fontWeight="900"
      fontSize="28"
      fill="#fff"
      opacity="0.9"
    >
      G
    </text>
    {/* Socle */}
    <rect x="44" y="86" width="32" height="5" rx="2.5" fill="url(#lgBase)" opacity="0.8" />

    <defs>
      <linearGradient id="lgFlameMain" x1="60" y1="20" x2="60" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#fbbf24" />
        <stop offset="50%"  stopColor="#f97316" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <linearGradient id="lgFlameInner" x1="60" y1="38" x2="60" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#fff"    stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="lgBase" x1="44" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#f97316" stopOpacity="0" />
        <stop offset="50%"  stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * LogoImage — <img> avec 3 états :
 *  - loading  → skeleton animé (shimmer)
 *  - loaded   → image visible avec fade-in
 *  - error    → flamme SVG FasoGaz inline (fonctionne hors ligne)
 *
 * Props :
 *  - src          : chemin de l'image
 *  - alt          : texte alternatif
 *  - className    : classes Tailwind pour l'image elle-même
 *  - wrapperClass : classes du conteneur (taille, forme…)
 *  - fallbackText : conservé pour compatibilité API, non utilisé (SVG à la place)
 *  - skeletonClass: classes supplémentaires pour le skeleton
 */
const LogoImage = ({
  src,
  alt = 'Logo',
  className = '',
  wrapperClass = '',
  fallbackText = 'FG', // conservé pour ne pas casser les appels existants
  skeletonClass = '',
}) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'

  return (
    <div className={`relative inline-flex items-center justify-center ${wrapperClass}`}>

      {/* ── Skeleton shimmer (visible pendant le chargement) ── */}
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-lg overflow-hidden ${skeletonClass}`}
          style={{
            background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize: '200% 100%',
            animation: 'fg-shimmer 1.4s ease-in-out infinite',
          }}
        />
      )}

      {/* ── Fallback SVG inline (hors ligne, cache vide, 404) ── */}
      {status === 'error' && (
        <div
          aria-label={alt}
          className="absolute inset-0 flex items-center justify-center rounded-lg overflow-hidden"
        >
          <LogoFallbackSVG />
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

      {/* Keyframe shimmer injecté une seule fois */}
      <style>{`
        @keyframes fg-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LogoImage;