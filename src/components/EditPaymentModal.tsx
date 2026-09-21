import React, { useState } from 'react';
import { X, DollarSign, FileText, Save, Trash2, AlertTriangle, ArrowDownLeft } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { Payment } from '../types';

interface EditPaymentModalProps {
  payment: Payment;
  clientName: string;
  onClose: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  clientName,
  onClose,
}) => {
  const { updatePayment, deletePayment } = useCredit();

  const [amount, setAmount] = useState<string>(String(payment.amount));
  const [notes, setNotes] = useState<string>(payment.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Le montant doit être un entier supérieur à 0.');
      return;
    }

    setIsSubmitting(true);
    const success = await updatePayment(payment.id, {
      amount: parsedAmount,
      notes: notes.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deletePayment(payment.id);
    setIsDeleting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center border border-emerald-600">
              <ArrowDownLeft className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Modifier le remboursement</h3>
              <p className="text-[11px] text-emerald-200">Client : {clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700/80 text-emerald-200 hover:text-white transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Montant versé (FCFA)
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 2000"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-bold"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                FCFA
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Note / Remarque (facultatif)
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Espèces, Wave, Orange Money..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>

          {/* Delete Payment Option */}
          <div className="pt-3 border-t border-slate-100">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette ligne de paiement</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <p className="text-xs text-rose-800 font-medium">
                  Êtes-vous sûr de vouloir supprimer ce paiement de {payment.amount.toLocaleString()} FCFA ? La dette du client augmentera à nouveau de ce montant.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium"
                  >
                    {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
