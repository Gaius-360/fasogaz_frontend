// ==========================================
// FICHIER: src/components/seller/ProductCard.jsx
// Carte produit avec couleurs FasoGaz
// ==========================================
import React from 'react';
import { Edit, Trash2, Eye, ShoppingCart, Package } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/helpers';

const ProductCard = ({ product, onEdit, onDelete }) => {
  const statusConfig = {
    available: {
      label: 'En stock',
      color: 'text-accent-700 bg-accent-100 border-accent-300',
      dot: 'bg-accent-500',
    },
    limited: {
      label: 'Stock limité',
      color: 'text-secondary-700 bg-secondary-100 border-secondary-300',
      dot: 'bg-secondary-500',
    },
    out_of_stock: {
      label: 'Rupture',
      color: 'text-red-700 bg-red-100 border-red-300',
      dot: 'bg-red-500',
    },
  };

  // Fallback si le statut reçu n'est pas dans la config
  const status = statusConfig[product.status] ?? {
    label: product.status ?? '—',
    color: 'text-neutral-600 bg-neutral-100 border-neutral-300',
    dot: 'bg-neutral-400',
  };

  const isOutOfStock = product.status === 'out_of_stock';

  return (
    <div
      className={`bg-white rounded-xl border-2 p-4 transition-all duration-200 flex flex-col gap-4 ${
        isOutOfStock
          ? 'border-neutral-200 opacity-75'
          : 'border-neutral-200 hover:border-secondary-300 hover:shadow-gazbf'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icône produit */}
          <div className="p-2 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl border border-primary-100 flex-shrink-0">
            <Package className="h-5 w-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-neutral-900 truncate">
              {product.brand}
            </h3>
            <p className="text-sm text-neutral-500 font-medium truncate">
              {product.bottleType}
            </p>
          </div>
        </div>

        {/* Badge statut avec point animé */}
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${product.status === 'available' ? 'animate-pulse' : ''}`} />
          {status.label}
        </span>
      </div>

      {/* Prix et stock */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl">
        <div>
          <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-wide">
            Prix unitaire
          </p>
          <p className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent leading-tight">
            {formatPrice(product.price)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-wide">
            Stock
          </p>
          <p className={`text-lg font-bold leading-tight ${
            product.quantity === 0
              ? 'text-red-600'
              : product.quantity <= 5
              ? 'text-secondary-600'
              : 'text-neutral-900'
          }`}>
            {product.quantity ?? 0}
            <span className="text-sm font-medium text-neutral-500 ml-1">unités</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-50 rounded-lg">
            <Eye className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <span className="font-medium">{product.viewCount ?? 0} vues</span>
        </div>
        <div className="w-px h-4 bg-neutral-200" />
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent-50 rounded-lg">
            <ShoppingCart className="h-3.5 w-3.5 text-accent-600" />
          </div>
          <span className="font-medium">{product.orderCount ?? 0} ventes</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-neutral-100">
        <Button
          variant="outline"
          fullWidth
          size="sm"
          onClick={() => onEdit(product)}
        >
          <Edit className="h-4 w-4 mr-1.5" />
          Modifier
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(product)}
          className="text-red-500 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
          title="Supprimer le produit"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;