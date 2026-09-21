import React, { useMemo } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { formatFCFA, formatDateDisplay, formatCurrentMonth } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import {
  AlertTriangle,
  Clock,
  Wallet,
  Phone,
  MessageCircle,
  Smartphone,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { ClientSummary } from '../types';

interface SuiviViewProps {
  onSelectClient: (clientId: string) => void;
  onOpenReminder: (client: ClientSummary, type: 'whatsapp' | 'sms') => void;
}

export const SuiviView: React.FC<SuiviViewProps> = ({
  onSelectClient,
  onOpenReminder,
}) => {
  const { clientSummaries, cockpitStats } = useCredit();
  const { t, language, isRTL } = useLanguage();
  const currentMonth = formatCurrentMonth(language);

  // All clients with debt (> 0)
  const debtors = useMemo(() => {
    return clientSummaries.filter((c) => c.balance > 0);
  }, [clientSummaries]);

  // Clients with overdue debt
  const overdueClients = useMemo(() => {
    return debtors
      .filter((c) => c.status === 'OVERDUE' || (c.daysOverdue && c.daysOverdue > 0))
      .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
  }, [debtors]);

  // Clients due soon
  const dueSoonClients = useMemo(() => {
    return debtors.filter((c) => c.status === 'DUE_SOON');
  }, [debtors]);

  // Total global credit & payments calculated from client summaries
  const globalTotalCredits = useMemo(
    () => clientSummaries.reduce((s, c) => s + (c.totalCredits || 0), 0),
    [clientSummaries]
  );
  const globalTotalPayments = useMemo(
    () => clientSummaries.reduce((s, c) => s + (c.totalPayments || 0), 0),
    [clientSummaries]
  );

  return (
    <div id="view-suivi" className="space-y-4 pb-6">
      {/* Question / Guide banner for Cheikh */}
      <div className="bg-emerald-900 text-white rounded-xl p-3.5 shadow-xs border border-emerald-800">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-emerald-300 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            {t.suivi_banner_title}
          </h2>
        </div>
        <p className="text-xs text-emerald-100/90 leading-relaxed">
          {t.suivi_banner_desc}
        </p>
      </div>

      {/* 1. Situation du Mois & Situation Globale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Situation du mois */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.suivi_month_situation}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
              <Calendar className="w-3 h-3 text-emerald-600" />
              {currentMonth}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {t.suivi_credits_granted}
              </span>
              <span className="font-bold text-slate-900">
                {formatFCFA(cockpitStats.totalCreditedThisMonth)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {t.suivi_recovered_amounts}
              </span>
              <span className="font-bold text-emerald-700">
                {formatFCFA(cockpitStats.totalRecoveredThisMonth)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold">
              <span className="text-slate-700">{t.suivi_net_month}</span>
              <span
                className={
                  cockpitStats.totalCreditedThisMonth - cockpitStats.totalRecoveredThisMonth > 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }
              >
                {formatFCFA(
                  cockpitStats.totalCreditedThisMonth - cockpitStats.totalRecoveredThisMonth
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Situation Globale & Total Restant */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.suivi_global_situation}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>{t.suivi_total_cumulative_credits}</span>
              <span className="font-bold text-slate-900">{formatFCFA(globalTotalCredits)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>{t.suivi_total_cumulative_payments}</span>
              <span className="font-bold text-emerald-700">{formatFCFA(globalTotalPayments)}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold">
              <span className="text-slate-800 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                {t.suivi_total_remaining_due}
              </span>
              <span className="text-sm font-extrabold text-emerald-800">
                {formatFCFA(cockpitStats.totalRemainingToRecover)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. « Qui me doit de l'argent et depuis quand ? » (Clients en retard) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              {t.suivi_cat_overdue} ({overdueClients.length})
            </h3>
          </div>
        </div>

        {overdueClients.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-xs text-slate-500">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            {t.suivi_no_overdue}
          </div>
        ) : (
          <div className="space-y-2">
            {overdueClients.map((client) => {
              const fullName = `${client.firstName} ${client.lastName}`;
              return (
                <div
                  key={client.id}
                  id={`suivi-overdue-${client.id}`}
                  className={`bg-white ${
                    isRTL ? 'border-r-4 border-r-red-600' : 'border-l-4 border-l-red-600'
                  } border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition`}
                >
                  <div
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-start justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{fullName}</span>
                        <StatusBadge
                          status={client.status}
                          daysOverdue={client.daysOverdue}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{client.phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-red-700">
                        {formatFCFA(client.balance)}
                      </div>
                      <div className="text-[11px] font-semibold text-red-600 mt-0.5">
                        {language === 'ar'
                          ? client.daysOverdue === 1
                            ? 'متأخر يوم واحد'
                            : `متأخر ${client.daysOverdue || 0} أيام`
                          : client.daysOverdue === 1
                          ? 'Dépassé de 1 jour'
                          : `Dépassé de ${client.daysOverdue || 0} jours`}
                      </div>
                    </div>
                  </div>

                  {/* Relance bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {t.due_date_label} {formatDateDisplay(client.earliestDueDate || '', language)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenReminder(client, 'whatsapp')}
                        className="p-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 border border-emerald-200"
                        title={t.action_whatsapp}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t.action_whatsapp}</span>
                      </button>

                      <button
                        onClick={() => onOpenReminder(client, 'sms')}
                        className="p-1.5 px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-200"
                        title={t.action_sms}
                      >
                        <Smartphone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{t.action_sms}</span>
                      </button>

                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Clients bientôt à échéance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              {t.suivi_cat_due_soon} ({dueSoonClients.length})
            </h3>
          </div>
        </div>

        {dueSoonClients.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-xs text-slate-500">
            {t.suivi_no_due_soon}
          </div>
        ) : (
          <div className="space-y-2">
            {dueSoonClients.map((client) => {
              const fullName = `${client.firstName} ${client.lastName}`;
              return (
                <div
                  key={client.id}
                  id={`suivi-due-soon-${client.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition"
                >
                  <div
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-start justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{fullName}</span>
                        <StatusBadge
                          status={client.status}
                          daysUntilDue={client.daysUntilDue}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{client.phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900">
                        {formatFCFA(client.balance)}
                      </div>
                      <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                        {client.daysUntilDue === 1 ? t.status_due_tomorrow : t.status_due_today}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {t.due_date_label} {formatDateDisplay(client.earliestDueDate || '', language)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenReminder(client, 'whatsapp')}
                        className="p-1.5 px-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t.action_whatsapp}</span>
                      </button>

                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
