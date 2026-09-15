import React, { useState, useMemo } from 'react';
import { useCredit } from '../context/CreditContext';
import { useLanguage } from '../context/LanguageContext';
import { StatusBadge } from './StatusBadge';
import { formatFCFA, formatDateDisplay } from '../utils/formatters';
import { Search, UserPlus, Phone, ChevronRight, Filter } from 'lucide-react';
import { ClientStatus } from '../types';

interface ClientsViewProps {
  onSelectClient: (clientId: string) => void;
  onOpenNewClientModal: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onSelectClient,
  onOpenNewClientModal,
}) => {
  const { clientSummaries } = useCredit();
  const { t, language, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clientSummaries.filter((client) => {
      // Search matches
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const reverseName = `${client.lastName} ${client.firstName}`.toLowerCase();
      const phoneClean = client.phone.replace(/\s+/g, '');
      const searchClean = query.replace(/\s+/g, '');

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        reverseName.includes(query) ||
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        phoneClean.includes(searchClean);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'ALL') return true;
      return client.status === statusFilter;
    });
  }, [clientSummaries, searchQuery, statusFilter]);

  return (
    <div id="view-clients" className="space-y-3.5 pb-24">
      {/* Search Bar & New Client CTA */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            id="clients-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.clients_search_placeholder}
            className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs ${
              isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
            }`}
          />
        </div>

        <button
          id="clients-btn-new-client"
          onClick={onOpenNewClientModal}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white p-2.5 rounded-xl shadow-xs transition shrink-0"
          title={t.btn_new_client}
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          id="filter-all"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t.filter_all} ({clientSummaries.length})
        </button>

        <button
          id="filter-overdue"
          onClick={() => setStatusFilter('OVERDUE')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
            statusFilter === 'OVERDUE'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-slate-200 text-red-700 hover:bg-red-50'
          }`}
        >
          {t.filter_overdue} ({clientSummaries.filter((c) => c.status === 'OVERDUE').length})
        </button>

        <button
          id="filter-due-soon"
          onClick={() => setStatusFilter('DUE_SOON')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
            statusFilter === 'DUE_SOON'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
          }`}
        >
          {t.filter_due_soon} ({clientSummaries.filter((c) => c.status === 'DUE_SOON').length})
        </button>

        <button
          id="filter-blocked"
          onClick={() => setStatusFilter('BLOCKED')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
            statusFilter === 'BLOCKED'
              ? 'bg-rose-700 text-white'
              : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          {t.filter_blocked} ({clientSummaries.filter((c) => c.status === 'BLOCKED').length})
        </button>

        <button
          id="filter-settled"
          onClick={() => setStatusFilter('SETTLED')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
            statusFilter === 'SETTLED'
              ? 'bg-slate-700 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t.filter_settled} ({clientSummaries.filter((c) => c.status === 'SETTLED').length})
        </button>
      </div>

      {/* Clients List */}
      <div className="space-y-2">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
            <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">{t.no_clients_found}</p>
            <p className="text-xs text-slate-400 mt-1">{t.no_clients_desc}</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const fullName = `${client.firstName} ${client.lastName}`;
            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                onClick={() => onSelectClient(client.id)}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:border-emerald-400 active:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0 pr-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{fullName}</span>
                    <StatusBadge
                      status={client.status}
                      daysOverdue={client.daysOverdue}
                      daysUntilDue={client.daysUntilDue}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {client.phone}
                    </span>
                    {client.earliestDueDate && client.balance > 0 && (
                      <span className="text-[11px] text-slate-400">
                        {t.client_last_due} {formatDateDisplay(client.earliestDueDate, language)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-base font-extrabold ${
                        client.balance > 0 ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {formatFCFA(client.balance)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {client.creditsCount} {language === 'ar' ? 'دين' : `crédit${client.creditsCount > 1 ? 's' : ''}`}
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
