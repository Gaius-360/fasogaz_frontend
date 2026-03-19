// ==========================================
// FICHIER: src/components/client/SellerCard.jsx
// ✅ FIX: AccessPurchaseModal → SubscriptionModal
// ✅ RESTAURÉ: badge distance, prix minimum, badges produits,
//             indicateur stock, note/avis — tous les détails originaux
// ==========================================
import React, { useState } from 'react';
import { MapPin, Star, Phone, Navigation, Package, Building2, Lock } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice, formatDistance } from '../../utils/helpers';
import SubscriptionModal from './SubscriptionModal';

const SellerCard = ({
  seller,
  onViewDetails,
  onCall,
  onNavigate,
  distance,
  hasAccess = true,
  onAccessRequired
}) => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const hasProducts = seller.products && seller.products.length > 0;
  const lowestPrice = hasProducts
    ? Math.min(...seller.products.map(p => parseFloat(p.price)))
    : null;

  const displayName = seller.businessName ||
    `${seller.firstName || ''} ${seller.lastName || ''}`.trim() ||
    `Dépôt ${seller.quarter || seller.city || 'Gaz'}`;

  const handleSubscriptionSuccess = () => {
    setShowSubscriptionModal(false);
    if (onAccessRequired) onAccessRequired();
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-neutral-200 hover:border-primary-300 hover:shadow-gazbf transition-all duration-200 p-4 cursor-pointer h-full flex flex-col">

        {/* ── Header : nom + badge distance ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!seller.businessName && (
                <Building2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              )}
              <h3 className="font-bold text-base text-neutral-900 truncate">
                {displayName}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-600 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0 text-primary-500" />
              <span className="truncate">{seller.quarter || seller.city}</span>
            </div>
          </div>

          {/* Badge distance — affiché uniquement si la valeur est disponible */}
          {distance !== null && distance !== undefined && (
            <div className="ml-2 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="text-xs font-bold text-white">
                {formatDistance(distance)}
              </span>
            </div>
          )}
        </div>

        {/* ── Note et prix le plus bas ── */}
        <div className="flex items-center justify-between mb-3">
          {seller.averageRating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-secondary-400 text-secondary-500" />
              <span className="text-sm font-bold text-neutral-900">
                {parseFloat(seller.averageRating).toFixed(1)}
              </span>
              <span className="text-xs text-neutral-500">
                ({seller.totalReviews})
              </span>
            </div>
          ) : (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-semibold">
              Nouveau
            </span>
          )}

          {/* Prix minimum parmi les produits */}
          {lowestPrice !== null && (
            <span className="text-xs font-bold text-primary-600">
              À partir de {formatPrice(lowestPrice)}
            </span>
          )}
        </div>

        {/* ── Nombre de produits ── */}
        {hasProducts && (
          <div className="flex items-center gap-1 mb-3 text-xs text-neutral-600">
            <Package className="h-3 w-3 flex-shrink-0 text-accent-500" />
            <span className="truncate">
              {seller.products.length} produit{seller.products.length > 1 ? 's' : ''} disponible{seller.products.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ── Badges produits (type de bouteille + statut stock) ── */}
        {hasProducts && (
          <div className="flex flex-wrap gap-1.5 mb-3 flex-1">
            {seller.products.slice(0, 2).map((product) => (
              <span
                key={product.id}
                className="inline-flex items-center px-2 py-1 bg-neutral-100 rounded-lg text-xs font-medium"
              >
                {product.bottleType}
                {product.status === 'available' ? (
                  <span className="ml-1 text-accent-600">✓</span>
                ) : product.status === 'limited' ? (
                  <span className="ml-1 text-secondary-600">⚠</span>
                ) : (
                  <span className="ml-1 text-red-600">✗</span>
                )}
              </span>
            ))}
            {seller.products.length > 2 && (
              <span className="text-xs text-neutral-500 self-center">
                +{seller.products.length - 2}
              </span>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="grid grid-cols-3 gap-2 mt-auto">

          {/* Navigation GPS */}
          {parseFloat(seller.latitude) && parseFloat(seller.longitude) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(seller);
              }}
              title="Itinéraire"
              className="p-2"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          ) : (
            <div className="text-xs text-neutral-400 flex items-center justify-center border-2 border-neutral-200 rounded-lg">
              <MapPin className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Appel */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCall(seller.phone);
            }}
            title="Appeler"
            className="p-2"
          >
            <Phone className="h-4 w-4" />
          </Button>

          {/* Voir détails */}
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(seller);
            }}
            className="text-xs font-bold"
          >
            Voir
          </Button>
        </div>
      </div>

      {/* Modal abonnement */}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={handleSubscriptionSuccess}
        />
      )}
    </>
  );
};

export default SellerCard;