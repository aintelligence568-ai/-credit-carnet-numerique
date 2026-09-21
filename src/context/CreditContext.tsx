import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { Client, Credit, Payment, ClientSummary, ClientStatus, CockpitStats, CreditItem } from '../types';
import { formatIsoDate } from '../data/initialData';
import { useAuth } from './AuthContext';

interface CreditContextType {
  clients: Client[];
  credits: Credit[];
  payments: Payment[];
  clientSummaries: ClientSummary[];
  cockpitStats: CockpitStats;
  clientsToRemind: ClientSummary[];
  isLoading: boolean;
  isLoadingClientHistory: boolean;
  addCredit: (clientId: string, amount: number, dueDate: string, description?: string, items?: CreditItem[], forceOverride?: boolean) => Promise<boolean>;
  addPayment: (clientId: string, amount: number, notes?: string, idempotencyKey?: string) => Promise<boolean>;
  toggleBlockClient: (clientId: string) => Promise<void>;
  createClient: (firstName: string, lastName: string, phone: string) => Promise<Client | null>;
  updateClient: (clientId: string, data: { firstName: string; lastName: string; phone: string }) => Promise<boolean>;
  deleteClient: (clientId: string) => Promise<boolean>;
  updateCredit: (creditId: string, data: { amount?: number; dueDate?: string; description?: string }) => Promise<boolean>;
  deleteCredit: (creditId: string) => Promise<boolean>;
  updatePayment: (paymentId: string, data: { amount?: number; notes?: string; paymentDate?: string }) => Promise<boolean>;
  deletePayment: (paymentId: string) => Promise<boolean>;
  getClientSummary: (clientId: string) => ClientSummary | undefined;
  loadClientHistory: (clientId: string) => Promise<void>;
  getClientCredits: (clientId: string) => Credit[];
  getClientPayments: (clientId: string) => Payment[];
  resetToInitialData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | null>(null);

export const CreditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authFetch, isAuthenticated, user } = useAuth();
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([]);
  const [clientHistoryCache, setClientHistoryCache] = useState<Record<string, { credits: Credit[]; payments: Payment[] }>>({});
  const [isLoadingClientHistory, setIsLoadingClientHistory] = useState<boolean>(false);
  const [cockpitStats, setCockpitStats] = useState<CockpitStats>({
    totalCreditedThisMonth: 0,
    totalRecoveredThisMonth: 0,
    totalRemainingToRecover: 0,
    overdueClientsCount: 0,
    dueSoonClientsCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch full state from backend API (Only 2 requests total at boot: /api/clients and /api/cockpit/stats)
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setClientSummaries([]);
      setClientHistoryCache({});
      setCockpitStats({
        totalCreditedThisMonth: 0,
        totalRecoveredThisMonth: 0,
        totalRemainingToRecover: 0,
        overdueClientsCount: 0,
        dueSoonClientsCount: 0,
      });
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch clients summaries (Single query with calculated balance, counts, and status)
      const clientsRes = await authFetch('/api/clients');
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
          creditsCount: c.creditsCount ?? 0,
          paymentsCount: c.paymentsCount ?? 0,
        };
      });

      setClientSummaries(mappedSummaries);

      // 2. Fetch Cockpit Stats (Single query)
      const statsRes = await authFetch('/api/cockpit/stats');
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
  }, [authFetch, isAuthenticated]);

  // Initial load & reset on user change to strictly isolate data between accounts
  useEffect(() => {
    setClientSummaries([]);
    setClientHistoryCache({});
    setCockpitStats({
      totalCreditedThisMonth: 0,
      totalRecoveredThisMonth: 0,
      totalRemainingToRecover: 0,
      overdueClientsCount: 0,
      dueSoonClientsCount: 0,
    });
    if (isAuthenticated && user?.id) {
      setIsLoading(true);
      refreshData();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated, refreshData]);

  // Load client detailed history (credits + payments) on-demand when opening client modal
  const loadClientHistory = useCallback(async (clientId: string) => {
    if (!clientId) return;
    try {
      setIsLoadingClientHistory(true);
      const [crRes, pyRes] = await Promise.all([
        authFetch(`/api/clients/${clientId}/credits`),
        authFetch(`/api/clients/${clientId}/payments`),
      ]);

      const crList = crRes.ok ? await crRes.json() : [];
      const pyList = pyRes.ok ? await pyRes.json() : [];

      const mappedCredits: Credit[] = crList.map((cr: any) => ({
        id: cr.id,
        clientId: cr.clientId,
        amount: cr.amount,
        date: cr.creditDate,
        dueDate: cr.dueDate,
        description: cr.description,
        items: cr.items,
        createdAt: new Date(cr.createdAt).getTime(),
      }));

      const mappedPayments: Payment[] = pyList.map((py: any) => ({
        id: py.id,
        clientId: py.clientId,
        amount: py.amount,
        date: py.paymentDate,
        notes: py.notes,
        createdAt: new Date(py.createdAt).getTime(),
      }));

      setClientHistoryCache((prev) => ({
        ...prev,
        [clientId]: {
          credits: mappedCredits,
          payments: mappedPayments,
        },
      }));
    } catch (err) {
      console.error(`Erreur chargement historique client ${clientId}:`, err);
    } finally {
      setIsLoadingClientHistory(false);
    }
  }, [authFetch]);

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

  // Derived credits and payments for backwards compatibility
  const credits = useMemo<Credit[]>(() => {
    return Object.keys(clientHistoryCache).flatMap((k) => clientHistoryCache[k]?.credits || []);
  }, [clientHistoryCache]);

  const payments = useMemo<Payment[]>(() => {
    return Object.keys(clientHistoryCache).flatMap((k) => clientHistoryCache[k]?.payments || []);
  }, [clientHistoryCache]);

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
      const res = await authFetch('/api/credits', {
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
      if (clientId) {
        await loadClientHistory(clientId);
      }
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const addPayment = async (
    clientId: string,
    amount: number,
    notes?: string,
    idempotencyKey?: string
  ): Promise<boolean> => {
    if (amount <= 0) return false;

    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `pay-${Date.now()}-${Math.random()}`);

    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          clientId,
          amount,
          notes,
          idempotencyKey: key,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'IDEMPOTENCY_CONFLICT') {
          alert(
            `Erreur : Conflit d'idempotence. Un paiement avec cette même clé existe déjà avec des paramètres différents.`
          );
        } else if (data.code === 'PAYMENT_EXCEEDS_BALANCE') {
          alert(
            `Erreur : Le montant payé (${amount} FCFA) dépasse le solde restant dû (${data.details?.currentBalance || 0} FCFA).\nLe solde ne peut jamais devenir négatif.`
          );
        } else {
          alert(`Erreur : ${data.error || 'Impossible d’enregistrer le paiement.'}`);
        }
        return false;
      }

      await refreshData();
      if (clientId) {
        await loadClientHistory(clientId);
      }
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
      const res = await authFetch(`/api/clients/${clientId}/credit-status`, {
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
      const res = await authFetch('/api/clients', {
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

  const updateClient = async (
    clientId: string,
    data: { firstName: string; lastName: string; phone: string }
  ): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de mettre à jour le client.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const deleteClient = async (clientId: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de supprimer ce client.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const updateCredit = async (
    creditId: string,
    data: { amount?: number; dueDate?: string; description?: string }
  ): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/credits/${creditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de modifier ce crédit.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const deleteCredit = async (creditId: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/credits/${creditId}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de supprimer ce crédit.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const updatePayment = async (
    paymentId: string,
    data: { amount?: number; notes?: string; paymentDate?: string }
  ): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de modifier ce paiement.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const deletePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(`Erreur : ${resData.error || 'Impossible de supprimer ce paiement.'}`);
        return false;
      }

      await refreshData();
      return true;
    } catch (err: any) {
      alert(`Erreur de connexion au serveur : ${err.message}`);
      return false;
    }
  };

  const getClientSummary = (clientId: string) => {
    return clientSummaries.find((c) => c.id === clientId);
  };

  const getClientCredits = (clientId: string) => {
    const cached = clientHistoryCache[clientId]?.credits;
    if (cached) {
      return cached.slice().sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  };

  const getClientPayments = (clientId: string) => {
    const cached = clientHistoryCache[clientId]?.payments;
    if (cached) {
      return cached.slice().sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  };

  const resetToInitialData = async () => {
    try {
      const res = await authFetch('/api/test/reset', { method: 'POST' });
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
        isLoadingClientHistory,
        addCredit,
        addPayment,
        toggleBlockClient,
        createClient,
        updateClient,
        deleteClient,
        updateCredit,
        deleteCredit,
        updatePayment,
        deletePayment,
        getClientSummary,
        loadClientHistory,
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
