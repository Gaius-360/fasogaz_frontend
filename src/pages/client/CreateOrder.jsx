// ==========================================
// FICHIER: src/pages/client/CreateOrder.jsx
// ==========================================
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Loader2, AlertCircle,
  Plus, Navigation, CheckCircle2
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import AddAddressModal from '../../components/client/AddAddressModal';
import { api } from '../../api/apiSwitch';
import { formatPrice } from '../../utils/helpers';
import useClientStore from '../../store/clientStore';

const CreateOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { seller, products } = location.state || {};
  const { createOrder } = useClientStore();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!seller || !products || products.length === 0) {
      navigate('/client/map');
      return;
    }
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const response = await api.addresses.getMyAddresses();
      if (response.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.addresses)
            ? response.data.addresses
            : [];
        setAddresses(list);
        const defaultAddr = list.find(a => a.isDefault);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
        else if (list.length > 0) setSelectedAddress(list[0].id);
      }
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors du chargement des adresses' });
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSubmitOrder = async () => {
    setAlert(null);

    if (!selectedAddress) {
      setAlert({ type: 'error', message: 'Veuillez sélectionner une adresse de livraison' });
      return;
    }

    const address = addresses.find(a => a.id === selectedAddress);
    if (!address?.latitude || !address?.longitude) {
      setAlert({
        type: 'error',
        message: "L'adresse sélectionnée n'a pas de coordonnées GPS. Veuillez la modifier."
      });
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        sellerId: seller.id,
        items: products.map(p => ({ productId: p.id, quantity: p.quantity })),
        deliveryAddressId: selectedAddress,
        customerNote: customerNote.trim() || null
      };
      const response = await createOrder(orderData);
      if (response.success) {
        setAlert({ type: 'success', message: 'Commande envoyée avec succès !' });
        setTimeout(() => navigate('/client/orders'), 1500);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erreur lors de la commande'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!seller || !products) return null;

  const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const deliveryFee = Number(seller.deliveryFee || 0);
  const total = subtotal + deliveryFee;
  const selectedAddr = addresses.find(a => a.id === selectedAddress);
  const hasGPS = selectedAddr?.latitude && selectedAddr?.longitude;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finaliser la commande</h1>
          <p className="text-sm text-gray-500">{seller.businessName}</p>
        </div>
      </div>

      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* ==========================================
          RÉCAPITULATIF PRODUITS
          ========================================== */}
      <Card>
        <div className="divide-y divide-gray-100">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {product.quantity}
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {product.brand} {product.bottleType}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(product.price * product.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Livraison</span>
            <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Gratuite'}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total à payer</span>
            <span className="text-primary-600">{formatPrice(total)}</span>
          </div>
          <p className="text-xs text-gray-400 text-right">Paiement en espèces au livreur</p>
        </div>
      </Card>

      {/* ==========================================
          ADRESSE DE LIVRAISON
          ========================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Adresse de livraison
          </h2>
          <button
            onClick={() => setShowAddressModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle adresse
          </button>
        </div>

        {loadingAddresses ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          </div>

        ) : addresses.length === 0 ? (
          <div
            onClick={() => setShowAddressModal(true)}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Aucune adresse enregistrée</p>
            <p className="text-xs text-gray-400">Appuyez pour en ajouter une</p>
          </div>

        ) : (
          <div className="space-y-2">
            {addresses.map((address) => {
              const isSelected = selectedAddress === address.id;
              const addrHasGPS = address.latitude && address.longitude;

              return (
                <button
                  key={address.id}
                  onClick={() => setSelectedAddress(address.id)}
                  className={`w-full text-left rounded-2xl border-2 transition-all duration-150 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/60'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">

                    {/* Radio visuel */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{address.label}</span>
                        {address.isDefault && (
                          <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            Par défaut
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 truncate">
                        {address.quarter}{address.city ? `, ${address.city}` : ''}
                      </p>

                      {address.additionalInfo && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{address.additionalInfo}</p>
                      )}

                      <div className="mt-2">
                        {addrHasGPS ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <Navigation className="h-2.5 w-2.5" />
                            Position GPS enregistrée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Sans GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Confirmation GPS sous la liste */}
        {selectedAddr && hasGPS && (
          <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-800">Coordonnées GPS transmises au livreur</p>
              <p className="text-[10px] font-mono text-green-600 mt-0.5">
                {parseFloat(selectedAddr.latitude).toFixed(5)}, {parseFloat(selectedAddr.longitude).toFixed(5)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          NOTE
          ========================================== */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Note{' '}
          <span className="normal-case font-normal text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="Ex : Urgent · 2ème portail à droite · Résidence XYZ..."
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition resize-none placeholder-gray-400"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{customerNote.length}/200</p>
      </div>

      {/* ==========================================
          BOUTON CONFIRMER
          ========================================== */}
      <div className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmitOrder}
          loading={loading}
          disabled={!selectedAddress || addresses.length === 0}
        >
          Confirmer · {formatPrice(total)}
        </Button>
        {selectedAddr && !hasGPS && (
          <p className="text-xs text-center text-yellow-600 mt-2 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Adresse sans GPS — livraison moins précise
          </p>
        )}
      </div>

      {showAddressModal && (
        <AddAddressModal
          onClose={() => setShowAddressModal(false)}
          onSuccess={() => { loadAddresses(); setShowAddressModal(false); }}
        />
      )}
    </div>
  );
};

export default CreateOrder;