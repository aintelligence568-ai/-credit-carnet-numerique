import React, { useState, useMemo } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { formatFCFA } from '../utils/formatters';
import { X, Check, ArrowRight } from 'lucide-react';

interface NewPaymentModalProps {
  initialClientId?: string;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  initialClientId,
  onClose,
  onSuccess,
}) => {
  const { clients, clientSummaries, addPayment } = useCredit();
  const { t, language, isRTL } = useLanguage();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (clients.length > 0 ? clients[0].id : '')
  );

  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>(
    language === 'ar' ? 'سداد عند الشباك' : 'Règlement au comptoir'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const currentClient = useMemo(() => {
    return clientSummaries.find((c) => c.id === selectedClientId);
  }, [clientSummaries, selectedClientId]);

  const currentBalance = currentClient ? currentClient.balance : 0;
  const numAmount = Number(amount) || 0;
  const newBalance = Math.max(0, currentBalance - numAmount);

  const setFullPayment = () => {
    if (currentBalance > 0) {
      setAmount(String(currentBalance));
    }
  };

  const addQuickAmount = (val: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedClientId) {
      alert(language === 'ar' ? 'يرجى اختيار زبون.' : 'Veuillez choisir un client.');
      return;
    }

    if (numAmount <= 0) {
      alert(language === 'ar' ? 'يرجى إدخال مبلغ مدفوع أكبر من 0.' : 'Veuillez saisir un montant payé supérieur à 0.');
      return;
    }

    if (numAmount > currentBalance) {
      alert(
        language === 'ar'
          ? `المبلغ المدفوع (${numAmount} FCFA) يتجاوز الرصيد المستحق (${currentBalance} FCFA).\nلا يمكن أن يكون الرصيد سالباً.`
          : `Le montant payé (${numAmount} FCFA) dépasse le solde restant dû (${currentBalance} FCFA).\nLe solde ne peut jamais devenir négatif.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addPayment(selectedClientId, numAmount, notes, idempotencyKey);
      if (success) {
        onSuccess(selectedClientId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-new-payment"
        className="w-full max-w-md sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-400 uppercase font-semibold tracking-wider">
              {language === 'ar' ? 'الشباك' : 'Comptoir'}
            </span>
            <h2 className="text-base font-bold text-white leading-tight">
              {t.payment_modal_title}
            </h2>
          </div>

          <button
            id="btn-close-new-payment"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          {/* 1. Client Choice */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. {language === 'ar' ? 'الزبون' : 'Client'}
            </label>
            <select
              id="select-payment-client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              required
            >
              {clients.map((c) => {
                const summary = clientSummaries.find((s) => s.id === c.id);
                const debt = summary ? summary.balance : 0;
                return (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({language === 'ar' ? 'مستحق' : 'Dû'} : {formatFCFA(debt)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current balance card */}
          {currentClient && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {language === 'ar' ? 'الرصيد الحالي :' : 'Solde actuel :'}
                </span>
                <div className="text-lg font-extrabold text-slate-900">
                  {formatFCFA(currentBalance)}
                </div>
              </div>

              {currentBalance > 0 && (
                <button
                  type="button"
                  id="btn-pay-full-balance"
                  onClick={setFullPayment}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {language === 'ar' ? 'سداد الكل' : 'Tout solder'}
                </button>
              )}
            </div>
          )}

          {/* 2. Saisie du montant */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. {language === 'ar' ? 'المبلغ المدفوع (FCFA)' : 'Montant payé (FCFA)'}
            </label>

            <div className="relative">
              <input
                id="input-payment-amount"
                type="number"
                step="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 10000"
                className={`w-full bg-white border-2 border-slate-900 rounded-xl p-3 text-2xl font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-tight ${
                  isRTL ? 'pl-16 pr-3 text-right' : 'pr-16 pl-3 text-left'
                }`}
                required
                autoFocus
              />
              <span className={`absolute top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm ${isRTL ? 'left-3' : 'right-3'}`}>
                FCFA
              </span>
            </div>

            {/* Quick amounts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium mr-1">
                {language === 'ar' ? 'اختصارات:' : 'Raccourcis:'}
              </span>
              {[1000, 2000, 5000, 10000, 20000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addQuickAmount(val)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
                >
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg bg-rose-50"
              >
                {language === 'ar' ? 'مسح' : 'Effacer'}
              </button>
            </div>
          </div>

          {/* Calculated Impact Preview */}
          {numAmount > 0 && currentClient && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">
                {language === 'ar' ? 'الحساب الفوري للرصيد :' : 'Calcul immédiat du solde :'}
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
                <span>{formatFCFA(currentBalance)}</span>
                <span className="text-slate-400 font-normal">-</span>
                <span className="text-emerald-700">{formatFCFA(numAmount)}</span>
                <ArrowRight className={`w-3.5 h-3.5 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                <span className="text-sm font-extrabold text-emerald-900">
                  {formatFCFA(newBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500">
              {language === 'ar' ? 'ملاحظة اختيارية' : 'Note facultative'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: نقداً، عبر الهاتف، دفعة مقدمة' : 'Ex: Espèces, Wave, Acompte'}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 mt-0.5"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              id="btn-submit-payment"
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                isSubmitting || numAmount <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white'
              }`}
            >
              <Check className="w-5 h-5 text-emerald-400" />
              <span>
                {isSubmitting
                  ? language === 'ar'
                    ? 'جار المعالجة...'
                    : 'Traitement en cours...'
                  : language === 'ar'
                  ? 'تأكيد السداد '
                  : 'Confirmer le paiement '}
                {!isSubmitting && numAmount > 0 ? `(${formatFCFA(numAmount)})` : ''}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
