import React, { useState } from 'react';
import { X, Calendar, DollarSign, FileText, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { Credit } from '../types';

interface EditCreditModalProps {
  credit: Credit;
  clientName: string;
  onClose: () => void;
}

export const EditCreditModal: React.FC<EditCreditModalProps> = ({
  credit,
  clientName,
  onClose,
}) => {
  const { updateCredit, deleteCredit } = useCredit();

  const [amount, setAmount] = useState<string>(String(credit.amount));
  const [dueDate, setDueDate] = useState<string>(credit.dueDate);
  const [description, setDescription] = useState<string>(credit.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Le montant doit être un nombre supérieur à 0.');
      return;
    }

    if (!dueDate) {
      setError("La date d'échéance est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    const success = await updateCredit(credit.id, {
      amount: parsedAmount,
      dueDate,
      description: description.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteCredit(credit.id);
    setIsDeleting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="bg-amber-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center border border-amber-500">
              <DollarSign className="w-4 h-4 text-amber-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Modifier la dette / crédit</h3>
              <p className="text-[11px] text-amber-200">Client : {clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-600/80 text-amber-200 hover:text-white transition"
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
              Montant (FCFA)
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-bold"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                FCFA
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Date d'échéance
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Description / Marchandises
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Riz, Huile, Sucre..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
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
              className="flex-2 py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>

          {/* Delete Credit Option */}
          <div className="pt-3 border-t border-slate-100">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette ligne de crédit</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <p className="text-xs text-rose-800 font-medium">
                  Êtes-vous sûr de vouloir supprimer ce crédit de {credit.amount.toLocaleString()} FCFA ?
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
