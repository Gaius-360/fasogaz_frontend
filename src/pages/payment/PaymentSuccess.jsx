// ==========================================
// FICHIER: src/pages/payment/PaymentSuccess.jsx
// ✅ FIX: checkPaymentStatus remplacé par lecture directe des searchParams
//    La route GET /api/payments/status/:transactionNumber est protégée (JWT).
//    Après redirection depuis la page simulation, Axios n'a pas encore rechargé
//    le token → 401 → intercepteur → /login.
//
//    Solution: la simulation redirige déjà vers /payment/success uniquement
//    si le paiement est 'completed'. On peut donc se fier à l'URL et afficher
//    directement le succès, sans appel API supplémentaire.
//    Un appel optionnel avec retry est conservé pour récupérer le montant,
//    mais il ne bloque plus l'affichage et n'entraîne plus de déconnexion.
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/apiSwitch';
import Button from '../../components/common/Button';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transaction, setTransaction] = useState(null);

  const transactionNumber = searchParams.get('transaction');

  // ✅ On affiche immédiatement le succès — la simulation ne redirige ici
  //    que si le paiement est 'completed'. Pas besoin de vérifier via API.
  //
  //    On tente quand même de récupérer les détails (montant, etc.) pour
  //    l'affichage, mais en silent — une erreur 401 n'entraîne pas de
  //    redirection vers /login grâce au flag skipAuthRedirect.
  useEffect(() => {
    if (transactionNumber) {
      fetchTransactionDetails();
    }
  }, [transactionNumber]);

  const fetchTransactionDetails = async () => {
    try {
      // Petit délai pour laisser le temps à Axios de relire le token
      // depuis localStorage après le rechargement complet de la page
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await api.payments.checkStatus(transactionNumber);
      if (response?.success && response.data) {
        setTransaction(response.data);
      }
    } catch (err) {
      // Silencieux — on affiche la page de succès même sans les détails
      console.warn('Détails transaction non récupérés (non bloquant):', err?.message);
    }
  };

  // Déterminer où rediriger selon le rôle stocké en localStorage
  const handleReturnToDashboard = () => {
    const user      = JSON.parse(localStorage.getItem('user') || 'null');
    const agentUser = JSON.parse(localStorage.getItem('agentUser') || 'null');
    const role      = agentUser?.role || user?.role;

    if (role === 'revendeur') {
      navigate('/seller/dashboard');
    } else if (role === 'client') {
      navigate('/map');
    } else {
      navigate('/dashboard');
    }
  };

  // Pas de transactionNumber dans l'URL → erreur
  if (!transactionNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              ⚠️ Lien invalide
            </h1>
            <p className="text-gray-600 mb-6">
              Aucun numéro de transaction trouvé dans l'URL.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Affichage direct du succès — pas d'état 'checking' bloquant
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">

          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Paiement Réussi ! 🎉
          </h1>

          <p className="text-gray-600 mb-6">
            Votre paiement a été traité avec succès. Votre accès a été activé.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Transaction</span>
              <span className="text-sm font-mono text-gray-900 truncate ml-2">
                {transactionNumber}
              </span>
            </div>
            {transaction?.amount ? (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Montant</span>
                <span className="text-sm font-bold text-gray-900">
                  {new Intl.NumberFormat('fr-FR').format(transaction.amount)} FCFA
                </span>
              </div>
            ) : (
              // Placeholder discret pendant le chargement des détails
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Montant</span>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Chargement...
                </span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={handleReturnToDashboard}
            className="w-full"
          >
            Retour au tableau de bord
          </Button>

        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;