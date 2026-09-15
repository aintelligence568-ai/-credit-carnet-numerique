import React, { useState } from 'react';
import { ClientSummary } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatFCFA } from '../utils/formatters';
import { X, MessageCircle, Smartphone, Check, Copy, AlertCircle } from 'lucide-react';

interface ReminderModalProps {
  client: ClientSummary;
  initialType?: 'whatsapp' | 'sms';
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  client,
  initialType = 'whatsapp',
  onClose,
}) => {
  const { language, isRTL } = useLanguage();
  const [type, setType] = useState<'whatsapp' | 'sms'>(initialType);
  const [copied, setCopied] = useState(false);
  const [simulatedSent, setSimulatedSent] = useState(false);

  // Clean phone number (Senegal: +221 prefix)
  const rawPhone = client.phone.replace(/\s+/g, '');
  const internationalPhone = rawPhone.startsWith('+')
    ? rawPhone
    : `221${rawPhone}`;

  // Default prefilled reminder message
  const defaultMessage = language === 'ar'
    ? `السلام عليكم ${client.firstName}، تذكير ودي بخصوص رصيدك المتبقي البالغ ${formatFCFA(client.balance)} في الدفتر. شكراً لإعلامنا بشأن موعد السداد. — الشيخ`
    : `Bonjour ${client.firstName}, petit rappel concernant ton solde de ${formatFCFA(
        client.balance
      )} au carnet. Merci de nous tenir informés concernant le règlement. — Cheikh`;

  const [message, setMessage] = useState(defaultMessage);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${internationalPhone.replace('+', '')}?text=${encoded}`;
    window.open(url, '_blank');
    setSimulatedSent(true);
  };

  const handleSendSMS = () => {
    const encoded = encodeURIComponent(message);
    const url = `sms:${internationalPhone}?body=${encoded}`;
    window.location.href = url;
    setSimulatedSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-reminder"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-emerald-100">
              {type === 'whatsapp' ? (
                <MessageCircle className="w-5 h-5 text-emerald-300" />
              ) : (
                <Smartphone className="w-5 h-5 text-slate-200" />
              )}
            </div>
            <div>
              <span className="text-[11px] text-emerald-200 uppercase font-semibold tracking-wider">
                {language === 'ar' ? 'تذكير الزبون' : 'Relance Client'}
              </span>
              <h2 className="text-base font-bold text-white leading-tight">
                {client.firstName} {client.lastName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel switcher */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setType('whatsapp')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              type === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setType('sms')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              type === 'sms'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{language === 'ar' ? 'رسالة نصية SMS' : 'SMS Classique'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Rule note: Cheikh always validates */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>{language === 'ar' ? 'تأكيد إجباري : ' : 'Validation obligatoire : '}</strong>
              {language === 'ar'
                ? 'الشيخ يؤكد دائماً كل تذكير شخصياً. لا يتم إرسال أي رسالة تلقائياً.'
                : "Cheikh valide toujours chaque relance. Aucun message n'est envoyé automatiquement."}
            </p>
          </div>

          {/* Client phone and balance info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 font-medium">
                {language === 'ar' ? 'المستلم :' : 'Destinataire :'}
              </span>
              <div className="font-bold text-slate-900" dir="ltr">{client.phone}</div>
            </div>
            <div className={isRTL ? 'text-left' : 'text-right'}>
              <span className="text-slate-500 font-medium">
                {language === 'ar' ? 'الرصيد المستحق :' : 'Solde dû :'}
              </span>
              <div className="font-extrabold text-red-700 text-sm">
                {formatFCFA(client.balance)}
              </div>
            </div>
          </div>

          {/* Editable message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {language === 'ar' ? 'الرسالة الجاهزة' : 'Message préparé'}
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>
                  {copied
                    ? (language === 'ar' ? 'تم النسخ !' : 'Copié !')
                    : (language === 'ar' ? 'نسخ النص' : 'Copier texte')}
                </span>
              </button>
            </div>

            <textarea
              id="textarea-reminder-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Confirmation status if simulated or triggered */}
          {simulatedSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {language === 'ar' ? 'تم تحويل الرسالة بنجاح للإرسال !' : 'Message transmis avec succès pour envoi !'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {type === 'whatsapp' ? (
              <button
                id="btn-confirm-send-whatsapp"
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{language === 'ar' ? 'تأكيد وفتح واتساب' : 'Valider et ouvrir WhatsApp'}</span>
              </button>
            ) : (
              <button
                id="btn-confirm-send-sms"
                type="button"
                onClick={handleSendSMS}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                <span>{language === 'ar' ? 'تأكيد وفتح الرسائل القصيرة SMS' : 'Valider et ouvrir SMS'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              {language === 'ar' ? 'إغلاق بدون إرسال' : 'Fermer sans envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
