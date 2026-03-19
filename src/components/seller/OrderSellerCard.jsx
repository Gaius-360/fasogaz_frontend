// ==========================================
// FICHIER: src/components/seller/OrderSellerCard.jsx
// ✅ MODIFIÉ: Suppression du mode pickup
//            Flux unique: accepted → in_delivery → completed
//            Suppression estimatedTime
//            Partage livreur toujours disponible dès accepted
// ✅ NOUVEAU: Calcul et affichage de la distance point de vente → livraison
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, CheckCircle, XCircle, Package, Truck,
  Phone, MapPin, User, ChevronDown, ChevronUp,
  Share2, Navigation, AlertCircle, Ruler
} from 'lucide-react';
import Button from '../common/Button';
import { formatPrice, formatDate, formatDateTime, calculateDistance } from '../../utils/helpers';

const OrderSellerCard = ({
  order,
  onAccept,
  onReject,
  onUpdateStatus,
  onViewDetails,
  onComplete
}) => {
  const [expanded, setExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // ==========================================
  // TIMER D'EXPIRATION (pour commandes pending)
  // ==========================================
  useEffect(() => {
    if (order.status !== 'pending' || !order.expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(order.expiresAt);
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, diff });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.expiresAt]);

  // ==========================================
  // CALCUL DE DISTANCE (point de vente → livraison)
  // ==========================================
  // Le backend expose les coordonnées du point de vente via :
  //   - order.sellerLocation   (champ dédié, prioritaire)
  //   - order.seller?.address  (adresse du profil revendeur)
  // La fonction calculateDistance (Haversine) est déjà dans helpers.js.
  const deliveryDistance = useMemo(() => {
    const dest   = order.deliveryAddress;
    const origin = order.sellerLocation || order.seller?.address;

    if (
      !dest?.latitude   || !dest?.longitude   ||
      !origin?.latitude || !origin?.longitude
    ) return null;

    const distKm = calculateDistance(
      parseFloat(origin.latitude),
      parseFloat(origin.longitude),
      parseFloat(dest.latitude),
      parseFloat(dest.longitude)
    );

    if (isNaN(distKm)) return null;

    // Estimation du temps à moto (~25 km/h moyenne en ville)
    const minutes = Math.round((distKm / 25) * 60);
    const timeLabel =
      minutes < 2  ? 'moins de 2 min' :
      minutes < 60 ? `~${minutes} min` :
      `~${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;

    const distLabel =
      distKm < 1
        ? `${Math.round(distKm * 1000)} m`
        : `${distKm.toFixed(1)} km`;

    return { distKm, distLabel, timeLabel };
  }, [order.deliveryAddress, order.sellerLocation, order.seller?.address]);

  // ==========================================
  // HELPERS STATUT
  // ==========================================

  const getStatusConfig = (status) => {
    const configs = {
      pending:     { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock,       label: 'En attente',   dot: 'bg-yellow-500' },
      accepted:    { color: 'bg-blue-100 text-blue-800 border-blue-300',       icon: CheckCircle, label: 'Acceptée',     dot: 'bg-blue-500'   },
      in_delivery: { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Truck,       label: 'En livraison', dot: 'bg-indigo-500' },
      completed:   { color: 'bg-green-100 text-green-800 border-green-300',    icon: CheckCircle, label: 'Complétée',    dot: 'bg-green-500'  },
      cancelled:   { color: 'bg-gray-100 text-gray-800 border-gray-300',       icon: XCircle,     label: 'Annulée',      dot: 'bg-gray-400'   },
      rejected:    { color: 'bg-red-100 text-red-800 border-red-300',          icon: XCircle,     label: 'Rejetée',      dot: 'bg-red-500'    },
      expired:     { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Clock,       label: 'Expirée',      dot: 'bg-orange-500' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  // ==========================================
  // BOUTON D'ACTION PRINCIPAL
  // Flux: pending → accepted → in_delivery → completed
  // ==========================================

  const getNextAction = () => {
    if (order.status === 'accepted') {
      return { label: '🚴 Départ en livraison', nextStatus: 'in_delivery', variant: 'primary' };
    }
    if (order.status === 'in_delivery') {
      return { label: '✅ Marquer comme livrée', nextStatus: 'completed', variant: 'success' };
    }
    return null;
  };

  const nextAction = getNextAction();

  const handleProgressAction = () => {
    if (!nextAction) return;
    if (nextAction.nextStatus === 'completed') {
      onComplete && onComplete(order);
    } else {
      onUpdateStatus && onUpdateStatus(order.id, nextAction.nextStatus);
    }
  };

  // ==========================================
  // PARTAGE POSITION LIVREUR (WhatsApp + Maps)
  // Toujours disponible dès accepted
  // ==========================================

  const handleShareDelivery = () => {
    if (!order.deliveryAddress) return;

    const { latitude, longitude, fullAddress, quarter, city } = order.deliveryAddress;
    const customerName  = `${order.customer?.firstName} ${order.customer?.lastName}`;
    const customerPhone = order.customer?.phone;
    const orderNum      = order.orderNumber;

    let message = `🚴 *Livraison FasoGaz*\n`;
    message += `📦 Commande : ${orderNum}\n`;
    message += `👤 Client : ${customerName}\n`;
    if (customerPhone) message += `📞 Tél : ${customerPhone}\n`;
    message += `📍 Adresse : ${fullAddress || ''}, ${quarter || ''}, ${city || ''}\n`;

    if (latitude && longitude) {
      const lat = typeof latitude  === 'string' ? parseFloat(latitude)  : latitude;
      const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
      message += `🗺️ GPS : https://maps.google.com/?q=${lat},${lng}\n`;
    }

    if (deliveryDistance) {
      message += `📏 Distance depuis le dépôt : ${deliveryDistance.distLabel} (${deliveryDistance.timeLabel} en moto)\n`;
    }

    message += `\n💰 Total : ${formatPrice(order.total)}`;
    if (order.deliveryFee > 0) {
      message += ` (dont ${formatPrice(order.deliveryFee)} de livraison)`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleOpenMaps = () => {
    if (!order.deliveryAddress?.latitude || !order.deliveryAddress?.longitude) return;
    const lat = parseFloat(order.deliveryAddress.latitude);
    const lng = parseFloat(order.deliveryAddress.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const hasValidGPS =
    order.deliveryAddress?.latitude  &&
    order.deliveryAddress?.longitude &&
    !isNaN(parseFloat(order.deliveryAddress.latitude)) &&
    !isNaN(parseFloat(order.deliveryAddress.longitude));

  // ==========================================
  // TIMER URGENCE
  // ==========================================

  const getTimerColor = () => {
    if (!timeLeft) return 'text-gray-500';
    if (timeLeft.diff < 60 * 60 * 1000)      return 'text-red-600 font-bold animate-pulse';
    if (timeLeft.diff < 3 * 60 * 60 * 1000)  return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  const formatTimer = () => {
    if (!timeLeft) return null;
    const { hours, minutes, seconds } = timeLeft;
    if (hours   > 0) return `${hours}h${minutes.toString().padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
  };

  // ==========================================
  // RENDU
  // ==========================================

  const cardBorderColor = {
    pending:     'border-yellow-400',
    accepted:    'border-blue-400',
    in_delivery: 'border-indigo-400',
    completed:   'border-green-400',
    cancelled:   'border-gray-300',
    rejected:    'border-red-400',
    expired:     'border-orange-400',
  }[order.status] || 'border-gray-300';

  return (
    <div className={`bg-white rounded-xl border-2 ${cardBorderColor} shadow-sm hover:shadow-md transition-all duration-200`}>

      {/* ==========================================
          EN-TÊTE CARTE
          ========================================== */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {/* Numéro + Statut */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm text-gray-900 truncate">
                #{order.orderNumber}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </span>
            </div>

            {/* Date + icône livraison */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Truck className="h-3 w-3 text-gray-400" />
              <span>Livraison</span>
              <span>•</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
            {order.deliveryFee > 0 && (
              <p className="text-xs text-gray-500">dont {formatPrice(order.deliveryFee)} livraison</p>
            )}
          </div>
        </div>

        {/* Timer d'expiration */}
        {order.status === 'pending' && timeLeft && (
          <div className={`flex items-center gap-1.5 text-xs mb-3 ${getTimerColor()}`}>
            <Clock className="h-3.5 w-3.5" />
            <span>Expire dans {formatTimer()}</span>
          </div>
        )}

        {/* Client */}
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate font-medium">
            {order.customer?.firstName} {order.customer?.lastName}
          </span>
          {order.customer?.phone && (
            <a
              href={`tel:${order.customer.phone}`}
              className="ml-auto flex-shrink-0 p-1.5 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Adresse de livraison */}
        {order.deliveryAddress && (
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {order.deliveryAddress.fullAddress || order.deliveryAddress.quarter}
              {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
            </span>
            {hasValidGPS && (
              <span className="ml-auto flex-shrink-0 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Navigation className="h-2.5 w-2.5" />
                GPS
              </span>
            )}
          </div>
        )}

        {/* ==========================================
            DISTANCE POINT DE VENTE → LIVRAISON
            Visible dès que les deux coordonnées sont disponibles,
            tous statuts confondus (pending inclus, pour aide à la décision).
            ========================================== */}
        {deliveryDistance && (
          <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
              <Ruler className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-900 leading-tight">
                {deliveryDistance.distLabel}
                <span className="ml-2 text-xs font-normal text-blue-700">
                  {deliveryDistance.timeLabel} en moto
                </span>
              </p>
              <p className="text-[10px] text-blue-600 mt-0.5">De votre point de vente</p>
            </div>
          </div>
        )}

        {/* Produits (résumé) */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">{order.items?.length || 0} article(s) :</span>{' '}
          {order.items?.slice(0, 2).map((item, i) => (
            <span key={item.id || i}>
              {item.quantity}× {item.product?.brand} {item.product?.bottleType}
              {i < Math.min(order.items.length, 2) - 1 ? ', ' : ''}
            </span>
          ))}
          {order.items?.length > 2 && <span> +{order.items.length - 2} autre(s)</span>}
        </div>
      </div>

      {/* ==========================================
          SECTION DÉPLIABLE (détails + GPS)
          ========================================== */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">

          {/* Détail des articles */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Articles</p>
            <div className="space-y-1">
              {order.items?.map((item, i) => (
                <div key={item.id || i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">
                    {item.quantity}× {item.product?.brand} {item.product?.bottleType}
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GPS détaillé */}
          {hasValidGPS && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" />
                Coordonnées GPS client
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-blue-900">
                <div>
                  <span className="text-blue-600">Lat: </span>
                  {parseFloat(order.deliveryAddress.latitude).toFixed(6)}
                </div>
                <div>
                  <span className="text-blue-600">Long: </span>
                  {parseFloat(order.deliveryAddress.longitude).toFixed(6)}
                </div>
              </div>

              {/* Distance détaillée dans la section dépliée */}
              {deliveryDistance && (
                <div className="mt-2 pt-2 border-t border-blue-200 flex items-center gap-2 text-xs text-blue-800">
                  <Ruler className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  <span>
                    <span className="font-semibold">{deliveryDistance.distLabel}</span>
                    {' '}depuis votre dépôt · {deliveryDistance.timeLabel} à moto
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Note client */}
          {order.customerNote && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Note du client</p>
              <p className="text-sm text-gray-700">"{order.customerNote}"</p>
            </div>
          )}

          {/* Raison de rejet */}
          {order.rejectionReason && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-500 mb-1">Raison du rejet</p>
              <p className="text-sm text-red-700">{order.rejectionReason}</p>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>Créée : {formatDateTime(order.createdAt)}</div>
            {order.acceptedAt  && <div>Acceptée : {formatDateTime(order.acceptedAt)}</div>}
            {order.completedAt && <div>Complétée : {formatDateTime(order.completedAt)}</div>}
          </div>
        </div>
      )}

      {/* ==========================================
          ACTIONS
          ========================================== */}
      <div className="border-t border-gray-100 p-3 space-y-2">

        {/* Boutons pending: Accepter / Rejeter */}
        {order.status === 'pending' && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onAccept && onAccept(order)}
            >
              ✅ Accepter
            </Button>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => onReject && onReject(order)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              ❌ Rejeter
            </Button>
          </div>
        )}

        {/* Bouton progression (accepted → in_delivery → completed) */}
        {nextAction && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleProgressAction}
            className={nextAction.variant === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {nextAction.label}
          </Button>
        )}

        {/* Partage livreur — disponible dès accepted */}
        {['accepted', 'in_delivery'].includes(order.status) && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleShareDelivery}
              className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleOpenMaps}
              disabled={!hasValidGPS}
              className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs"
            >
              <Navigation className="h-3.5 w-3.5 mr-1" />
              Maps
            </Button>
          </div>
        )}

        {/* Toggle détails + voir tout */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 py-1 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Réduire</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Détails</>
            )}
          </button>

          {onViewDetails && (
            <button
              onClick={() => onViewDetails(order)}
              className="flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-800 py-1 transition-colors"
            >
              <Package className="h-3.5 w-3.5" />
              Voir tout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSellerCard;