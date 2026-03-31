// ==========================================
// FICHIER: src/hooks/useNavBadges.js
// Calcule les badges de navigation depuis les notifs non lues
// ==========================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/apiSwitch';

// Mapping type de notification → clé de section nav
const TYPE_TO_NAV = {
  // Vendeur
  new_order:              'orders',
  order_cancelled:        'orders',
  order_expiring_warning: 'orders',
  seller_order_expired:   'orders',
  stock_alert:            'products',
  review_received:        'reviews',
  subscription_expiring:  'subscription',
  subscription_expired:   'subscription',
  grace_period:           'subscription',
  payment_confirmed:      'subscription',

  // Client
  order_accepted:         'orders',
  order_rejected:         'orders',
  order_completed:        'orders',
  order_expired:          'orders',
  proximity_alert:        'map',
};

const POLL_MS   = 60_000;
const MAX_FAILS = 3;

export default function useNavBadges() {
  const [badges, setBadges] = useState({});
  const failRef    = useRef(0);
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);

  const fetchBadges = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await api.notifications.getMyNotifications({
        limit:      100,
        unreadOnly: true,
      });
      if (!mountedRef.current) return;

      if (res.success) {
        failRef.current = 0;
        const counts = {};
        (res.data.notifications || []).forEach(({ type }) => {
          const key = TYPE_TO_NAV[type];
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
        setBadges(counts);
      }
    } catch {
      failRef.current += 1;
      if (failRef.current >= MAX_FAILS) clearInterval(timerRef.current);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchBadges();
    timerRef.current = setInterval(fetchBadges, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [fetchBadges]);

  // Appelé quand l'utilisateur clique sur un onglet badgé → efface visuellement le badge
  const clearBadge = useCallback((navKey) => {
    setBadges(prev => {
      const next = { ...prev };
      delete next[navKey];
      return next;
    });
  }, []);

  return { badges, clearBadge, refresh: fetchBadges };
}