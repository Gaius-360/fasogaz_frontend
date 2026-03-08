// ==========================================
// FICHIER: src/components/client/AddressSelector.jsx
// ==========================================
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Star } from 'lucide-react';
import Button from '../common/Button';
import { api } from '../../api/apiSwitch';
import Alert from '../common/Alert';

const AddressSelector = ({ selectedAddressId, onSelectAddress, onAddNew }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [alert, setAlert]         = useState(null);

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const response = await api.addresses.getMyAddresses();
      if (response.success) {
        setAddresses(response.data);
        // Pré-sélectionne l'adresse par défaut si rien n'est encore sélectionné
        if (!selectedAddressId && response.data.length > 0) {
          const def = response.data.find(a => a.isDefault) || response.data[0];
          onSelectAddress(def.id);
        }
      }
    } catch {
      setAlert({ type: 'error', message: 'Erreur lors du chargement des adresses' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <span className="inline-block h-7 w-7 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500 mt-2">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-10 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-3xl border-2 border-primary-100">
          <MapPin className="h-10 w-10 text-primary-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium mb-4">Aucune adresse enregistrée</p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 gradient-gazbf text-white text-sm font-bold rounded-2xl shadow active:scale-[.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Ajouter une adresse
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {addresses.map((address) => {
              const selected = selectedAddressId === address.id;
              return (
                <div
                  key={address.id}
                  onClick={() => onSelectAddress(address.id)}
                  className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 active:scale-[.99]
                    ${selected
                      ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-primary-200'
                    }`}
                >
                  {/* icône */}
                  <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${selected ? 'bg-primary-100' : 'bg-neutral-100'}`}>
                    <MapPin className={`h-4 w-4 ${selected ? 'text-primary-600' : 'text-neutral-400'}`} />
                  </div>

                  {/* texte */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-neutral-900 text-sm">{address.label}</p>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-semibold">
                          <Star className="h-2.5 w-2.5 fill-primary-500" />
                          Par défaut
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      {address.fullAddress || address.city}
                    </p>
                    {address.additionalInfo && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{address.additionalInfo}</p>
                    )}
                  </div>

                  {/* check */}
                  {selected && (
                    <div className="flex-shrink-0 p-1.5 bg-primary-500 rounded-full mt-0.5">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-neutral-300 text-sm font-semibold text-neutral-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
          >
            <Plus className="h-4 w-4" />
            Ajouter une nouvelle adresse
          </button>
        </>
      )}
    </div>
  );
};

export default AddressSelector;