// ==========================================
// FICHIER: src/hooks/usePayment.js
// ✅ Types acceptés: 'subscription' | 'client_subscription'
// ==========================================

import { useState } from 'react';
import { api } from '../api/apiSwitch';

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  /**
   * Initier un paiement et rediriger vers LigdiCash
   * @param {number} amount
   * @param {'subscription'|'client_subscription'} type
   * @param {{ planType: string }} metadata
   */
  const initiatePayment = async (amount, type, metadata = {}) => {
    setLoading(true);
    setError(null);

    try {
      console.log('💳 Initiation paiement:', { amount, type, metadata });

      const response = await api.payments.initiatePayment({ amount, type, metadata });

      if (response?.success && response.data) {
        console.log('✅ Paiement initié:', response.data);
        if (response.data.isSimulation) console.log('🧪 Mode SIMULATION activé');

        // Redirection vers la page de paiement LigdiCash
        window.location.href = response.data.paymentUrl;
        return response.data;
      }

      throw new Error(response?.message || "Erreur lors de l'initiation du paiement");

    } catch (err) {
      console.error('❌ Erreur paiement:', err);
      const msg = err.message || 'Erreur lors du paiement';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifier le statut d'une transaction après retour LigdiCash
   */
  const checkPaymentStatus = async (transactionNumber) => {
    try {
      const response = await api.payments.checkStatus(transactionNumber);
      if (response?.success) return response.data;
      throw new Error('Impossible de vérifier le statut');
    } catch (err) {
      console.error('❌ Erreur statut:', err);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return { loading, error, initiatePayment, checkPaymentStatus, clearError };
};

export default usePayment;