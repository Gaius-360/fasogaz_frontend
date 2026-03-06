// ==========================================
// FICHIER: src/components/seller/OrderDetailsModal.jsx
// Modal détails commande avec couleurs FasoGaz - VERSION MOBILE CORRIGÉE
// ==========================================
import React, { useState } from 'react';
import { 
  X, MapPin, Phone, Package, Clock, User, 
  Navigation, ExternalLink, Share2, MessageCircle,
  Copy, CheckCircle, AlertCircle
} from 'lucide-react';
import Button from '../common/Button';
import { formatPrice, formatDateTime } from '../../utils/helpers';
import { ORDER_STATUS } from '../../constants';

const OrderDetailsModal = ({ order, onClose, isSeller = false, onUpdateStatus }) => {
  const [copied, setCopied] = useState(false);
  const status = ORDER_STATUS[order.status];

  const statusColors = {
    yellow: 'bg-secondary-100 text-secondary-800 border-secondary-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    green: 'bg-accent-100 text-accent-800 border-accent-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    gray: 'bg-neutral-100 text-neutral-800 border-neutral-300'
  };

  const handleCopyCoordinates = () => {
    if (order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
      const coords = `${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}`;
      navigator.clipboard.writeText(coords);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
      const url = `https://www.google.com/maps?q=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleShareWhatsApp = () => {
    if (!order.deliveryAddress?.latitude || !order.deliveryAddress?.longitude) return;

    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
    const customerPhone = order.customer?.phone || 'Non renseigné';
    const address = order.deliveryAddress.fullAddress || `${order.deliveryAddress.quarter}, ${order.deliveryAddress.city}`;
    const coords = `${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}`;
    const googleMapsLink = `https://www.google.com/maps?q=${coords}`;

    const message = `🚚 *NOUVELLE LIVRAISON*

📦 *Commande:* #${order.orderNumber}
👤 *Client:* ${customerName}
📞 *Téléphone:* ${customerPhone}

📍 *Adresse de livraison:*
${address}

🗺️ *Coordonnées GPS:*
${coords}

🔗 *Lien Google Maps:*
${googleMapsLink}

💰 *Montant:* ${formatPrice(order.total)}

${order.customerNote ? `💬 *Note client:*\n${order.customerNote}` : ''}

Merci ! 🙏`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactCustomer = () => {
    if (!order.customer?.phone) return;

    const phone = order.customer.phone.replace(/\D/g, '');
    const message = `Bonjour ${order.customer.firstName}, concernant votre commande #${order.orderNumber}...`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    /* Overlay plein écran - utilise toute la hauteur disponible sur mobile */
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
      
      {/*
        CORRECTION MOBILE :
        - Sur mobile (<sm) : sheet du bas, coins arrondis en haut seulement, hauteur 92dvh
        - Sur sm+ : modal centré classique avec max-w-3xl
        - On utilise flex-col pour que header/footer soient fixes et body scroll
        - dvh (dynamic viewport height) évite le bug iOS avec la barre d'adresse
      */}
      <div 
        className="
          bg-white w-full flex flex-col overflow-hidden
          rounded-t-2xl sm:rounded-2xl
          h-[92dvh] sm:h-auto sm:max-h-[92vh]
          sm:max-w-3xl
          shadow-2xl
        "
      >
        
        {/* ── Header avec gradient ── fixe, ne scroll pas */}
        <div className="relative gradient-gazbf p-4 sm:p-6 flex-shrink-0">
          {/* Poignée drag visible sur mobile uniquement */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/40 rounded-full sm:hidden" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all text-white hover:scale-110"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-white pt-3 sm:pt-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                {/* Taille de titre adaptée : plus petite sur mobile pour ne pas couper */}
                <h2 className="text-lg sm:text-2xl font-bold leading-tight truncate">
                  Commande #{order.orderNumber}
                </h2>
                <p className="text-white/90 text-xs sm:text-sm">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Badges status + mode : flex wrap pour ne pas déborder */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 ${statusColors[status.color]} bg-white`}>
                {status.icon} {status.label}
              </span>
              {order.deliveryMode === 'delivery' ? (
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                  🚚 Livraison
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                  📦 Retrait sur place
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body scrollable ── prend tout l'espace restant */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Informations Client */}
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4 sm:p-5 border-2 border-primary-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-primary-500 rounded-lg flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="font-bold text-neutral-900 text-base sm:text-lg">
                Informations Client
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                <span className="font-bold text-neutral-900 text-sm sm:text-base">
                  {order.customer?.firstName} {order.customer?.lastName}
                </span>
              </div>

              {/* Sur mobile : phone + bouton empilés si besoin */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-700 font-medium text-sm sm:text-base">
                    {order.customer?.phone}
                  </span>
                </div>
                {isSeller && order.customer?.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContactCustomer}
                    className="self-start sm:self-auto"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Contacter
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Adresse de Livraison avec GPS */}
          {order.deliveryMode === 'delivery' && order.deliveryAddress && (
            <div className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl p-4 sm:p-5 border-2 border-accent-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-accent-500 rounded-lg flex-shrink-0">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h3 className="font-bold text-neutral-900 text-base sm:text-lg">
                  Adresse de Livraison
                </h3>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-accent-200">
                  <p className="font-bold text-neutral-900 mb-1 text-sm sm:text-base">
                    {order.deliveryAddress.label}
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-700">
                    {order.deliveryAddress.fullAddress}
                  </p>
                  {order.deliveryAddress.additionalInfo && (
                    <p className="text-xs sm:text-sm text-neutral-600 mt-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {order.deliveryAddress.additionalInfo}
                    </p>
                  )}
                </div>

                {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                  <>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-accent-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-accent-600" />
                          <span className="font-bold text-neutral-900 text-sm sm:text-base">
                            Coordonnées GPS
                          </span>
                        </div>
                        <span className="text-xs bg-accent-100 text-accent-700 px-2 py-1 rounded font-bold">
                          Précis
                        </span>
                      </div>
                      
                      {/* Coordonnées : layout plus compact sur mobile */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-600">Latitude:</span>
                          <span className="font-mono font-bold text-neutral-900">
                            {parseFloat(order.deliveryAddress.latitude).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-600">Longitude:</span>
                          <span className="font-mono font-bold text-neutral-900">
                            {parseFloat(order.deliveryAddress.longitude).toFixed(6)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={handleCopyCoordinates}
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2 text-accent-600" />
                            Coordonnées copiées !
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier les coordonnées
                          </>
                        )}
                      </Button>
                    </div>

                    {isSeller && (
                      <div className="flex flex-col gap-2.5">
                        <Button
                          variant="accent"
                          fullWidth
                          onClick={handleOpenGoogleMaps}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Ouvrir dans Google Maps
                        </Button>

                        <Button
                          variant="outline"
                          fullWidth
                          onClick={handleShareWhatsApp}
                          className="border-accent-500 text-accent-700 hover:bg-accent-50"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Partager via WhatsApp
                        </Button>

                        <p className="text-xs text-center text-neutral-600">
                          💡 Partagez la localisation avec votre livreur
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Note du client */}
          {order.customerNote && (
            <div className="bg-primary-50 rounded-xl p-3 sm:p-4 border-2 border-primary-200">
              <p className="text-xs text-primary-600 font-bold mb-1.5">
                💬 Note du client:
              </p>
              <p className="text-xs sm:text-sm text-neutral-900">{order.customerNote}</p>
            </div>
          )}

          {/* Produits */}
          <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 border-2 border-neutral-200">
            <h3 className="font-bold text-neutral-900 text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              Produits commandés
            </h3>
            
            <div className="space-y-2.5">
              {order.items?.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-lg p-3 sm:p-4 flex items-center justify-between border-2 border-neutral-200 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-sm sm:text-base truncate">
                      {item.product?.brand} {item.product?.bottleType}
                    </p>
                    <p className="text-xs sm:text-sm text-neutral-600 font-medium">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent text-sm sm:text-lg flex-shrink-0">
                    {formatPrice(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 sm:p-5 border-2 border-neutral-200">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-neutral-600 font-medium">Sous-total</span>
                <span className="font-bold text-neutral-900">{formatPrice(order.subtotal)}</span>
              </div>
              
              {order.deliveryMode === 'delivery' && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-neutral-600 font-medium">Frais de livraison</span>
                  <span className="font-bold text-neutral-900">
                    {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Gratuit'}
                  </span>
                </div>
              )}

              <div className="pt-2.5 sm:pt-3 border-t-2 border-neutral-200">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-bold text-neutral-900">Total</span>
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Temps estimé */}
          {order.estimatedTime && order.status !== 'completed' && (
            <div className="bg-secondary-50 rounded-xl p-3 sm:p-4 border-2 border-secondary-200 flex items-center gap-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-secondary-900">
                Temps estimé: {order.estimatedTime} minutes
              </p>
            </div>
          )}

          {/* Espace en bas pour ne pas que le footer masque le dernier élément */}
          <div className="h-1" />
        </div>

        {/* ── Footer ── fixe en bas, ne scroll pas */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t-2 border-neutral-200 bg-neutral-50">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;