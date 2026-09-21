import React, { useState } from 'react';
import { X, User, Phone, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { ClientSummary } from '../types';

interface EditClientModalProps {
  client: ClientSummary;
  onClose: () => void;
  onClientDeleted?: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  client,
  onClose,
  onClientDeleted,
}) => {
  const { updateClient, deleteClient } = useCredit();

  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [phone, setPhone] = useState(client.phone);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis.');
      return;
    }

    if (!phone.trim()) {
      setError('Le numéro de téléphone est requis.');
      return;
    }

    setIsSubmitting(true);
    const success = await updateClient(client.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (client.balance > 0) {
      setError(`Impossible de supprimer ce client tant qu'il a une dette active de ${client.balance} FCFA.`);
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    const success = await deleteClient(client.id);
    setIsDeleting(false);

    if (success) {
      if (onClientDeleted) onClientDeleted();
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
              <User className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Modifier la fiche client</h3>
              <p className="text-[11px] text-emerald-200">{client.firstName} {client.lastName}</p>
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
              Prénom
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Moussa"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Nom de famille
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex: Diop"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Numéro de téléphone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 771234567"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-slate-900 font-medium"
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

          {/* Delete section if settled */}
          <div className="pt-3 border-t border-slate-100">
            {client.balance === 0 ? (
              !showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer ou archiver ce client (solde réglé)</span>
                </button>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs text-rose-800 font-medium">
                    Confirmez-vous la suppression de la fiche de {client.firstName} {client.lastName} ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                    >
                      Non, garder
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
              )
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                Solde actuel : {client.balance.toLocaleString()} FCFA (suppression impossible tant que la dette n'est pas réglée)
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
