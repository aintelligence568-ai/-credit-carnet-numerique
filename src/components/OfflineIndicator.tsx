import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-lg animate-bounce"
    >
      <WifiOff className="w-4 h-4" />
      <span>Mode Hors-ligne — Vous pouvez continuer à gérer vos crédits au comptoir !</span>
    </div>
  );
};
