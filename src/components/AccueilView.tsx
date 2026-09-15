import React from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { StatusBadge } from './StatusBadge';
import { formatFCFA, formatDateDisplay } from '../utils/formatters';
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  MessageCircle,
  Smartphone,
  ChevronRight,
  PlusCircle,
  BadgeDollarSign,
  UserCheck
} from 'lucide-react';
import { ClientSummary } from '../types';

interface AccueilViewProps {
  onSelectClient: (clientId: string) => void;
  onOpenNewCredit: (clientId?: string) => void;
  onOpenPayment: (clientId: string) => void;
  onOpenReminder: (client: ClientSummary, type: 'whatsapp' | 'sms') => void;
}

export const AccueilView: React.FC<AccueilViewProps> = ({
  onSelectClient,
  onOpenNewCredit,
  onOpenPayment,
  onOpenReminder,
}) => {
  const { cockpitStats, clientsToRemind } = useCredit();
  const { t, language, isRTL } = useLanguage();

  return (
    <div id="view-accueil" className="space-y-4 pb-24">
      {/* 4 Cockpit KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* KPI 1: Total donné à crédit ce mois-ci */}
        <div
          id="kpi-credited-month"
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium leading-tight">{t.kpi_credited_month}</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              {formatFCFA(cockpitStats.totalCreditedThisMonth)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.kpi_credited_sub}</p>
          </div>
        </div>

        {/* KPI 2: Total récupéré ce mois-ci */}
        <div
          id="kpi-recovered-month"
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium leading-tight">{t.kpi_recovered_month}</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-emerald-700 tracking-tight">
              {formatFCFA(cockpitStats.totalRecoveredThisMonth)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.kpi_recovered_sub}</p>
          </div>
        </div>

        {/* KPI 3: Total restant à récupérer */}
        <div
          id="kpi-total-remaining"
          className="bg-emerald-900 text-white rounded-xl p-3 border border-emerald-800 shadow-xs flex flex-col justify-between col-span-1"
        >
          <div className="flex items-center justify-between text-emerald-200 mb-1">
            <span className="text-[11px] font-medium leading-tight">{t.kpi_remaining_total}</span>
            <div className="w-6 h-6 rounded-md bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-tight">
              {formatFCFA(cockpitStats.totalRemainingToRecover)}
            </div>
            <p className="text-[10px] text-emerald-300 mt-0.5">{t.kpi_remaining_sub}</p>
          </div>
        </div>

        {/* KPI 4: Nombre de clients en retard */}
        <div
          id="kpi-overdue-count"
          className={`rounded-xl p-3 border shadow-xs flex flex-col justify-between col-span-1 ${
            cockpitStats.overdueClientsCount > 0
              ? 'bg-red-50 border-red-200 text-red-950'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium leading-tight">{t.kpi_overdue_count}</span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                cockpitStats.overdueClientsCount > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-red-700">
                {cockpitStats.overdueClientsCount}
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                {language === 'ar' ? 'زبون' : cockpitStats.overdueClientsCount <= 1 ? 'client' : 'clients'}
              </span>
            </div>
            <p className="text-[10px] text-red-600/80 mt-0.5">
              {cockpitStats.overdueClientsCount > 0 ? t.kpi_overdue_urgent : t.kpi_overdue_none}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Banner: + Crédit */}
      <div className="flex items-center gap-2">
        <button
          id="accueil-btn-add-credit"
          onClick={() => onOpenNewCredit()}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>{t.quick_action_new_credit_title}</span>
        </button>
      </div>

      {/* Section: « À relancer » */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {t.section_priority_reminders}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              {clientsToRemind.length}
            </span>
          </div>
        </div>

        {clientsToRemind.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-slate-200 text-slate-500">
            <UserCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-800 text-sm">{t.no_reminders_today}</p>
            <p className="text-xs text-slate-500 mt-1">{t.no_reminders_desc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientsToRemind.map((client) => {
              const fullName = `${client.firstName} ${client.lastName}`;
              return (
                <div
                  key={client.id}
                  id={`card-relance-${client.id}`}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col gap-2.5"
                >
                  {/* Top row: Name, phone, status */}
                  <div
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-start justify-between cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {fullName}
                        </span>
                        <StatusBadge
                          status={client.status}
                          daysOverdue={client.daysOverdue}
                          daysUntilDue={client.daysUntilDue}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{client.phone}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900">
                        {formatFCFA(client.balance)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{t.due_date_label} {formatDateDisplay(client.earliestDueDate || '', language)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    {/* WhatsApp */}
                    <button
                      id={`btn-wa-${client.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReminder(client, 'whatsapp');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition border border-emerald-200"
                      title={t.action_whatsapp}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{t.action_whatsapp}</span>
                    </button>

                    {/* SMS */}
                    <button
                      id={`btn-sms-${client.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReminder(client, 'sms');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition border border-slate-200"
                      title={t.action_sms}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>{t.action_sms}</span>
                    </button>

                    {/* Payer rapide */}
                    <button
                      id={`btn-pay-${client.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPayment(client.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition"
                      title={t.action_collect}
                    >
                      <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{t.action_collect}</span>
                    </button>

                    {/* Detail chevron */}
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
                      title={t.action_client_sheet}
                    >
                      <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
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
