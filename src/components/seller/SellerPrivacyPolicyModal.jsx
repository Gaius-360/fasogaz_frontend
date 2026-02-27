// ==========================================
// FICHIER: src/components/seller/SellerPrivacyPolicyModal.jsx
// ==========================================
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SellerPrivacyPolicyModal = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Politique de confidentialité</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-6 py-5 space-y-6 leading-relaxed text-gray-700">
          <p className="text-sm text-gray-500">Dernière mise à jour : 01/01/2026</p>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">1. Données collectées</h3>
            <p>Nous collectons uniquement les données nécessaires au bon fonctionnement du site, telles que les informations de contact et les données de navigation.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">2. Utilisation des données</h3>
            <p>Les données collectées sont utilisées pour améliorer l'expérience utilisateur, assurer la sécurité et répondre aux demandes.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">3. Cookies</h3>
            <p>Le site peut utiliser des cookies à des fins de statistiques et de fonctionnement. L'utilisateur peut les refuser via son navigateur.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">4. Partage des données</h3>
            <p>Aucune donnée personnelle n'est vendue ou partagée avec des tiers sans consentement, sauf obligation légale.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">5. Sécurité</h3>
            <p>Des mesures techniques et organisationnelles sont mises en place pour garantir la sécurité des données personnelles.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">6. Droits de l'utilisateur</h3>
            <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition.</p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t border-gray-200 flex-shrink-0"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerPrivacyPolicyModal;