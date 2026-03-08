import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'

const copyRedirects = () => ({
  name: 'copy-redirects',
  closeBundle() {
    const src  = resolve(__dirname, 'public/_redirects')
    const dest = resolve(__dirname, 'dist/_redirects')
    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log('✅ _redirects copié dans dist/')
    } else {
      console.warn('⚠️  public/_redirects introuvable — routes SPA non configurées')
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
        strategies:    'injectManifest',
        srcDir:        'src',
        filename:      'sw.js',
        registerType:  'autoUpdate',
        includeAssets: ['logo_gazbf.png', 'icons/*.png'],

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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // ✅ FIX CRITIQUE : injectionPoint: undefined supprimé
          // Sans ça, Workbox ne peut pas injecter self.__WB_MANIFEST dans sw.js
          // Le SW compilait mais plantait silencieusement en background sur mobile
          // => aucun événement 'push' reçu hors de la plateforme
        },

        devOptions: {
          enabled:          true,
          type:             'module',
          navigateFallback: 'index.html',
        },
      }),
    ],

    // server: { host: true },

    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})