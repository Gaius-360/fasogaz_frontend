// ==========================================
// FICHIER: src/components/client/ReviewModal.jsx
// ==========================================
import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/helpers';

const ReviewModal = ({ order, onClose, onSubmit, loading }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Veuillez sélectionner une note');
      return;
    }
    onSubmit({
      orderId: order.id,
      rating,
      comment: comment.trim() || null,
    });
  };

  const getRatingLabel = (r) => ({
    1: 'Très décevant',
    2: 'Décevant',
    3: 'Moyen',
    4: 'Bien',
    5: 'Excellent',
  }[r] || '');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
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
        className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl mb-[60px] sm:mb-0"
        style={{
          maxHeight: 'calc(90dvh - 60px)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        {/* Header — row 1 */}
        <div className="gradient-gazbf p-5 rounded-t-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Star className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">Donner un avis</h2>
            </div>
            <p className="text-white/90 text-sm">
              Partagez votre expérience avec ce revendeur
            </p>
          </div>
        </div>

        {/* Zone scrollable — row 2, minHeight:0 indispensable */}
        <div className="overflow-y-auto overscroll-contain p-5" style={{ minHeight: 0 }}>
          <div className="space-y-6">

            {/* Info commande */}
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 border-2 border-neutral-200">
              <p className="text-sm text-neutral-600 mb-1 font-medium">
                Commande #{order.orderNumber}
              </p>
              <p className="font-bold text-neutral-900 mb-3 text-lg">
                {order.seller?.businessName}
              </p>
              <div className="text-sm text-neutral-700 space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.product?.brand} {item.product?.bottleType} x{item.quantity}
                    </span>
                    <span className="font-bold">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-neutral-200 mt-3 pt-3">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-neutral-700">Total</span>
                  <span className="font-bold text-primary-600 text-lg">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Note étoiles */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-3">
                Votre note <span className="text-primary-600">*</span>
              </label>
              <div className="flex gap-2 justify-center bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4 border-2 border-primary-100">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={loading}
                    className="focus:outline-none transition-transform hover:scale-125 disabled:opacity-50"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-secondary-400 text-secondary-500'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-center text-neutral-700 mt-3 font-bold">
                  {getRatingLabel(rating)}
                </p>
              )}
            </div>

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-2">
                Votre avis (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec ce revendeur..."
                rows={4}
                maxLength={500}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 resize-none disabled:bg-neutral-50 disabled:text-neutral-500 transition-all"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {comment.length}/500 caractères
              </p>
            </div>

          </div>
        </div>

        {/* Footer boutons — row 3, toujours visible */}
        <div
          className="p-4 sm:p-5 border-t-2 border-neutral-100 bg-white"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              type="button"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="gradient"
              onClick={handleSubmit}
              loading={loading}
              disabled={rating === 0}
              className="flex-1 h-12 text-base font-bold shadow-gazbf-lg"
            >
              {loading ? 'Publication...' : 'Publier mon avis'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;