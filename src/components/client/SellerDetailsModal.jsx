// ==========================================
// FICHIER: src/components/client/SellerDetailsModal.jsx
// Modal détails revendeur avec couleurs FasoGaz
// ==========================================
import React, { useState, useEffect } from 'react';
import { X, Star, Phone, MapPin, Navigation, Package, Truck, Building2, Lock, Clock } from 'lucide-react';
import Button from '../common/Button';
import AccessPurchaseModal from './AccessPurchaseModal';
import { formatPrice, formatDistance } from '../../utils/helpers';
import { api } from '../../api/apiSwitch';
import { OpeningHoursDisplay } from '../seller/OpeningHoursDisplay';

const SellerDetailsModal = ({ 
  seller, 
  onClose, 
  onOrder, 
  onNavigate,
  hasAccess = false,
  onAccessRequired
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [isOpen, setIsOpen] = useState(null);

  const checkIfOpen = () => {
    if (!seller?.openingHours) return null;

    const openingHours = seller.openingHours;

    if (openingHours.isOpen24_7) return true;
    if (openingHours.isClosed) return false;

    const now = new Date();
    const daysMap = {
      'dimanche': 'sunday',
      'lundi': 'monday',
      'mardi': 'tuesday',
      'mercredi': 'wednesday',
      'jeudi': 'thursday',
      'vendredi': 'friday',
      'samedi': 'saturday'
    };
    
    const currentDayFr = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
    const currentDay = daysMap[currentDayFr];
    const currentTime = now.toTimeString().slice(0, 5);

    const todaySchedule = openingHours.schedule?.[currentDay];
    
    if (!todaySchedule || !todaySchedule.enabled) return false;

    return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
  };

  useEffect(() => {
    if (hasAccess && seller && seller.products && seller.products.length > 0) {
      seller.products.forEach(product => {
        incrementProductView(product.id);
      });
    }
    
    setIsOpen(checkIfOpen());
    
    const interval = setInterval(() => {
      setIsOpen(checkIfOpen());
    }, 60000);

    return () => clearInterval(interval);
  }, [seller?.id, hasAccess, seller?.openingHours]);

  const incrementProductView = async (productId) => {
    try {
      await api.products.incrementView(productId);
    } catch (error) {
      console.error('Erreur incrémentation vue:', error);
    }
  };

  if (!seller) return null;

  const displayName = seller.businessName || 
                      `${seller.firstName || ''} ${seller.lastName || ''}`.trim() ||
                      `Dépôt ${seller.quarter || seller.city || 'Gaz'}`;

  const handleProtectedAction = (action, ...args) => {
    if (!hasAccess) {
      setShowAccessModal(true);
      return;
    }
    action(...args);
  };

  const handleAccessPurchased = () => {
    setShowAccessModal(false);
    if (onAccessRequired) {
      onAccessRequired();
    }
  };

  const toggleProduct = (product) => {
    if (!hasAccess) {
      setShowAccessModal(true);
      return;
    }

    if (isOpen === false) return;
    
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId, quantity) => {
    setSelectedProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p)
    );
  };

  const total = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  const handleOrder = () => {
    if (!hasAccess) {
      setShowAccessModal(true);
      return;
    }

    if (isOpen === false) return;

    onOrder(seller, selectedProducts);
  };

  const handleNavigate = () => {
    if (!hasAccess) {
      setShowAccessModal(true);
      return;
    }
    if (onNavigate) {
      onNavigate(seller);
    }
  };

  const handleCall = () => {
    if (!hasAccess) {
      setShowAccessModal(true);
      return;
    }
    window.location.href = `tel:${seller.phone}`;
  };

  return (
    <>
      {/* Overlay — inset-0 + flex centré */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
        {/*
          FIX MOBILE :
          - Retiré overflow-hidden du conteneur principal (il coupait le footer)
          - Ajout overflow-hidden uniquement sur la zone scrollable via le wrapper
          - Le conteneur flex-col laisse maintenant le footer toujours visible
          - max-h réduit légèrement pour laisser de la marge sur les petits écrans
        */}
        <div
          className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl animate-scale-in mb-[60px] sm:mb-0"
          style={{ maxHeight: 'calc(88dvh - 60px)', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}
        >
          
          {/* Header avec gradient */}
          <div className="gradient-gazbf p-5 sm:p-6 rounded-t-2xl">
            {/* Bouton fermer — positionné via relative sur le header */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-white pr-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {!seller.businessName && (
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                )}
                <h2 className="text-xl sm:text-2xl font-bold leading-tight break-words">
                  {displayName}
                </h2>
                {isOpen === false && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    FERMÉ
                  </span>
                )}
                {isOpen === true && (
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    OUVERT
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{seller.quarter || 'Quartier non précisé'}, {seller.city}</span>
                </div>
                {seller.averageRating > 0 ? (
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm flex-shrink-0">
                    <Star className="h-4 w-4 fill-secondary-400 text-secondary-400" />
                    <span className="font-bold">
                      {parseFloat(seller.averageRating).toFixed(1)}
                    </span>
                    <span>({seller.totalReviews} avis)</span>
                  </div>
                ) : (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm font-semibold flex-shrink-0">
                    Nouveau revendeur
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Zone scrollable — min-h-0 essentiel pour que le grid row 1fr scroll correctement */}
          <div className="overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6" style={{ minHeight: 0 }}>
            
            {/* Message si le dépôt est fermé */}
            {isOpen === false && hasAccess && (
              <div className="mb-5 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">
                      🕐 Dépôt actuellement fermé
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-700">
                      Ce dépôt est fermé pour le moment. Les commandes seront disponibles pendant les heures d'ouverture. Consultez les horaires ci-dessous.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message d'accès requis */}
            {!hasAccess && (
              <div className="mb-5 bg-gradient-to-r from-secondary-50 to-secondary-100 border-2 border-secondary-300 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-2">
                      🔒 Informations protégées
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-700 mb-4">
                      Pour accéder aux coordonnées, à l'itinéraire et passer commande, vous devez acheter un accès 24h.
                    </p>
                    <Button
                      variant="gradient"
                      onClick={() => setShowAccessModal(true)}
                    >
                      Débloquer l'accès maintenant
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Localisation */}
            <div className="mb-5">
              <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                Localisation
              </h3>
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 space-y-3 border-2 border-neutral-200">
                <p className="text-neutral-700 text-sm sm:text-base">
                  <span className="font-bold">Quartier:</span> {seller.quarter || 'Non précisé'}
                </p>
                <p className="text-neutral-700 text-sm sm:text-base">
                  <span className="font-bold">Ville:</span> {seller.city}
                </p>
                {seller.distance !== null && seller.distance !== undefined && (
                  <p className="text-neutral-700 text-sm sm:text-base">
                    <span className="font-bold">Distance:</span>{' '}
                    <span className="font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                      {formatDistance(seller.distance)}
                    </span>
                  </p>
                )}
                
                {seller.latitude && seller.longitude ? (
                  <Button
                    variant={hasAccess ? "primary" : "outline"}
                    fullWidth
                    onClick={handleNavigate}
                    className="mt-2"
                    disabled={!hasAccess}
                  >
                    {hasAccess ? (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Obtenir l'itinéraire
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Itinéraire (Accès requis)
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="bg-secondary-50 border-2 border-secondary-200 rounded-lg p-3 mt-2">
                    <p className="text-sm text-secondary-800 flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      Coordonnées GPS non disponibles
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Heures d'ouverture */}
            <OpeningHoursDisplay openingHours={seller.openingHours} />

            {/* Contact et Livraison — grid 1 col sur très petit mobile, 2 cols sinon */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 mb-5">
              <button
                onClick={handleCall}
                disabled={!hasAccess}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all border-2 w-full ${
                  hasAccess 
                    ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200 hover:border-primary-300 cursor-pointer' 
                    : 'bg-neutral-100 border-neutral-200 cursor-not-allowed opacity-60'
                }`}
              >
                {hasAccess ? (
                  <Phone className="h-5 w-5 text-primary-600 flex-shrink-0" />
                ) : (
                  <Lock className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                )}
                <div className="text-left min-w-0">
                  <p className="text-xs text-neutral-600 font-medium">Téléphone</p>
                  <p className="font-bold text-neutral-900 truncate">
                    {hasAccess ? seller.phone : '*** *** ****'}
                  </p>
                </div>
              </button>

              {seller.deliveryAvailable ? (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl border-2 border-accent-200">
                  <Truck className="h-5 w-5 text-accent-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-600 font-medium">Livraison disponible</p>
                    <p className="font-bold text-accent-700 truncate">
                      {seller.deliveryFee > 0 ? formatPrice(seller.deliveryFee) : 'Gratuit'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-xl border-2 border-neutral-200">
                  <Truck className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-600 font-medium">Livraison</p>
                    <p className="text-sm text-neutral-500 font-medium">Non disponible</p>
                  </div>
                </div>
              )}
            </div>

            {/* Produits */}
            <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-600" />
              Produits disponibles ({seller.products?.length || 0})
            </h3>
            
            {!seller.products || seller.products.length === 0 ? (
              <div className="bg-neutral-50 rounded-xl p-8 text-center border-2 border-neutral-200">
                <Package className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                <p className="text-neutral-500 font-medium">Aucun produit disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seller.products.map((product) => {
                  const isSelected = selectedProducts.find(p => p.id === product.id);
                  const isAvailable = product.status === 'available' || product.status === 'limited';
                  const canOrder = isAvailable && (isOpen === true || isOpen === null) && hasAccess;

                  return (
                    <div
                      key={product.id}
                      className={`border-2 rounded-xl p-3 sm:p-4 transition-all ${
                        isSelected 
                          ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-gazbf' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      } ${(!isAvailable || isOpen === false) && 'opacity-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-neutral-900 text-sm sm:text-base truncate">
                            {product.brand} - {product.bottleType}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                              {formatPrice(product.price)}
                            </span>
                            {product.status === 'available' && (isOpen === true || isOpen === null) && (
                              <span className="text-xs sm:text-sm text-accent-600 font-bold">✓ Disponible</span>
                            )}
                            {product.status === 'limited' && (isOpen === true || isOpen === null) && (
                              <span className="text-xs sm:text-sm text-secondary-600 font-bold">⚠ Quantité faible</span>
                            )}
                            {product.status === 'out_of_stock' && (
                              <span className="text-xs sm:text-sm text-red-600 font-bold">✗ Rupture</span>
                            )}
                            {isOpen === false && isAvailable && (
                              <span className="text-xs sm:text-sm text-red-600 font-bold">🕐 Fermé</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                            <span>{product.viewCount || 0} vue{(product.viewCount || 0) !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{product.orderCount || 0} vente{(product.orderCount || 0) !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {isAvailable && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isSelected ? (
                              <>
                                <button
                                  onClick={() => updateQuantity(product.id, isSelected.quantity - 1)}
                                  className="w-8 h-8 rounded-full border-2 border-neutral-300 flex items-center justify-center hover:bg-neutral-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!canOrder}
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-bold text-sm">
                                  {isSelected.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(product.id, isSelected.quantity + 1)}
                                  className="w-8 h-8 rounded-full border-2 border-neutral-300 flex items-center justify-center hover:bg-neutral-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!canOrder}
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => toggleProduct(product)}
                                  className="ml-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!canOrder}
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleProduct(product)}
                                disabled={!canOrder}
                              >
                                {!hasAccess ? (
                                  <Lock className="h-4 w-4" />
                                ) : isOpen === false ? (
                                  <Clock className="h-4 w-4" />
                                ) : (
                                  'Ajouter'
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spacer pour que le dernier produit ne soit pas caché sous le footer fixe */}
            <div className="h-2" />
          </div>

          {/* Footer — grid row 'auto' le garde toujours visible sous la zone scroll */}
          {selectedProducts.length > 0 && hasAccess ? (
            <div className="p-4 sm:p-6 border-t-2 border-neutral-100 bg-neutral-50"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-neutral-700 font-bold">Total</span>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                  {formatPrice(total)}
                </span>
              </div>
              <Button
                variant="gradient"
                fullWidth
                onClick={handleOrder}
                disabled={isOpen === false}
                className="h-12 text-base font-bold shadow-gazbf-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOpen === false ? (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Dépôt fermé - Commande impossible
                  </>
                ) : (
                  <>Commander ({selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''})</>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex-shrink-0 p-4 sm:p-6 border-t-2 border-neutral-100"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Button variant="outline" fullWidth onClick={onClose}>
                Fermer
              </Button>
            </div>
          )}
        </div>
      </div>

      {showAccessModal && (
        <AccessPurchaseModal
          onClose={() => setShowAccessModal(false)}
          onSuccess={handleAccessPurchased}
        />
      )}
    </>
  );
};

export default SellerDetailsModal;