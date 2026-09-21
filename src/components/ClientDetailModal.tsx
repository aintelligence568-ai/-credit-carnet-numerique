import React, { useState, useEffect } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { StatusBadge } from './StatusBadge';
import { formatFCFA, formatDateDisplay } from '../utils/formatters';
import { EditClientModal } from './EditClientModal';
import { EditCreditModal } from './EditCreditModal';
import { EditPaymentModal } from './EditPaymentModal';
import {
  X,
  Phone,
  MessageCircle,
  Smartphone,
  PlusCircle,
  BadgeDollarSign,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  Receipt,
  ChevronDown,
  ChevronUp,
  Edit3
} from 'lucide-react';
import { ClientSummary, Credit, Payment } from '../types';

interface ClientDetailModalProps {
  clientId: string;
  onClose: () => void;
  onOpenNewCredit: (clientId: string) => void;
  onOpenPayment: (clientId: string) => void;
  onOpenReminder: (client: ClientSummary, type: 'whatsapp' | 'sms') => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  clientId,
  onClose,
  onOpenNewCredit,
  onOpenPayment,
  onOpenReminder,
}) => {
  const {
    getClientSummary,
    getClientCredits,
    getClientPayments,
    loadClientHistory,
    isLoadingClientHistory,
    toggleBlockClient,
  } = useCredit();
  const { t, language, isRTL } = useLanguage();
  const client = getClientSummary(clientId);
  const credits = getClientCredits(clientId);
  const payments = getClientPayments(clientId);

  useEffect(() => {
    if (clientId) {
      loadClientHistory(clientId);
    }
  }, [clientId, loadClientHistory]);

  const [expandedCreditId, setExpandedCreditId] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  if (!client) return null;

  const fullName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="client-detail-sheet"
        className="w-full max-w-md sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header bar */}
        <div className="bg-emerald-800 text-white p-4 shrink-0 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[11px] text-emerald-200 uppercase font-semibold tracking-wider">
              {language === 'ar' ? 'بطاقة الزبون' : 'Fiche Client'}
            </span>
            <h2 className="text-lg font-bold text-white leading-tight truncate">{fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <a
                href={`tel:${client.phone.replace(/\s+/g, '')}`}
                dir="ltr"
                className="text-xs text-emerald-100 hover:text-white font-mono flex items-center gap-1 underline underline-offset-2"
              >
                <Phone className="w-3 h-3" />
                {client.phone}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-edit-client-header"
              onClick={() => setIsEditingClient(true)}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition flex items-center gap-1 text-xs font-semibold"
              title="Modifier les informations du client"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Modifier</span>
            </button>
            <button
              id="btn-close-client-detail"
              onClick={onClose}
              className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          {/* Main Balance & Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {language === 'ar' ? 'الرصيد المتبقي' : 'Solde restant'}
                </span>
                <div
                  id="client-detail-balance"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5"
                >
                  {formatFCFA(client.balance)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {language === 'ar' ? 'مجموع الديون : ' : 'Total crédits : '}
                  <span className="font-semibold text-slate-700">{formatFCFA(client.totalCredits)}</span> •{' '}
                  {language === 'ar' ? 'المدفوعات : ' : 'Paiements : '}
                  <span className="font-semibold text-emerald-700">{formatFCFA(client.totalPayments)}</span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <StatusBadge
                  status={client.status}
                  daysOverdue={client.daysOverdue}
                  daysUntilDue={client.daysUntilDue}
                  size="md"
                />
                {client.earliestDueDate && client.balance > 0 && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {language === 'ar' ? 'الأجل : ' : 'Échéance : '}{formatDateDisplay(client.earliestDueDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Block / Unblock Credit Button */}
            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {language === 'ar' ? 'حالة الدين : ' : 'Statut crédit : '}
                <strong className={client.isBlocked ? 'text-rose-600' : 'text-emerald-700'}>
                  {client.isBlocked
                    ? (language === 'ar' ? 'محظور (ممنوع أي دين جديد)' : 'Bloqué (aucun nouveau crédit)')
                    : (language === 'ar' ? 'مسموح' : 'Autorisé')}
                </strong>
              </span>

              <button
                id="btn-toggle-block-client"
                onClick={() => toggleBlockClient(client.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                  client.isBlocked
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                }`}
              >
                {client.isBlocked ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'ar' ? 'السماح بالدين' : 'Autoriser le crédit'}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'ar' ? 'حظر الدين' : 'Bloquer le crédit'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            {/* + Crédit */}
            <button
              id="detail-btn-new-credit"
              onClick={() => onOpenNewCredit(client.id)}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{t.client_btn_credit}</span>
            </button>

            {/* Enregistrer un paiement */}
            <button
              id="detail-btn-payment"
              onClick={() => onOpenPayment(client.id)}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-3 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition"
            >
              <BadgeDollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.client_btn_payment}</span>
            </button>

            {/* WhatsApp */}
            <button
              id="detail-btn-whatsapp"
              onClick={() => onOpenReminder(client, 'whatsapp')}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 py-2.5 px-3 rounded-xl font-semibold text-xs transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.action_whatsapp}</span>
            </button>

            {/* SMS */}
            <button
              id="detail-btn-sms"
              onClick={() => onOpenReminder(client, 'sms')}
              className="flex items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 py-2.5 px-3 rounded-xl font-semibold text-xs transition"
            >
              <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
              <span>{t.action_sms}</span>
            </button>
          </div>

          {/* Historique des Crédits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'ar' ? `سجل الديون (${credits.length})` : `Historique des crédits (${credits.length})`}
              </h3>
              <span className="text-[11px] text-slate-400">
                {language === 'ar' ? 'المجموع : ' : 'Total : '}{formatFCFA(client.totalCredits)}
              </span>
            </div>

            {credits.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
                {isLoadingClientHistory ? (
                  <span>{language === 'ar' ? 'جار التحميل...' : 'Chargement des crédits...'}</span>
                ) : (
                  <span>{language === 'ar' ? 'لا يوجد أي دين مسجل لهذا الزبون.' : 'Aucun crédit enregistré pour ce client.'}</span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {credits.map((credit, idx) => {
                  const isExpanded = expandedCreditId === credit.id;
                  const hasItems = credit.items && credit.items.length > 0;

                  return (
                    <div
                      key={credit.id}
                      id={`credit-item-${credit.id}`}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition"
                    >
                      <div
                        onClick={() => hasItems && setExpandedCreditId(isExpanded ? null : credit.id)}
                        className={`flex items-start justify-between ${hasItems ? 'cursor-pointer' : ''}`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {language === 'ar' ? `دين #${credits.length - idx}` : `Crédit #${credits.length - idx}`}
                            </span>
                            {credit.description && (
                              <span className="text-xs text-slate-600">— {credit.description}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>
                              {language === 'ar' ? 'تاريخ الأخذ : ' : 'Pris le : '}{formatDateDisplay(credit.date)}
                            </span>
                            <span>•</span>
                            <span className="text-amber-700 font-medium">
                              {language === 'ar' ? 'الأجل : ' : 'Échéance : '}{formatDateDisplay(credit.dueDate)}
                            </span>
                          </div>
                        </div>

                        <div className={`shrink-0 flex items-center gap-2 ${isRTL ? 'text-left' : 'text-right'}`}>
                          <span className="text-sm font-bold text-slate-900">
                            {formatFCFA(credit.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCredit(credit);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition"
                            title="Modifier ce crédit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {hasItems && (
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded detailed items if mode détaillé was used */}
                      {hasItems && isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {language === 'ar' ? 'المواد المفصلة :' : 'Articles détaillés :'}
                          </span>
                          <div className="space-y-1 bg-slate-50 rounded-lg p-2 text-xs">
                            {credit.items!.map((item) => (
                              <div key={item.id} className="flex justify-between text-slate-700">
                                <span>
                                  {item.quantity ? `${item.quantity}x ` : ''}
                                  {item.name}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {formatFCFA(item.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historique des Paiements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'ar' ? `سجل المدفوعات (${payments.length})` : `Historique des paiements (${payments.length})`}
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium">
                {language === 'ar' ? 'المجموع المسدد : ' : 'Total réglé : '}{formatFCFA(client.totalPayments)}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
                {isLoadingClientHistory ? (
                  <span>{language === 'ar' ? 'جار التحميل...' : 'Chargement des paiements...'}</span>
                ) : (
                  <span>{language === 'ar' ? 'لا يوجد أي سداد مسجل حالياً.' : "Aucun paiement enregistré pour l'instant."}</span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {payments.map((payment, idx) => (
                  <div
                    key={payment.id}
                    id={`payment-item-${payment.id}`}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {language === 'ar' ? `سداد #${payments.length - idx}` : `Paiement #${payments.length - idx}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateDisplay(payment.date)} • {payment.notes || (language === 'ar' ? 'سداد عند الشباك' : 'Règlement au comptoir')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-emerald-700">
                        -{formatFCFA(payment.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingPayment(payment)}
                        className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Modifier ce paiement"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer close */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
          >
            {language === 'ar' ? 'إغلاق البطاقة' : 'Fermer la fiche'}
          </button>
        </div>
      </div>

      {/* Sub Modals for editing */}
      {isEditingClient && (
        <EditClientModal
          client={client}
          onClose={() => setIsEditingClient(false)}
          onClientDeleted={() => {
            setIsEditingClient(false);
            onClose();
          }}
        />
      )}

      {editingCredit && (
        <EditCreditModal
          credit={editingCredit}
          clientName={fullName}
          onClose={() => setEditingCredit(null)}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          clientName={fullName}
          onClose={() => setEditingPayment(null)}
        />
      )}
    </div>
  );
};
