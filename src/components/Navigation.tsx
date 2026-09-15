import React from 'react';
import { Home, Users, BarChart3, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type ActiveTab = 'accueil' | 'clients' | 'suivi';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewCredit: () => void;
  overdueCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewCredit,
  overdueCount,
}) => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg pb-safe">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Accueil */}
        <button
          id="nav-tab-accueil"
          onClick={() => onSelectTab('accueil')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'accueil' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Home className="w-5 h-5" />
            {overdueCount > 0 && (
              <span className={`absolute -top-1.5 ${isRTL ? '-left-2' : '-right-2'} bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center`}>
                {overdueCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">{t.nav_accueil}</span>
        </button>

        {/* Tab 2: Clients */}
        <button
          id="nav-tab-clients"
          onClick={() => onSelectTab('clients')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'clients' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] mt-1">{t.nav_clients}</span>
        </button>

        {/* Center Action: + Crédit */}
        <div className="flex-none px-2 -mt-5">
          <button
            id="nav-btn-new-credit"
            onClick={onOpenNewCredit}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 rounded-full shadow-lg shadow-emerald-700/30 font-bold text-sm transition"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>{t.nav_new_credit}</span>
          </button>
        </div>

        {/* Tab 3: Suivi */}
        <button
          id="nav-tab-suivi"
          onClick={() => onSelectTab('suivi')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'suivi' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[11px] mt-1">{t.nav_suivi}</span>
        </button>
      </div>
    </div>
  );
};
