import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve, dirname } from 'path'
import { copyFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

// ✅ FIX ESM : __dirname n'existe pas en ESM — il faut le reconstruire
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const copyRedirects = () => ({
  name: 'copy-redirects',
  closeBundle() {
    const src  = resolve(__dirname, 'public/_redirects')
    const dest = resolve(__dirname, 'dist/_redirects')

    mkdirSync(resolve(__dirname, 'dist'), { recursive: true })

    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log('✅ _redirects copié dans dist/')
    } else {
      writeFileSync(dest, '/*    /index.html   200\n', 'utf-8')
      console.log('✅ _redirects créé automatiquement dans dist/')
    }
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      copyRedirects(),
      VitePWA({
        strategies:   'injectManifest',
        srcDir:       'src',
        filename:     'sw.js',
        registerType: 'autoUpdate',

        // ✅ includeAssets : liste les fichiers à COPIER dans dist/ et à
        //    inclure dans le manifest (favicons, apple-touch-icon…).
        //    Ce n'est PAS ce qui garantit le précache — c'est globPatterns.
        includeAssets: [
          'logo_gazbf.png',
          'icons/*.png',
        ],

        manifest: {
          name:             'FasoGaz',
          short_name:       'FasoGaz',
          description:      'Plateforme de géolocalisation et commande de gaz au Burkina Faso',
          start_url:        '/',
          scope:            '/',
          display:          'standalone',
          background_color: '#0a0a0a',
          theme_color:      '#0a0a0a',
          orientation:      'portrait',
          lang:             'fr',
          categories:       ['shopping', 'utilities'],

          icons: [
            { src: '/icons/icon-72x72.png',         sizes: '72x72',   type: 'image/png' },
            { src: '/icons/icon-96x96.png',          sizes: '96x96',   type: 'image/png' },
            { src: '/icons/icon-128x128.png',        sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144x144.png',        sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152x152.png',        sizes: '152x152', type: 'image/png' },
            { src: '/icons/icon-192x192.png',        sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-384x384.png',        sizes: '384x384', type: 'image/png' },
            { src: '/icons/icon-splash-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-splash-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },

        injectManifest: {
          // ✅ globPatterns : TOUT ce qui doit être précaché dès l'installation.
          //    Les icônes PNG sont explicitement incluses ici — c'est ce qui
          //    garantit que icon-192x192.png (logo splash) est disponible
          //    hors ligne dès le premier lancement, sans attendre de navigation.
          //
          //    Avec 'injectManifest', Vite-PWA injecte __WB_MANIFEST__ dans
          //    votre sw.js — ce tableau contient EXACTEMENT les fichiers
          //    matchés par globPatterns. Si un fichier n'est pas ici, il
          //    ne sera jamais précaché automatiquement.
          globPatterns: [
            '**/*.{js,css,html,ico,svg,woff2}', // assets JS/CSS/fonts
            'icons/*.png',                       // ✅ toutes les icônes PWA
            'logo_gazbf.png',                    // ✅ logo utilisé dans Login/Register
          ],

          // Taille max par fichier précaché (défaut 2 Mo — on monte à 5 Mo
          // pour les splash screens haute résolution 512×512).
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },

        devOptions: {
          enabled:          true,
          type:             'module',
          navigateFallback: 'index.html',
        },
      }),
    ],

    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})