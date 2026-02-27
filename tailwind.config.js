/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // SAFELIST — classes générées dynamiquement (jamais trouvées statiquement
  // dans le code source → supprimées par le tree-shaking Tailwind en prod).
  // ─────────────────────────────────────────────────────────────────────────
  safelist: [
    // Spinner du Button.jsx : chargé conditionnellement via {loading && ...}
    'animate-spin',
    // Navigation active states construits dynamiquement
    'bg-primary-50',
    'text-primary-600',
    'border-primary-600',
  ],

  theme: {
    extend: {
      colors: {
        // Couleur principale : Rouge GAZBF
        primary: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',   // Rouge principal du logo
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Couleur secondaire : Orange/Jaune GAZBF
        secondary: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',   // Orange/Jaune du logo
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Couleur accent : Vert GAZBF
        accent: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',   // Vert du logo
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Gris pour les éléments neutres
        neutral: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        'gazbf':    '0 4px 6px -1px rgba(220, 38, 38, 0.1), 0 2px 4px -1px rgba(220, 38, 38, 0.06)',
        'gazbf-lg': '0 10px 15px -3px rgba(220, 38, 38, 0.1), 0 4px 6px -2px rgba(220, 38, 38, 0.05)',
      },

      // ───────────────────────────────────────────────────────────────────
      // KEYFRAMES & ANIMATIONS personnalisées
      // ───────────────────────────────────────────────────────────────────
      keyframes: {
        // Spinner fiable sur WebView Android / iOS PWA standalone.
        // On redéfinit 'spin' ici pour forcer will-change et -webkit-
        // même si Tailwind l'a déjà déclaré globalement — ça n'écrase
        // rien, ça s'y ajoute proprement.
        spin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        // Pulse doux pour les skeletons / états de chargement
        'fg-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':       { opacity: '1',   transform: 'scale(1.03)' },
        },
        // Fade-in slide-up générique
        'fg-rise': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // Réaffecte 'animate-spin' avec will-change explicite via un nom
        // dédié utilisable à la place de animate-spin si besoin
        'spin-fast':  'spin 0.6s linear infinite',
        'spin':       'spin 1s linear infinite',   // écrase le defaut Tailwind
        'fg-pulse':   'fg-pulse 1.8s ease-in-out infinite',
        'fg-rise':    'fg-rise 0.35s ease-out both',
      },
    },
  },

  plugins: [],
}