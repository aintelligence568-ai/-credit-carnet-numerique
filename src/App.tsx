/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreditProvider, useCredit } from './context/CreditContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { AccueilView } from './components/AccueilView';
import { ClientsView } from './components/ClientsView';
import { SuiviView } from './components/SuiviView';
import { ClientDetailModal } from './components/ClientDetailModal';
import { NewCreditModal } from './components/NewCreditModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { ReminderModal } from './components/ReminderModal';
import { NewClientModal } from './components/NewClientModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthScreen } from './components/AuthScreen';
import { ClientSummary } from './types';

function MainApp() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { cockpitStats } = useCredit();
  const { dir } = useLanguage();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('accueil');

  // Modals state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewCreditOpen, setIsNewCreditOpen] = useState(false);
  const [creditPreselectedClientId, setCreditPreselectedClientId] = useState<string | undefined>();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentPreselectedClientId, setPaymentPreselectedClientId] = useState<string | undefined>();
  const [reminderConfig, setReminderConfig] = useState<{
    client: ClientSummary;
    type: 'whatsapp' | 'sms';
  } | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  // Handlers
  const handleOpenNewCredit = (clientId?: string) => {
    setCreditPreselectedClientId(clientId);
    setIsNewCreditOpen(true);
  };

  const handleOpenPayment = (clientId?: string) => {
    setPaymentPreselectedClientId(clientId);
    setIsPaymentOpen(true);
  };

  const handleOpenReminder = (client: ClientSummary, type: 'whatsapp' | 'sms') => {
    setReminderConfig({ client, type });
  };

  return (
    <div className="h-full h-[100dvh] w-full bg-slate-100 sm:bg-slate-200/80 sm:p-3 md:p-6 flex items-center justify-center font-sans antialiased overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Responsive App Container */}
      <div
        dir={dir}
        className="w-full h-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl sm:h-[calc(100dvh-2rem)] sm:max-h-[940px] bg-slate-100 sm:rounded-2xl shadow-xl flex flex-col overflow-hidden relative border-0 sm:border sm:border-slate-300/70"
      >
        {/* Top Header */}
        <Header />

        {/* Auth Loading State */}
        {isAuthLoading ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Chargement du carnet de crédit...</p>
          </div>
        ) : !isAuthenticated ? (
          /* Authentication Screen */
          <AuthScreen />
        ) : (
          /* Main Authenticated Application */
          <>
            <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3.5 sm:p-5 custom-scrollbar">
              {activeTab === 'accueil' && (
                <AccueilView
                  onSelectClient={(id) => setSelectedClientId(id)}
                  onOpenNewCredit={handleOpenNewCredit}
                  onOpenPayment={handleOpenPayment}
                  onOpenReminder={handleOpenReminder}
                />
              )}

              {activeTab === 'clients' && (
                <ClientsView
                  onSelectClient={(id) => setSelectedClientId(id)}
                  onOpenNewClientModal={() => setIsNewClientOpen(true)}
                />
              )}

              {activeTab === 'suivi' && (
                <SuiviView
                  onSelectClient={(id) => setSelectedClientId(id)}
                  onOpenReminder={handleOpenReminder}
                />
              )}
            </main>

            {/* Bottom Navigation */}
            <Navigation
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenNewCredit={() => handleOpenNewCredit()}
              overdueCount={cockpitStats.overdueClientsCount}
            />

            {/* Modals & Sheets */}
            {selectedClientId && (
              <ClientDetailModal
                clientId={selectedClientId}
                onClose={() => setSelectedClientId(null)}
                onOpenNewCredit={(id) => {
                  setSelectedClientId(null);
                  handleOpenNewCredit(id);
                }}
                onOpenPayment={(id) => {
                  setSelectedClientId(null);
                  handleOpenPayment(id);
                }}
                onOpenReminder={handleOpenReminder}
              />
            )}

            {isNewCreditOpen && (
              <NewCreditModal
                initialClientId={creditPreselectedClientId}
                onClose={() => {
                  setIsNewCreditOpen(false);
                  setCreditPreselectedClientId(undefined);
                }}
                onSuccess={(clientId) => {
                  setIsNewCreditOpen(false);
                  setCreditPreselectedClientId(undefined);
                  setSelectedClientId(clientId);
                }}
              />
            )}

            {isPaymentOpen && (
              <NewPaymentModal
                initialClientId={paymentPreselectedClientId}
                onClose={() => {
                  setIsPaymentOpen(false);
                  setPaymentPreselectedClientId(undefined);
                }}
                onSuccess={(clientId) => {
                  setIsPaymentOpen(false);
                  setPaymentPreselectedClientId(undefined);
                  setSelectedClientId(clientId);
                }}
              />
            )}

            {reminderConfig && (
              <ReminderModal
                client={reminderConfig.client}
                initialType={reminderConfig.type}
                onClose={() => setReminderConfig(null)}
              />
            )}

            {isNewClientOpen && (
              <NewClientModal
                onClose={() => setIsNewClientOpen(false)}
                onSuccess={(newId) => {
                  setIsNewClientOpen(false);
                  setSelectedClientId(newId);
                }}
              />
            )}
          </>
        )}

        {/* Offline notification banner */}
        <OfflineIndicator />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CreditProvider>
          <MainApp />
        </CreditProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
