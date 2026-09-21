import React, { useState } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { X, UserPlus, Check } from 'lucide-react';

interface NewClientModalProps {
  onClose: () => void;
  onSuccess: (clientId: string) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ onClose, onSuccess }) => {
  const { createClient } = useCredit();
  const { t, language } = useLanguage();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      alert(language === 'ar' ? 'يرجى ملء الاسم واللقب ورقم الهاتف.' : 'Veuillez renseigner le prénom, le nom et le téléphone.');
      return;
    }

    const client = await createClient(firstName, lastName, phone);
    if (client) {
      onSuccess(client.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-new-client"
        className="w-full max-w-md sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        <div className="bg-emerald-800 text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-200" />
            <h2 className="text-base font-bold text-white leading-tight">
              {t.client_modal_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.client_first_name}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Ibrahima"
              className="w-full mt-1 bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.client_last_name}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex: Sarr"
              className="w-full mt-1 bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.client_phone}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 77 000 00 00"
              dir="ltr"
              className="w-full mt-1 bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>
                {language === 'ar' ? 'إنشاء ملف الزبون' : 'Créer le profil client'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
