// ==========================================
// FICHIER: src/components/client/SearchFilters.jsx
// ✅ CORRIGÉ:
//   - Texte "accès 24h" → "abonnement"
//   - filtersLocked: verrouillé UNIQUEMENT si système actif ET pas d'abonnement
//     (si système désactivé accessType='free' → filtres libres)
//   - Label rayon adapté selon abonnement :
//     abonné   → "Rayon autour de ma position" (toutes villes)
//     non-abonné (free) → "Rayon autour de mon adresse"
// ==========================================
import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, MapPin, Tag, DollarSign, Zap, Lock } from 'lucide-react';
import Button from '../common/Button';
import { BOTTLE_TYPES, BRANDS } from '../../constants';

const SearchFilters = ({
  onApplyFilters,
  initialFilters = {},
  hasAccess    = false,
  accessType   = 'none'  // 'free' | 'active' | 'trial' | 'none' | 'error'
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    bottleType: initialFilters.bottleType || '',
    brand:      initialFilters.brand      || '',
    minPrice:   initialFilters.minPrice   || '',
    maxPrice:   initialFilters.maxPrice   || '',
    radius:     initialFilters.radius     || ''
  });

  // ✅ Verrouillé SEULEMENT si le système est actif ET l'utilisateur n'a pas d'abonnement
  // Si accessType === 'free' (système désactivé) → filtres libres
  const filtersLocked = !hasAccess && accessType !== 'free';

  const handleChange = (e) => {
    if (filtersLocked) return;
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    if (filtersLocked) return;
    onApplyFilters(filters);
    setShowFilters(false);
  };

  const handleReset = () => {
    if (filtersLocked) return;
    const reset = { bottleType: '', brand: '', minPrice: '', maxPrice: '', radius: '' };
    setFilters(reset);
    onApplyFilters(reset);
  };

  const handleToggleFilters = () => {
    if (filtersLocked) return;
    setShowFilters(!showFilters);
  };

  const activeFiltersCount = [filters.bottleType, filters.brand, filters.minPrice, filters.maxPrice]
    .filter(Boolean).length + (filters.radius ? 1 : 0);

  // ✅ Label et texte du rayon selon l'abonnement
  const radiusLabel      = hasAccess
    ? 'Rayon autour de ma position'
    : 'Rayon autour de mon adresse';
  const radiusEmptyLabel = hasAccess
    ? 'Toutes les villes'
    : 'Toute la ville';

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-neutral-200 overflow-hidden">

      {/* ── Bannière verrou ── */}
      {filtersLocked && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-300">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-amber-900 text-xs sm:text-sm mb-1">
                🔒 Filtres de recherche verrouillés
              </h3>
              <p className="text-[10px] sm:text-xs text-amber-800">
                Abonnez-vous pour utiliser les filtres de recherche avancés.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Barre principale ── */}
      <div className="p-2 sm:p-3">
        <div className="flex items-center gap-2">
          <Button
            variant={filtersLocked ? 'outline' : showFilters ? 'gradient' : 'outline'}
            onClick={handleToggleFilters}
            disabled={filtersLocked}
            size="sm"
            className={`flex-1 relative text-xs sm:text-sm ${filtersLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {filtersLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="font-semibold">Filtres verrouillés</span>
              </>
            ) : (
              <>
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="font-semibold">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-secondary-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </>
            )}
          </Button>

          {!filtersLocked && activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs sm:text-sm font-medium"
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Panel filtres ── */}
      {!filtersLocked && (
        <div className={`overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-[600px]' : 'max-h-0'}`}>
          <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 border-t border-neutral-100">

            {/* Type + Marque + Prix min + Prix max */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-neutral-700">
                  <Tag className="h-3 w-3 text-primary-600" />
                  <span>Type</span>
                </label>
                <select
                  name="bottleType"
                  value={filters.bottleType}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Tous</option>
                  {BOTTLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-neutral-700">
                  <Zap className="h-3 w-3 text-secondary-600" />
                  <span>Marque</span>
                </label>
                <select
                  name="brand"
                  value={filters.brand}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Toutes</option>
                  {BRANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-neutral-700">
                  <DollarSign className="h-3 w-3 text-accent-600" />
                  <span>Prix min</span>
                </label>
                <input
                  type="number"
                  name="minPrice"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-neutral-700">
                  <DollarSign className="h-3 w-3 text-accent-600" />
                  <span>Prix max</span>
                </label>
                <input
                  type="number"
                  name="maxPrice"
                  placeholder="∞"
                  value={filters.maxPrice}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Rayon */}
            <div className="space-y-2 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-3 sm:p-4 border-2 border-primary-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
                  <MapPin className="h-4 w-4 text-secondary-600" />
                  {/* ✅ Label dynamique selon abonnement */}
                  {radiusLabel}
                </label>
                {filters.radius ? (
                  <span className="px-3 py-1 gradient-gazbf text-white rounded-full text-sm font-bold shadow-md">
                    {filters.radius} km
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-full text-xs font-semibold">
                    {/* ✅ Texte dynamique selon abonnement */}
                    {radiusEmptyLabel}
                  </span>
                )}
              </div>

              <input
                type="range"
                name="radius"
                min="0"
                max="30"
                step="1"
                value={filters.radius || 0}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters(prev => ({ ...prev, radius: v === '0' ? '' : v }));
                }}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: filters.radius
                    ? `linear-gradient(to right, #EF4444 0%, #F59E0B ${(parseInt(filters.radius) / 30) * 100}%, #d1d5db ${(parseInt(filters.radius) / 30) * 100}%, #d1d5db 100%)`
                    : '#d1d5db'
                }}
              />

              <div className="flex justify-between items-center text-xs font-semibold text-neutral-400">
                {/* ✅ Texte dynamique selon abonnement */}
                <span>{radiusEmptyLabel}</span>
                <span>30 km</span>
              </div>
            </div>

            <Button
              variant="gradient"
              fullWidth
              onClick={handleApply}
              size="sm"
              className="text-xs sm:text-sm font-semibold"
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              Rechercher
            </Button>
          </div>
        </div>
      )}

      {/* ── Résumé filtres actifs ── */}
      {!filtersLocked && activeFiltersCount > 0 && !showFilters && (
        <div className="px-2 sm:px-3 pb-2 sm:pb-3 flex flex-wrap gap-1.5">
          {filters.bottleType && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <Tag className="h-2.5 w-2.5" />
              {BOTTLE_TYPES.find(t => t.value === filters.bottleType)?.label}
            </span>
          )}
          {filters.brand && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <Zap className="h-2.5 w-2.5" />
              {BRANDS.find(b => b.value === filters.brand)?.label}
            </span>
          )}
          {(filters.minPrice || filters.maxPrice) && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <DollarSign className="h-2.5 w-2.5" />
              {filters.minPrice || '0'}–{filters.maxPrice || '∞'}
            </span>
          )}
          {filters.radius && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <MapPin className="h-2.5 w-2.5" />
              {filters.radius} km
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;