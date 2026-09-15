import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { Client, Credit, Payment, ClientSummary, ClientStatus, CockpitStats, CreditItem } from '../types';
import { formatIsoDate } from '../data/initialData';

interface CreditContextType {
  clients: Client[];
  credits: Credit[];
  payments: Payment[];
  clientSummaries: ClientSummary[];
  cockpitStats: CockpitStats;
  clientsToRemind: ClientSummary[];
  isLoading: boolean;
  addCredit: (clientId: string, amount: number, dueDate: string, description?: string, items?: CreditItem[], forceOverride?: boolean) => Promise<boolean>;
  addPayment: (clientId: string, amount: number, notes?: string) => Promise<boolean>;
  toggleBlockClient: (clientId: string) => Promise<void>;
  createClient: (firstName: string, lastName: string, phone: string) => Promise<Client | null>;
  getClientSummary: (clientId: string) => ClientSummary | undefined;
  getClientCredits: (clientId: string) => Credit[];
  getClientPayments: (clientId: string) => Payment[];
  resetToInitialData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | null>(null);

export const CreditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cockpitStats, setCockpitStats] = useState<CockpitStats>({
    totalCreditedThisMonth: 0,
    totalRecoveredThisMonth: 0,
    totalRemainingToRecover: 0,
    overdueClientsCount: 0,
    dueSoonClientsCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch full state from backend API
  const refreshData = useCallback(async () => {
    try {
      // 1. Fetch clients summaries
      const clientsRes = await fetch('/api/clients');
      if (!clientsRes.ok) throw new Error('Erreur chargement clients');
      const clientsData = await clientsRes.json();

      // Transform backend client summary into frontend ClientSummary
      const mappedSummaries: ClientSummary[] = clientsData.map((c: any) => {
        let statusLabel = 'À jour';
        if (c.creditStatus === 'BLOCKED') {
          statusLabel = 'Crédit bloqué';
        } else if (c.status === 'SETTLED') {
          statusLabel = 'Soldé';
        } else if (c.status === 'OVERDUE') {
          statusLabel = 'En retard';
        } else if (c.status === 'DUE_SOON') {
          statusLabel = 'Bientôt à échéance';
        }

        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          isBlocked: c.creditStatus === 'BLOCKED',
          creditStatus: c.creditStatus,
          createdAt: c.createdAt,
          totalCredits: c.totalCredits,
          totalPayments: c.totalPayments,
          balance: c.balance,
          status: (c.creditStatus === 'BLOCKED' ? 'BLOCKED' : c.status) as ClientStatus,
          statusLabel,
          daysOverdue: c.daysOverdue,
          daysUntilDue: c.daysUntilDue,
          earliestDueDate: c.earliestDueDate,
          creditsCount: 0,
          paymentsCount: 0,
        };
      });

      setClientSummaries(mappedSummaries);

      // 2. Fetch credits & payments for all clients
      const allCredits: Credit[] = [];
      const allPayments: Payment[] = [];

      await Promise.all(
        clientsData.map(async (c: any) => {
          try {
            const [crRes, pyRes] = await Promise.all([
              fetch(`/api/clients/${c.id}/credits`),
              fetch(`/api/clients/${c.id}/payments`),
            ]);

            if (crRes.ok) {
              const crList = await crRes.json();
              crList.forEach((cr: any) => {
                allCredits.push({
                  id: cr.id,
                  clientId: cr.clientId,
                  amount: cr.amount,
                  date: cr.creditDate,
                  dueDate: cr.dueDate,
                  description: cr.description,
                  items: cr.items,
                  createdAt: new Date(cr.createdAt).getTime(),
                });
              });
            }

            if (pyRes.ok) {
              const pyList = await pyRes.json();
              pyList.forEach((py: any) => {
                allPayments.push({
                  id: py.id,
                  clientId: py.clientId,
                  amount: py.amount,
                  date: py.paymentDate,
                  notes: py.notes,
                  createdAt: new Date(py.createdAt).getTime(),
                });
              });
            }
          } catch (e) {
            console.error(`Error loading history for ${c.id}:`, e);
          }
        })
      );

      setCredits(allCredits);
      setPayments(allPayments);

      // Update credit/payment counts in summaries
      setClientSummaries((prev) =>
        prev.map((s) => ({
          ...s,
          creditsCount: allCredits.filter((cr) => cr.clientId === s.id).length,
          paymentsCount: allPayments.filter((py) => py.clientId === s.id).length,
        }))
      );

      // 3. Fetch Cockpit Stats
      const statsRes = await fetch('/api/cockpit/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setCockpitStats({
          totalCreditedThisMonth: statsData.totalCreditedThisMonth,
          totalRecoveredThisMonth: statsData.totalRecoveredThisMonth,
          totalRemainingToRecover: statsData.totalRemainingToRecover,
          overdueClientsCount: statsData.overdueClientsCount,
          dueSoonClientsCount: statsData.dueSoonClientsCount,
        });
      }
    } catch (err) {
      console.error('Failed to sync with backend API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Plain clients list
  const clients = useMemo<Client[]>(() => {
    return clientSummaries.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      isBlocked: s.isBlocked,
      createdAt: s.createdAt,
    }));
  }, [clientSummaries]);

  // Clients to remind: priority to overdue, then due soon
  const clientsToRemind = useMemo<ClientSummary[]>(() => {
    const relevant = clientSummaries.filter(
      (c) => c.balance > 0 && (c.status === 'OVERDUE' || c.status === 'DUE_SOON' || c.isBlocked)
    );

    return relevant.sort((a, b) => {
      // Overdue first (highest overdue days first)
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      if (a.status === 'OVERDUE' && b.status === 'OVERDUE') {
        return (b.daysOverdue || 0) - (a.daysOverdue || 0);
      }
      // Then DUE_SOON (soonest due first)
      if (a.status === 'DUE_SOON' && b.status !== 'DUE_SOON') return -1;
      if (b.status === 'DUE_SOON' && a.status !== 'DUE_SOON') return 1;
      return (a.daysUntilDue || 0) - (b.daysUntilDue || 0);
    });
  }, [clientSummaries]);

  // -------------------------------------------------------------
  // Backend Mutating Actions
  // -------------------------------------------------------------

  const addCredit = async (
    clientId: string,
    amount: number,
    dueDate: string,
    description?: string,
    items?: CreditItem[],
    forceOverride?: boolean
  ): Promise<boolean> => {
    if (amount <= 0) return false;

    const entryMode = items && items.length > 0 ? 'DETAILED' : 'EXPRESS';
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          amount,
          dueDate,
          entryMode,
          description,
          items,
          forceOverride,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'CLIENT_BLOCKED') {
          const proceed = window.confirm(
            'Ce client est actuellement bloqué pour les crédits.\nSouhaitez-vous forcer exceptionnellement ce crédit ?'
          );
          if (proceed) {
            return addCredit(clientId, amount, dueDate, description, items, true);
          }
        } else {
          alert(`Erreur: ${data.error || 'Impossible d’enregistrer le crédit.'}`);
        }
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const addPayment = async (clientId: string, amount: number, notes?: string): Promise<boolean> => {
    if (amount <= 0) return false;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          amount,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PAYMENT_EXCEEDS_BALANCE') {
          alert(
            `Erreur : Le montant payé (${amount} FCFA) dépasse le solde restant dû (${data.details?.currentBalance || 0} FCFA).\nLe solde ne peut jamais devenir négatif.`
          );
        } else {
          alert(`Erreur : ${data.error || 'Impossible d’enregistrer le paiement.'}`);
        }
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const toggleBlockClient = async (clientId: string): Promise<void> => {
    const client = clientSummaries.find((c) => c.id === clientId);
    if (!client) return;

    const newStatus = client.isBlocked ? 'AUTHORIZED' : 'BLOCKED';
    try {
      const res = await fetch(`/api/clients/${clientId}/credit-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditStatus: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erreur : ${err.error}`);
        return;
      }

      await refreshData();
    } catch (err: any) {
      alert(`Erreur de communication avec le serveur : ${err.message}`);
    }
  };

  const createClient = async (
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<Client | null> => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${data.error}`);
        return null;
      }

      await refreshData();
      return {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isBlocked: false,
        createdAt: data.createdAt,
      };
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return null;
    }
  };

  const getClientSummary = (clientId: string) => {
    return clientSummaries.find((c) => c.id === clientId);
  };

  const getClientCredits = (clientId: string) => {
    return credits
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  const getClientPayments = (clientId: string) => {
    return payments
      .filter((p) => p.clientId === clientId)
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  const resetToInitialData = async () => {
    try {
      const res = await fetch('/api/test/reset', { method: 'POST' });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to reset data on backend:', err);
    }
  };

  return (
    <CreditContext.Provider
      value={{
        clients,
        credits,
        payments,
        clientSummaries,
        cockpitStats,
        clientsToRemind,
        isLoading,
        addCredit,
        addPayment,
        toggleBlockClient,
        createClient,
        getClientSummary,
        getClientCredits,
        getClientPayments,
        resetToInitialData,
        refreshData,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};

export const useCredit = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};
