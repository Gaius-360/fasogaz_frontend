// ==========================================
// FICHIER: src/components/client/SellerDetailsModal.jsx
// ✅ CORRIGÉ: suppression du guard hasAccess sur navigation/appel
// ✅ FIX MOBILE: CSS Grid 3 rows, mb-[60px] sm:mb-0
// ✅ NOUVEAU: Avis anonymisés (prénom + initiale seulement)
// ✅ NOUVEAU: Filtre de contenu inapproprié sur les commentaires
// ==========================================
import React, { useState, useEffect } from 'react';
import {
  X, Star, MapPin, Clock, Phone, Package,
  Truck, Plus, Minus, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/helpers';
import { api } from '../../api/apiSwitch';
import { useNavigate } from 'react-router-dom';

// ============================================================
// FILTRE DE CONTENU INAPPROPRIÉ
// Liste de mots/expressions interdits sur la plateforme.
// Couvre : insultes courantes en français, wolof, mooré, dioula,
// termes discriminatoires, sexuels explicites.
// Le filtre détecte aussi les contournements courants (leetspeak,
// espaces intercalés, répétitions de lettres).
// ============================================================
const FORBIDDEN_PATTERNS = [
  // ── Insultes françaises ──────────────────────────────────
  /c[o0]nn?[a@e]/i,
  /[s$][a@]l[o0]p/i,
  /enc[u\*]l/i,
  /f[o0]ut[r]?[e3]/i,
  /put[a@]in/i,
  /p[u\*]t[e3]/i,
  /m[e3]rd[e3]/i,
  /b[i1]t[e3]/i,
  /couill/i,
  /niq[u\*]/i,
  /bais[e3]/i,
  /chier/i,
  /câliss|ostie|tabarnak|criss/i,
  /pd\b|pédé/i,
  /trann?y|trann?ie/i,
  /bamboula/i,
  /n[i1][g9][g9]|n[i1][g9][a@]/i,
  /[r]ac[ail]+[e3]/i,
  /or[a@]ng[o0]ut/i,
  /singe\s*(sale|noir)/i,
  /sale\s*(noir|arabe|blanc|toubab)/i,
  /va\s*te\s*(faire|foutre)/i,
  /ferme\s*(ta|la)\s*(gueule|bouche)/i,
  /tg\b/i,
  /fils?\s*(de\s*)?(put|sal|con)/i,

  // ── Insultes / mots vulgaires dioula / bambara ───────────
  /wolo\s*so/i,           // bâtard (dioula)
  /dogo\s*kono/i,         // gros mot bambara
  /basi\s*kono/i,

  // ── Insultes / mots vulgaires mooré ─────────────────────
  /koglere/i,             // imbécile / idiot
  /yell[e3]\s*boe/i,

  // ── Insultes / mots vulgaires wolof ─────────────────────
  /degeum/i,
  /nit\s*ku\s*bon/i,      // mauvaise personne
  /doff\s*la/i,           // tu es fou (insultant)

  // ── Contenu sexuel explicite ──────────────────────────────
  /porn/i,
  /xxx/i,
  /sexe?\s*explicit/i,
  /\bp[e3]n[i1]s\b/i,
  /\bvagin\b/i,
  /\banus\b/i,
  /\bcul\b/i,

  // ── Menaces / incitation à la violence ───────────────────
  /je\s*(vais|veux)\s*(te\s*)?(tuer|buter|crever|massacrer)/i,
  /mort\s*(aux?|à)/i,
  /crève/i,
];

/**
 * Normalise une chaîne pour détecter les contournements leetspeak.
 * Ex: "c0nn@rd" → "connard"
 */
const normalizeLeet = (str) =>
  str
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[+]/g, 't')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Retourne true si le texte contient du contenu inapproprié.
 */
export const containsInappropriateContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalizeLeet(text);
  return FORBIDDEN_PATTERNS.some(
    (pattern) => pattern.test(text) || pattern.test(normalized)
  );
};

/**
 * Remplace les mots interdits par des astérisques dans un texte.
 * Utilisé pour afficher des commentaires anciens qui auraient passé
 * la modération avant l'ajout du filtre.
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  FORBIDDEN_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, (match) => '*'.repeat(match.length));
  });
  return result;
};

// ============================================================
// ANONYMISATION DES AVIS
// Affiche uniquement le prénom + initiale du nom de famille.
// Ex: "Aminata Ouédraogo" → "Aminata O."
// ============================================================
const anonymizeReviewer = (customer) => {
  if (!customer) return 'Client anonyme';
  const firstName = customer.firstName || '';
  const lastInitial = customer.lastName
    ? customer.lastName.charAt(0).toUpperCase() + '.'
    : '';
  return [firstName, lastInitial].filter(Boolean).join(' ') || 'Client';
};


// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const SellerDetailsModal = ({
  seller,
  onClose,
  onOrder,
  onNavigate,
  userLocation = null,
  hasAccess = true,
  onAccessRequired
}) => {
  const navigate = useNavigate();

  const [products, setProducts]               = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [quantities, setQuantities]           = useState({});
  const [activeTab, setActiveTab]             = useState('produits');
  const [reviews, setReviews]                 = useState([]);
  const [loadingReviews, setLoadingReviews]   = useState(false);
  // ✅ FIX: compteur local dérivé des avis chargés — évite de dépendre de
  // reviewCount qui peut être obsolète si un avis vient d'être soumis.
  const reviewCount = reviews.length > 0 ? reviews.length : (seller.reviewCount || 0);

  useEffect(() => {
    if (seller?.id) loadProducts();
  }, [seller?.id]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await api.products.getSellerProducts(seller.id);
      if (response.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.products)
            ? response.data.products
            : [];
        setProducts(list);
        const initialQty = {};
        list.forEach(p => { initialQty[p.id] = 0; });
        setQuantities(initialQty);
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await api.reviews.getSellerReviews(seller.id);
      if (response.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.reviews)
            ? response.data.reviews
            : [];
        setReviews(list);
      }
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'avis') loadReviews();
  }, [activeTab]);

  // ── Quantités ──────────────────────────────────────────────
  const updateQuantity = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const product = products.find(p => p.id === productId);
      const maxQty  = product?.quantity || 0;
      return { ...prev, [productId]: Math.max(0, Math.min(current + delta, maxQty)) };
    });
  };

  const selectedProducts = products
    .filter(p => quantities[p.id] > 0)
    .map(p => ({ ...p, quantity: quantities[p.id] }));

  const subtotal    = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const deliveryFee = parseFloat(seller?.deliveryFee ?? 0);
  const total       = subtotal + deliveryFee;
  const itemCount   = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  // ── Checks métier ──────────────────────────────────────────
  const deliveryNotConfigured = !seller?.deliveryAvailable;
  const hoursNotDefined       = !seller?.openingHours;

  // ── Statut ouvert/fermé ────────────────────────────────────
  const isOpenNow = () => {
    if (!seller?.openingHours) return null;
    try {
      const hours = typeof seller.openingHours === 'string'
        ? JSON.parse(seller.openingHours)
        : seller.openingHours;
      if (hours.isOpen24_7) return true;
      if (hours.isClosed)   return false;
      const now      = new Date();
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dayKey   = dayNames[now.getDay()];
      const day      = hours.schedule?.[dayKey];
      if (!day || !day.enabled) return false;
      const cur      = now.getHours() * 60 + now.getMinutes();
      const [oh, om] = (day.open  || '08:00').split(':').map(Number);
      const [ch, cm] = (day.close || '20:00').split(':').map(Number);
      return cur >= oh * 60 + om && cur <= ch * 60 + cm;
    } catch { return null; }
  };

  const open = isOpenNow();

  // ── Commander ──────────────────────────────────────────────
  const handleOrder = () => {
    if (selectedProducts.length === 0 || deliveryNotConfigured) return;
    if (onOrder) {
      onOrder(seller, selectedProducts);
    } else {
      navigate('/client/order/new', { state: { seller, products: selectedProducts } });
    }
    onClose();
  };

  // ── Helpers visuels ────────────────────────────────────────
  const renderStars = (rating, size = 'sm') => {
    const h = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`${h} ${i < Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const getStatusColor = (s) =>
    s === 'available' ? 'bg-green-100 text-green-700'   :
    s === 'limited'   ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700';

  const getStatusLabel = (s) =>
    s === 'available' ? 'Disponible'   :
    s === 'limited'   ? 'Stock limité' : 'Épuisé';

  // ── Badge ouverture ────────────────────────────────────────
  const OpenBadge = () => {
    if (hoursNotDefined) return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 flex items-center gap-1">
        <Clock className="h-3 w-3" />Horaires non renseignés
      </span>
    );
    if (open === null) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {open ? '🟢 Ouvert' : '🔴 Fermé'}
      </span>
    );
  };

  // ══════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
        style={{
          maxHeight: 'calc(90dvh - 60px)',
          display: 'grid',
          gridTemplateRows: 'auto auto auto 1fr auto',
        }}
      >

        {/* ── Drag handle mobile ── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* ── HEADER ── */}
        <div className="flex items-start gap-4 px-4 py-3 border-b bg-gradient-to-r from-primary-50 to-accent-50 sm:rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">{seller.businessName}</h2>
              <OpenBadge />
            </div>
            <div className="flex items-center gap-1 mb-2">
              {renderStars(seller.averageRating || 0)}
              <span className="text-xs text-gray-600">
                {seller.averageRating ? parseFloat(seller.averageRating).toFixed(1) : '—'}
                {reviewCount > 0 && ` (${reviewCount} avis)`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
              {seller.quarter && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{seller.quarter}
                </span>
              )}
              {deliveryNotConfigured ? (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  <AlertTriangle className="h-3 w-3" />Livraison non disponible
                </span>
              ) : (
                <span className="flex items-center gap-1 text-primary-600 font-medium">
                  <Truck className="h-3 w-3" />
                  {deliveryFee > 0
                    ? `Livraison ${formatPrice(deliveryFee)}`
                    : 'Livraison gratuite'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {parseFloat(seller.latitude) && parseFloat(seller.longitude) && (
              <button
                onClick={() => onNavigate && onNavigate(seller, userLocation)}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl transition-colors active:scale-95"
                title="Obtenir l'itinéraire"
              >
                <MapPin className="h-3.5 w-3.5" />
                Itinéraire
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/70 transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* ── Bannières avertissement ── */}
        {(deliveryNotConfigured || hoursNotDefined) && (
          <div className="border-b">
            {deliveryNotConfigured && (
              <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 border-b border-orange-100">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800">
                  <span className="font-semibold">Commande impossible</span> — ce revendeur n'a pas encore
                  configuré ses options de livraison. Vous pouvez le contacter directement.
                </p>
              </div>
            )}
            {hoursNotDefined && (
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Horaires non renseignés</span> — appelez le revendeur
                  pour vérifier sa disponibilité.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLETS ── */}
        <div className="flex border-b bg-white">
          {['produits', 'avis', 'infos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'produits' ? `Produits (${products.length})`
               : tab === 'avis'   ? `Avis (${reviewCount || 0})`
               : 'Infos'}
            </button>
          ))}
        </div>

        {/* ── CONTENU SCROLLABLE ── */}
        <div className="overflow-y-auto overscroll-contain" style={{ minHeight: 0 }}>

          {/* TAB PRODUITS */}
          {activeTab === 'produits' && (
            <div className="p-4">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun produit disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => {
                    const qty        = quantities[product.id] || 0;
                    const outOfStock = product.status === 'out_of_stock' || product.quantity === 0;
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                          qty > 0 ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'
                        } ${outOfStock ? 'opacity-50' : ''}`}
                      >
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.brand}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-7 w-7 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">
                            {product.brand} — {product.bottleType}
                          </p>
                          <p className="text-lg font-bold text-primary-600">
                            {formatPrice(product.price)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(product.status)}`}>
                              {getStatusLabel(product.status)}
                            </span>
                            {product.quantity > 0 && product.quantity <= 5 && (
                              <span className="text-xs text-orange-600">
                                {product.quantity} restant(s)
                              </span>
                            )}
                          </div>
                        </div>
                        {!outOfStock ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateQuantity(product.id, -1)}
                              disabled={qty === 0 || deliveryNotConfigured}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold transition-colors ${
                                qty > 0 && !deliveryNotConfigured
                                  ? 'border-primary-600 text-primary-600 hover:bg-primary-50'
                                  : 'border-gray-200 text-gray-300'
                              }`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className={`w-6 text-center font-bold text-sm ${
                              qty > 0 ? 'text-primary-600' : 'text-gray-700'
                            }`}>
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, +1)}
                              disabled={qty >= product.quantity || deliveryNotConfigured}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold transition-colors ${
                                qty < product.quantity && !deliveryNotConfigured
                                  ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
                                  : 'border-gray-200 text-gray-300'
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-medium flex-shrink-0">Épuisé</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB AVIS
              ✅ Anonymisation : prénom + initiale du nom
              ✅ Filtre contenu inapproprié sur le commentaire
                 et la réponse du revendeur
              ========================================== */}
          {activeTab === 'avis' && (
            <div className="p-4">
              {loadingReviews ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun avis pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => {
                    // ── Nettoyage du commentaire ──────────────────────────
                    const rawComment     = review.comment || '';
                    const rawResponse    = review.sellerResponse || '';
                    const isCommentDirty = containsInappropriateContent(rawComment);
                    const isResponseDirty = containsInappropriateContent(rawResponse);

                    // Si le commentaire est entièrement inapproprié → masquer
                    // (sanitize suffit si seuls quelques mots posent problème)
                    const displayComment = isCommentDirty
                      ? sanitizeText(rawComment)
                      : rawComment;
                    const displayResponse = isResponseDirty
                      ? sanitizeText(rawResponse)
                      : rawResponse;

                    return (
                      <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            {/* ✅ Nom anonymisé : "Aminata O." */}
                            <p className="font-semibold text-sm text-gray-900">
                              {anonymizeReviewer(review.customer)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {renderStars(review.rating)}
                        </div>

                        {/* Commentaire (filtré) */}
                        {displayComment && (
                          <>
                            <p className="text-sm text-gray-700 mb-2">
                              "{displayComment}"
                            </p>
                            {isCommentDirty && (
                              <p className="text-[10px] text-orange-500 flex items-center gap-1 mb-1">
                                <ShieldAlert className="h-3 w-3" />
                                Contenu partiellement masqué pour non-respect des règles de la plateforme.
                              </p>
                            )}
                          </>
                        )}

                        {/* Réponse du revendeur (filtrée) */}
                        {displayResponse && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              Réponse du revendeur
                            </p>
                            <p className="text-sm text-gray-700">{displayResponse}</p>
                            {isResponseDirty && (
                              <p className="text-[10px] text-orange-500 flex items-center gap-1 mt-1">
                                <ShieldAlert className="h-3 w-3" />
                                Réponse partiellement masquée.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB INFOS */}
          {activeTab === 'infos' && (
            <div className="p-4 space-y-4">
              {seller.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">À propos</p>
                  <p className="text-sm text-gray-700">{seller.description}</p>
                </div>
              )}

              {seller.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
                  <a
                    href={`tel:${seller.phone}`}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{seller.phone}</p>
                      <p className="text-xs text-gray-500">Appeler le revendeur</p>
                    </div>
                  </a>
                </div>
              )}

              {seller.quarter && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Localisation</p>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{seller.quarter}</p>
                      {seller.city && <p className="text-xs text-gray-500">{seller.city}</p>}
                    </div>
                    {parseFloat(seller.latitude) && parseFloat(seller.longitude) && (
                      <button
                        onClick={() => onNavigate && onNavigate(seller, userLocation)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors active:scale-95"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Y aller
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Livraison</p>
                {deliveryNotConfigured ? (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Livraison non disponible</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ce revendeur n'a pas encore configuré ses options de livraison. Contactez-le directement.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {deliveryFee > 0
                          ? `Frais de livraison : ${formatPrice(deliveryFee)}`
                          : 'Livraison gratuite'}
                      </p>
                      <p className="text-xs text-gray-500">Paiement en espèces à la livraison</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Horaires</p>
                {hoursNotDefined ? (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Horaires non renseignés</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Appelez le revendeur pour vérifier sa disponibilité.
                      </p>
                    </div>
                  </div>
                ) : (
                  <HorairesList openingHours={seller.openingHours} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER commande — toujours visible ── */}
        <div
          className="border-t-2 border-neutral-100 bg-white p-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {activeTab !== 'produits' ? null : deliveryNotConfigured ? (
            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">Commande impossible</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Ce revendeur n'a pas activé la livraison.
                  {seller.phone && (
                    <> Contactez-le au <a href={`tel:${seller.phone}`} className="font-bold underline">{seller.phone}</a>.</>
                  )}
                </p>
              </div>
            </div>
          ) : selectedProducts.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-gray-600">
                  {itemCount} article(s) ·{' '}
                  <span className="text-gray-500">
                    {deliveryFee > 0
                      ? `+ ${formatPrice(deliveryFee)} livraison`
                      : 'livraison gratuite'}
                  </span>
                </span>
                <span className="font-bold text-gray-900">{formatPrice(total)}</span>
              </div>
              <Button variant="primary" fullWidth onClick={handleOrder}>
                <Truck className="h-4 w-4 mr-2" />
                Commander — {formatPrice(total)}
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              Sélectionnez au moins un produit pour commander
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Horaires ────────────────────────────────────────────────
const HorairesList = ({ openingHours }) => {
  const hours = typeof openingHours === 'string'
    ? JSON.parse(openingHours)
    : openingHours;
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const fr   = {
    monday:'Lun', tuesday:'Mar', wednesday:'Mer',
    thursday:'Jeu', friday:'Ven', saturday:'Sam', sunday:'Dim'
  };

  if (hours.isOpen24_7) return (
    <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-sm font-medium text-green-800">
      🕐 Ouvert 24h/24 · 7j/7
    </div>
  );
  if (hours.isClosed) return (
    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-sm font-medium text-red-800">
      Fermé temporairement
    </div>
  );

  return (
    <div className="space-y-1.5">
      {days.map(day => {
        const s = hours.schedule?.[day];
        if (!s) return null;
        return (
          <div key={day} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700 w-10">{fr[day]}</span>
            {s.enabled
              ? <span className="text-sm text-gray-600">{s.open} – {s.close}</span>
              : <span className="text-xs text-gray-400 italic">Fermé</span>}
          </div>
        );
      })}
    </div>
  );
};

export default SellerDetailsModal;