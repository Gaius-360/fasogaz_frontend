// ==========================================
// FICHIER: src/sw.js
// Service Worker — Précache Workbox + Stratégies cache + Push Notifications
// ✅ FUSION: stratégies CacheFirst/NetworkFirst ajoutées pour offline complet
//    (icônes, assets, API, fonts) sans toucher à la logique Push existante
// ==========================================

import { clientsClaim }                          from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute }                          from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin }                       from 'workbox-expiration'
import { CacheableResponsePlugin }                from 'workbox-cacheable-response'

// ─────────────────────────────────────────────────────────────
// PRÉCACHE
// __WB_MANIFEST est injecté par Vite-PWA à la compilation.
// Contient tous les fichiers matchés par injectManifest.globPatterns,
// dont icons/*.png et logo_gazbf.png → disponibles hors ligne dès
// la première installation, sans navigation préalable.
// ─────────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// ── Activation immédiate sans attendre l'ancienne version ────
self.skipWaiting()
clientsClaim()

// ─────────────────────────────────────────────────────────────
// NAVIGATION SPA
// NetworkFirst : tente le réseau d'abord pour avoir la dernière
// version HTML, bascule sur le cache si hors ligne.
// Conservé tel quel depuis la version originale.
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open('fasogaz-html-v1').then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/'))
        )
    )
  }
})

// ── Assets statiques : CacheFirst ────────────────────────────
// JS, CSS, fonts, images (dont les icônes PNG du splash/logo).
// Immutables grâce au hash Vite → cache 30 jours.
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style'  ||
    request.destination === 'font'   ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'fasogaz-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries:    120,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
      }),
    ],
  })
)

// ── API : NetworkFirst ────────────────────────────────────────
// Fraîcheur prioritaire. Timeout 5s puis fallback cache.
// Permet d'afficher les dernières commandes/produits vus hors ligne.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'fasogaz-api-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries:    60,
        maxAgeSeconds: 24 * 60 * 60, // 1 jour
      }),
    ],
  })
)

// ── Google Fonts : StaleWhileRevalidate ──────────────────────
// Bebas Neue & Outfit — sert immédiatement depuis le cache,
// rafraîchit en arrière-plan. Évite le FOUT hors ligne.
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'fasogaz-fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries:    20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
      }),
    ],
  })
)

// ── Message pour forcer le rechargement ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS PUSH
// ─────────────────────────────────────────────────────────────

const EMOJI_MAP = {
  new_order:              '🛒',
  order_accepted:         '✅',
  order_rejected:         '❌',
  order_completed:        '✅',
  order_cancelled:        '⚠️',
  order_expiring_warning: '⏰',
  order_expired:          '⌛',
  seller_order_expired:   '⚠️',
  stock_alert:            '📦',
  subscription_expiring:  '⚠️',
  subscription_expired:   '🚨',
  grace_period:           '⏰',
  review_received:        '⭐',
  system:                 'ℹ️',
}

// ── Réception d'un push ───────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title:          'FasoGaz',
    message:        'Vous avez une nouvelle notification',
    icon:           '/icons/icon-192x192.png',
    badge:          '/icons/badge-72x72.png',
    url:            '/',
    priority:       'medium',
    type:           'system',
    notificationId: null,
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.message = event.data.text()
    }
  }

  const emoji    = EMOJI_MAP[payload.type] || 'ℹ️'
  const isUrgent = ['urgent', 'high'].includes(payload.priority)

  const options = {
    body:    payload.message,
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/badge-72x72.png',
    vibrate: isUrgent ? [300, 100, 300, 100, 300] : [200, 100, 200],

    // ✅ FIX 1 : tag unique par notification pour éviter les collisions
    tag: `${payload.type}-${payload.notificationId || Date.now()}`,

    // ✅ FIX 2 : false car le tag est déjà unique
    renotify: false,

    requireInteraction: isUrgent,
    silent:             false,
    timestamp:          Date.now(),
    data: {
      url:            payload.url || '/',
      notificationId: payload.notificationId,
      type:           payload.type,
    },
    actions: getActions(payload.type),
  }

  // ✅ FIX 3 : Promise explicite pour maintenir le SW en vie
  event.waitUntil(
    self.registration.showNotification(`${emoji} ${payload.title}`, options)
  )
})

// ── Clic sur une notification ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event
  notification.close()

  if (action === 'dismiss') return

  const targetUrl = notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(targetUrl)
            return
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})

// ── Fermeture d'une notification ──────────────────────────────
self.addEventListener('notificationclose', (event) => {
  const { type } = event.notification.data || {}
  console.log(`[SW] Notification fermée (type: ${type})`)
})

// ── Boutons d'action selon le type ───────────────────────────
function getActions(type) {
  const orderActions = [
    { action: 'view',    title: '👁 Voir la commande' },
    { action: 'dismiss', title: 'Ignorer' },
  ]
  const detailActions = [
    { action: 'view', title: '👁 Voir les détails' },
  ]

  const map = {
    new_order:              orderActions,
    order_expiring_warning: orderActions,
    order_accepted:         detailActions,
    order_rejected:         detailActions,
    order_completed:        detailActions,
    order_expired:          detailActions,
    seller_order_expired:   detailActions,
    stock_alert:            detailActions,
    subscription_expiring:  detailActions,
    subscription_expired:   detailActions,
    grace_period:           detailActions,
    review_received:        detailActions,
  }

  return map[type] || []
}