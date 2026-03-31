// ==========================================
// FICHIER: src/components/common/NavBadgeBorder.jsx
// Bordure animée sur une icône de nav quand il y a des notifs non lues
// Les keyframes ring-pulse-primary / ring-pulse-secondary sont dans index.css
// ==========================================
import React from 'react';

/**
 * @param {number}    count    — nb notifs non lues (0 = aucune bordure)
 * @param {boolean}   seller   — palette vendeur (secondary) vs client (primary)
 * @param {ReactNode} children — l'icône à wrapper
 */
const NavBadgeBorder = ({ count = 0, seller = false, children }) => {
  const hasBadge = count > 0;

  return (
    <span
      className={`
        relative inline-flex items-center justify-center
        rounded-lg transition-all duration-300
        ${hasBadge
          ? seller
            ? 'ring-pulse-secondary'
            : 'ring-pulse-primary'
          : ''
        }
      `}
    >
      {children}

      {/* Micro-point en coin pour renforcer la lisibilité sur fond coloré */}
      {hasBadge && (
        <span
          className={`
            absolute -top-1 -right-1
            w-2 h-2 rounded-full ring-2 ring-white
            ${seller ? 'bg-secondary-500' : 'bg-primary-600'}
          `}
        />
      )}
    </span>
  );
};

export default NavBadgeBorder;