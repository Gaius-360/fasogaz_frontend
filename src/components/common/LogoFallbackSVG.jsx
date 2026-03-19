// ==========================================
// FICHIER: src/components/common/LogoFallbackSVG.jsx
// Flamme FasoGaz entièrement inline — zéro réseau, zéro cache requis.
// Utilisé par LogoImage et SplashScreen comme fallback hors ligne.
// ==========================================
import React from 'react';

/**
 * LogoFallbackSVG
 *
 * Props :
 *  - size   : largeur/hauteur CSS (défaut "100%") — ex: "48px", "2rem"
 *  - className : classes Tailwind supplémentaires sur le <svg>
 */
const LogoFallbackSVG = ({ size = '100%', className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    aria-label="FasoGaz"
    role="img"
  >
    {/* Fond circulaire */}
    <circle cx="60" cy="60" r="58" fill="#1a0000" />

    {/* Flamme principale */}
    <path
      d="M60 20 C60 20 42 38 42 58 C42 72 50 82 60 86
         C70 82 78 72 78 58 C78 38 60 20 60 20Z"
      fill="url(#lfMain)"
    />

    {/* Flamme intérieure */}
    <path
      d="M60 38 C60 38 50 50 50 62 C50 70 54 76 60 78
         C66 76 70 70 70 62 C70 50 60 38 60 38Z"
      fill="url(#lfInner)"
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

    {/* Socle lumineux */}
    <rect x="44" y="86" width="32" height="5" rx="2.5" fill="url(#lfBase)" opacity="0.8" />

    <defs>
      <linearGradient id="lfMain" x1="60" y1="20" x2="60" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#fbbf24" />
        <stop offset="50%"  stopColor="#f97316" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>

      <linearGradient id="lfInner" x1="60" y1="38" x2="60" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6" />
      </linearGradient>

      <linearGradient id="lfBase" x1="44" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#f97316" stopOpacity="0" />
        <stop offset="50%"  stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

export default LogoFallbackSVG;