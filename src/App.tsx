/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { ClientSummary } from './types';

function MainApp() {
  const { cockpitStats, resetToInitialData } = useCredit();
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
    <div className="min-h-screen bg-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Mobile-first responsive app container */}
      <div
        dir={dir}
        className="w-full max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col relative sm:shadow-lg sm:border-x sm:border-slate-200"
      >
        {/* Top Header */}
        <Header />

        {/* Viewport Content with natural scrolling */}
        <main className="flex-1 p-3.5">
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

        {/* Offline notification banner */}
        <OfflineIndicator />

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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CreditProvider>
        <MainApp />
      </CreditProvider>
    </LanguageProvider>
  );
}
