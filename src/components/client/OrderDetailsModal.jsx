// ==========================================
// FICHIER: src/components/client/OrderDetailsModal.jsx
// ✅ MODIFIÉ: Suppression du mode pickup
//            Toujours afficher livraison à domicile
//            GPS toujours visible
//            Partage WhatsApp livreur disponible si in_delivery
//            Mobile-first: bottom sheet
// ✅ FIX MOBILE: CSS Grid 3 rows : header (auto) / scroll (1fr) / footer (auto)
//               minHeight: 0 sur la zone scroll — OBLIGATOIRE pour que 1fr scroll
//               mb-[60px] sur mobile pour ne pas passer sous la bottom nav
//               Les boutons sont dans le footer (row 3), jamais cachés
// ==========================================
import React, { useEffect } from 'react';
import {
  X, Package, Clock, CheckCircle, XCircle,
  MapPin, Phone, Truck, User, Navigation,
  Share2, Star
} from 'lucide-react';
import Button from '../common/Button';
import { formatPrice, formatDate, formatDateTime } from '../../utils/helpers';

const OrderDetailsModal = ({ order, onClose, onCancel }) => {
  if (!order) return null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ==========================================
  // STATUT
  // ==========================================

  const getStatusConfig = (status) => {
    const configs = {
      pending:     { color: 'bg-yellow-100 text-yellow-800', icon: Clock,       label: 'En attente de confirmation' },
      accepted:    { color: 'bg-blue-100 text-blue-800',     icon: CheckCircle, label: 'Commande acceptée' },
      in_delivery: { color: 'bg-indigo-100 text-indigo-800', icon: Truck,       label: 'En cours de livraison' },
      completed:   { color: 'bg-green-100 text-green-800',   icon: CheckCircle, label: 'Livrée avec succès' },
      cancelled:   { color: 'bg-gray-100 text-gray-800',     icon: XCircle,     label: 'Annulée' },
      rejected:    { color: 'bg-red-100 text-red-800',       icon: XCircle,     label: 'Rejetée par le revendeur' },
      expired:     { color: 'bg-orange-100 text-orange-800', icon: Clock,       label: 'Expirée (sans réponse)' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  // ==========================================
  // GPS
  // ==========================================

  const hasValidGPS =
    order.deliveryAddress?.latitude &&
    order.deliveryAddress?.longitude &&
    !isNaN(parseFloat(order.deliveryAddress.latitude)) &&
    !isNaN(parseFloat(order.deliveryAddress.longitude));

  const handleOpenMaps = () => {
    if (!hasValidGPS) return;
    const lat = parseFloat(order.deliveryAddress.latitude);
    const lng = parseFloat(order.deliveryAddress.longitude);
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // ==========================================
  // PARTAGE WHATSAPP (contact revendeur / livreur)
  // ==========================================

  const handleShareWhatsApp = () => {
    if (!order.seller?.phone) return;

    const items = order.items?.map(i =>
      `• ${i.quantity}× ${i.product?.brand} ${i.product?.bottleType} = ${formatPrice(i.subtotal)}`
    ).join('\n') || '';

    let message = `Bonjour, j'ai une commande chez vous :\n`;
    message += `📦 Commande #${order.orderNumber}\n\n`;
    message += `${items}\n\n`;
    message += `💰 Total : ${formatPrice(order.total)}\n`;

    if (order.deliveryAddress) {
      const { quarter, city } = order.deliveryAddress;
      message += `📍 Livraison : ${quarter || ''}, ${city || ''}\n`;
    }

    const phone = order.seller.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ==========================================
  // ÉTAPES DU FLUX (progression visuelle)
  // ==========================================

  const steps = [
    { key: 'pending',     label: 'Commande envoyée', icon: Package },
    { key: 'accepted',    label: 'Confirmée',         icon: CheckCircle },
    { key: 'in_delivery', label: 'En livraison',      icon: Truck },
    { key: 'completed',   label: 'Livrée',            icon: CheckCircle },
  ];

  const getCurrentStepIndex = () => {
    if (['cancelled', 'rejected', 'expired'].includes(order.status)) return -1;
    return steps.findIndex(s => s.key === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();
  const hasCancel = order.status === 'pending' && !!onCancel;

  // ==========================================
  // RENDU
  // ==========================================

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
        FIX MOBILE :
        - CSS Grid avec 3 rows : header (auto) / scroll (1fr) / footer (auto)
        - minHeight: 0 sur la zone scroll est OBLIGATOIRE pour que 1fr scroll correctement
        - mb-[60px] sur mobile pour ne pas passer sous la bottom nav de l'app
        - Les boutons sont dans le footer (row 3), jamais cachés par le clavier ou la nav
      */}
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
        style={{
          maxHeight: 'calc(92dvh - 60px)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        {/* Header — row 1 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100 bg-white rounded-t-2xl sm:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Détails commande</h2>
            <p className="text-sm text-gray-500">#{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Zone scrollable — row 2, minHeight:0 indispensable */}
        <div className="overflow-y-auto overscroll-contain px-5 py-4" style={{ minHeight: 0 }}>
          <div className="space-y-5">

            {/* ==========================================
                STATUT + BADGE
                ========================================== */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${statusConfig.color}`}>
              <StatusIcon className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">{statusConfig.label}</p>
                <p className="text-xs opacity-80">
                  Commande du {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            {/* ==========================================
                PROGRESSION VISUELLE (flux livraison)
                ========================================== */}
            {!['cancelled', 'rejected', 'expired'].includes(order.status) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Suivi de livraison
                </p>
                <div className="flex items-center gap-0">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isDone = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                            isDone
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                          } ${isCurrent ? 'ring-2 ring-primary-300 ring-offset-1' : ''}`}>
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <p className={`text-[10px] text-center leading-tight ${
                            isDone ? 'text-primary-700 font-medium' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </p>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`h-0.5 flex-1 mb-5 ${index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==========================================
                REVENDEUR
                ========================================== */}
            {order.seller && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Revendeur</p>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{order.seller.businessName}</p>
                      <p className="text-xs text-gray-500">{order.seller.quarter}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.seller.phone && (
                      <>
                        <a
                          href={`tel:${order.seller.phone}`}
                          className="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <button
                          onClick={handleShareWhatsApp}
                          className="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                ADRESSE DE LIVRAISON
                ✅ MODIFIÉ: toujours livraison, plus de retrait
                ========================================== */}
            {order.deliveryAddress && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Adresse de livraison
                </p>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-2 mb-2">
                    <Truck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900">
                        {order.deliveryAddress.label}
                      </p>
                      <p className="text-sm text-blue-800">
                        {order.deliveryAddress.fullAddress}
                      </p>
                      <p className="text-xs text-blue-700">
                        {order.deliveryAddress.quarter}, {order.deliveryAddress.city}
                      </p>
                    </div>
                  </div>

                  {/* Coordonnées GPS */}
                  {hasValidGPS && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-mono text-blue-800">
                            {parseFloat(order.deliveryAddress.latitude).toFixed(5)},
                            {parseFloat(order.deliveryAddress.longitude).toFixed(5)}
                          </span>
                        </div>
                        <button
                          onClick={handleOpenMaps}
                          className="text-xs text-blue-700 font-medium underline underline-offset-2"
                        >
                          Ouvrir Maps
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==========================================
                ARTICLES
                ========================================== */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Articles commandés</p>
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {item.product?.brand} — {item.product?.bottleType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 flex-shrink-0">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ==========================================
                RÉCAPITULATIF FINANCIER
                ========================================== */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frais de livraison</span>
                <span>{parseFloat(order.deliveryFee) > 0 ? formatPrice(order.deliveryFee) : 'Gratuit'}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total)}</span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Paiement en espèces au livreur à la réception
              </p>
            </div>

            {/* Note client */}
            {order.customerNote && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">Votre note</p>
                <p className="text-sm text-yellow-900">"{order.customerNote}"</p>
              </div>
            )}

            {/* Raison de rejet */}
            {order.status === 'rejected' && order.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-800 mb-1">Commande rejetée</p>
                    <p className="text-sm text-red-700">{order.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Commande expirée */}
            {order.status === 'expired' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-orange-800 mb-1">Commande expirée</p>
                    <p className="text-sm text-orange-700">
                      Le revendeur n'a pas répondu dans le délai imparti.
                      Vous pouvez passer une nouvelle commande auprès d'un autre revendeur.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Avis */}
            {order.review && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-yellow-700 mb-2">Votre avis</p>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < order.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                {order.review.comment && (
                  <p className="text-sm text-yellow-900">"{order.review.comment}"</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer boutons — row 3, toujours visible */}
        <div
          className="p-4 sm:p-5 border-t-2 border-neutral-100 bg-white"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-3">
            {hasCancel && (
              <Button
                variant="outline"
                type="button"
                onClick={() => { onCancel(order); onClose(); }}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                Annuler la commande
              </Button>
            )}
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className={hasCancel ? 'flex-1' : 'w-full'}
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;