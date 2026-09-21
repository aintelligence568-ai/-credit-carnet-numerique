export type ClientStatus = 'OVERDUE' | 'DUE_SOON' | 'UP_TO_DATE' | 'SETTLED' | 'BLOCKED';

export interface CreditItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
}

export interface Credit {
  id: string;
  clientId: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
  dueDate: string; // ISO date string YYYY-MM-DD
  description?: string;
  items?: CreditItem[];
  createdAt: number; // timestamp
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
  notes?: string;
  createdAt: number; // timestamp
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  isBlocked: boolean;
  createdAt: string;
  notes?: string;
}

export interface ClientSummary extends Client {
  totalCredits: number;
  totalPayments: number;
  balance: number;
  status: ClientStatus;
  statusLabel: string;
  earliestDueDate?: string;
  latestDueDate?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
  creditsCount: number;
  paymentsCount: number;
}

export interface CockpitStats {
  totalCreditedThisMonth: number;
  totalRecoveredThisMonth: number;
  totalRemainingToRecover: number;
  overdueClientsCount: number;
  dueSoonClientsCount: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  shopName?: string;
}

