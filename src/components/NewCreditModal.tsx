import React, { useState, useMemo } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { CreditItem } from '../types';
import { formatFCFA } from '../utils/formatters';
import { offsetDate } from '../data/initialData';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  ListPlus,
  Calendar,
  Check,
  User,
  Phone
} from 'lucide-react';

interface NewCreditModalProps {
  initialClientId?: string;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
}

export const NewCreditModal: React.FC<NewCreditModalProps> = ({
  initialClientId,
  onClose,
  onSuccess,
}) => {
  const { clients, clientSummaries, addCredit, createClient, toggleBlockClient } = useCredit();
  const { t, language, isRTL } = useLanguage();

  // Mode: Express vs Détaillé
  const [mode, setMode] = useState<'express' | 'detailed'>('express');

  // Client Selection
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (clients.length > 0 ? clients[0].id : '')
  );

  // Quick Client Creation if needed
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Mode Express State
  const [expressAmount, setExpressAmount] = useState<string>('');
  const [expressDescription, setExpressDescription] = useState<string>('');

  // Due Date (default +7 days)
  const [dueDate, setDueDate] = useState<string>(offsetDate(7));

  // Mode Détaillé State
  const [items, setItems] = useState<CreditItem[]>([
    { id: '1', name: language === 'ar' ? 'كيس أرز 50 كغ' : 'Sac de riz 50kg', quantity: 1, price: 20000 },
  ]);

  // Selected client details
  const currentClient = useMemo(() => {
    return clientSummaries.find((c) => c.id === selectedClientId);
  }, [clientSummaries, selectedClientId]);

  // Mode Détaillé total calculation
  const detailedTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
  }, [items]);

  // Quick amount buttons
  const addQuickAmount = (val: number) => {
    const current = Number(expressAmount) || 0;
    setExpressAmount(String(current + val));
  };

  // Due date quick buttons
  const setQuickDueDate = (days: number) => {
    setDueDate(offsetDate(days));
  };

  // Detailed items management
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: String(Date.now()),
        name: '',
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof CreditItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetClientId = selectedClientId;

    if (isCreatingNewClient) {
      if (!newClientFirstName.trim() || !newClientLastName.trim() || !newClientPhone.trim()) {
        alert(language === 'ar' ? 'يرجى ملء الاسم ورقم الهاتف للزبون الجديد' : 'Veuillez remplir le nom, prénom et téléphone du nouveau client.');
        return;
      }
      const newCl = await createClient(newClientFirstName, newClientLastName, newClientPhone);
      if (!newCl) return;
      targetClientId = newCl.id;
    }

    if (!targetClientId) {
      alert(language === 'ar' ? 'يرجى اختيار زبون' : 'Veuillez choisir un client.');
      return;
    }

    if (mode === 'express') {
      const amount = Number(expressAmount);
      if (!amount || amount <= 0) {
        alert(language === 'ar' ? 'يرجى إدخال مبلغ صالح أكبر من 0' : 'Veuillez saisir un montant valide supérieur à 0.');
        return;
      }
      const defaultDesc = language === 'ar' ? 'دين سريع من الشباك' : 'Crédit express comptoir';
      const success = await addCredit(targetClientId, amount, dueDate, expressDescription || defaultDesc);
      if (success) {
        onSuccess(targetClientId);
      }
    } else {
      if (detailedTotal <= 0) {
        alert(language === 'ar' ? 'يجب أن يكون مجموع المواد أكبر من 0' : 'Le total des articles doit être supérieur à 0.');
        return;
      }
      const desc = items.map((i) => i.name || (language === 'ar' ? 'مادة' : 'Article')).join(', ');
      const success = await addCredit(targetClientId, detailedTotal, dueDate, desc, items);
      if (success) {
        onSuccess(targetClientId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-new-credit"
        className="w-full max-w-md sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-200 uppercase font-semibold tracking-wider">
              {language === 'ar' ? 'الشباك' : 'Comptoir'}
            </span>
            <h2 className="text-base font-bold text-white leading-tight">
              {t.credit_modal_title}
            </h2>
          </div>

          <button
            id="btn-close-new-credit"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode selector tab */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('express')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'express'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الوضع السريع (موصى به)' : 'Mode Express (Recommandé)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              mode === 'detailed'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الوضع المفصل' : 'Mode Détaillé'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          {/* 1. Client Choice */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. {language === 'ar' ? 'الزبون' : 'Client'}
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {isCreatingNewClient
                  ? (language === 'ar' ? '← اختيار زبون موجود' : '← Choisir client existant')
                  : (language === 'ar' ? '+ زبون جديد سريع' : '+ Nouveau client rapide')}
              </button>
            </div>

            {isCreatingNewClient ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600">{t.client_first_name}</label>
                    <input
                      type="text"
                      value={newClientFirstName}
                      onChange={(e) => setNewClientFirstName(e.target.value)}
                      placeholder="Ex: Ibrahima"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600">{t.client_last_name}</label>
                    <input
                      type="text"
                      value={newClientLastName}
                      onChange={(e) => setNewClientLastName(e.target.value)}
                      placeholder="Ex: Sarr"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600">{t.client_phone}</label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Ex: 77 000 00 00"
                    dir="ltr"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <select
                  id="select-credit-client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  required
                >
                  {clients.map((c) => {
                    const summary = clientSummaries.find((s) => s.id === c.id);
                    const debtStr = summary && summary.balance > 0
                      ? ` (${language === 'ar' ? 'مستحق' : 'Dû'}: ${formatFCFA(summary.balance)})`
                      : ` (${language === 'ar' ? 'مسدد' : 'Soldé'})`;
                    const blockedStr = c.isBlocked ? ` [${language === 'ar' ? 'محظور' : 'BLOQUÉ'}]` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} — {c.phone} {debtStr} {blockedStr}
                      </option>
                    );
                  })}
                </select>

                {/* Warning if client is blocked */}
                {currentClient?.isBlocked && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>{language === 'ar' ? 'تنبيه : ' : 'Attention : '}</strong>
                        {language === 'ar' ? 'الدين محظور حالياً لهذا الزبون.' : 'Le crédit est actuellement bloqué pour ce client.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBlockClient(currentClient.id)}
                      className="text-xs underline font-bold shrink-0 mx-2 text-rose-900"
                    >
                      {language === 'ar' ? 'إلغاء الحظر' : 'Débloquer'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Amount Section */}
          {mode === 'express' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. {language === 'ar' ? 'مبلغ الدين (FCFA)' : 'Montant du crédit (FCFA)'}
              </label>

              <div className="relative">
                <input
                  id="input-credit-amount"
                  type="number"
                  step="500"
                  value={expressAmount}
                  onChange={(e) => setExpressAmount(e.target.value)}
                  placeholder="Ex: 10000"
                  className={`w-full bg-white border-2 border-emerald-600 rounded-xl p-3 text-2xl font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-tight ${
                    isRTL ? 'pl-16 pr-3 text-right' : 'pr-16 pl-3 text-left'
                  }`}
                  required
                  autoFocus
                />
                <span className={`absolute top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm ${isRTL ? 'left-3' : 'right-3'}`}>
                  FCFA
                </span>
              </div>

              {/* Quick FCFA Add buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium mr-1">
                  {language === 'ar' ? 'إضافة سريعة:' : 'Ajout rapide:'}
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
                  onClick={() => setExpressAmount('')}
                  className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg bg-rose-50"
                >
                  {language === 'ar' ? 'مسح' : 'Effacer'}
                </button>
              </div>

              {/* Optional short description */}
              <div>
                <input
                  type="text"
                  value={expressDescription}
                  onChange={(e) => setExpressDescription(e.target.value)}
                  placeholder={language === 'ar' ? 'ملاحظة اختيارية (مثال: أرز، سكر...)' : 'Note facultative (ex: Riz, Sucre, Courses du soir)'}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
          ) : (
            /* Mode Détaillé */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  2. {language === 'ar' ? 'المواد والمبالغ (الوضع المفصل)' : 'Articles & Montants (Mode Détaillé)'}
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'إضافة سطر' : 'Ajouter une ligne'}
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder={language === 'ar' ? 'اسم المادة (مثال: أرز)' : "Nom de l'article (ex: Riz)"}
                      className="flex-2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900"
                      required
                    />

                    <input
                      type="number"
                      value={item.quantity || 1}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'quantity', Number(e.target.value))
                      }
                      placeholder={language === 'ar' ? 'الكمية' : 'Qté'}
                      className="w-14 bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 text-center"
                      min="1"
                    />

                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'price', Number(e.target.value))
                      }
                      placeholder={language === 'ar' ? 'السعر FCFA' : 'Prix FCFA'}
                      className="flex-2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      required
                    />

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total calculation */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">
                  {language === 'ar' ? 'المجموع المحسوب تلقائياً :' : 'Total calculé automatiquement :'}
                </span>
                <span className="text-base font-extrabold text-emerald-800">
                  {formatFCFA(detailedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* 3. Due Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. {language === 'ar' ? 'تاريخ استحقاق السداد' : "Date d'échéance du règlement"}
            </label>

            <div className="flex items-center gap-2">
              <input
                id="input-credit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                required
              />
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium mr-1">
                {language === 'ar' ? 'اختصارات:' : 'Raccourcis:'}
              </span>
              <button
                type="button"
                onClick={() => setQuickDueDate(1)}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {language === 'ar' ? 'غداً' : 'Demain'}
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(3)}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {language === 'ar' ? 'خلال 3 أيام' : 'Dans 3j'}
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(7)}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {language === 'ar' ? 'خلال أسبوع' : 'Dans 7j (1 sem.)'}
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(15)}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {language === 'ar' ? 'خلال 15 يوماً' : 'Dans 15j'}
              </button>
              <button
                type="button"
                onClick={() => setQuickDueDate(30)}
                className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {language === 'ar' ? 'نهاية الشهر' : 'Fin de mois'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-submit-new-credit"
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>
                {language === 'ar' ? 'تسجيل الدين ' : 'Enregistrer le crédit '}
                {mode === 'express' && expressAmount ? `(${formatFCFA(Number(expressAmount))})` : ''}
                {mode === 'detailed' && detailedTotal > 0 ? `(${formatFCFA(detailedTotal)})` : ''}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
