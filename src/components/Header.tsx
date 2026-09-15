import React from 'react';
import { BookOpen, Download, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';

export const Header: React.FC = () => {
  const { isInstallable, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
      <div className="max-w-md mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center border border-emerald-600 shadow-inner shrink-0">
            <BookOpen className="w-4 h-4 text-emerald-100" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white flex items-center gap-1.5 truncate">
              <span>{t.app_title}</span>
              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500 text-slate-900 animate-pulse shrink-0">
                  <WifiOff className="w-3 h-3" /> {t.offline}
                </span>
              )}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-emerald-200 truncate">{t.app_subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Switcher FR | العربية */}
          <div
            id="lang-selector-container"
            className="inline-flex items-center bg-emerald-950/70 rounded-lg p-0.5 border border-emerald-600/70 text-[11px] font-semibold"
            dir="ltr"
          >
            <button
              id="lang-btn-fr"
              onClick={() => setLanguage('fr')}
              className={`px-1.5 py-0.5 rounded transition ${
                language === 'fr'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-200 hover:text-white'
              }`}
              title="Passer en français"
            >
              FR
            </button>
            <span className="text-emerald-400/50 text-[10px] select-none">|</span>
            <button
              id="lang-btn-ar"
              onClick={() => setLanguage('ar')}
              className={`px-1.5 py-0.5 rounded transition ${
                language === 'ar'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-200 hover:text-white'
              }`}
              title="التبديل إلى العربية"
            >
              العربية
            </button>
          </div>

          {isInstallable && (
            <button
              id="header-btn-install"
              onClick={install}
              className="inline-flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg border border-emerald-500 transition shadow-sm"
              title={t.install}
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">{t.install}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

