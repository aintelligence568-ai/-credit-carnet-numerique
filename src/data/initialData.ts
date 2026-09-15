import { Client, Credit, Payment } from '../types';

export const formatIsoDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const offsetDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatIsoDate(d);
};

export const getInitialClients = (): Client[] => [
  {
    id: 'client-1',
    firstName: 'Mamadou',
    lastName: 'Diallo',
    phone: '77 123 45 67',
    isBlocked: false,
    createdAt: offsetDate(-10),
  },
  {
    id: 'client-2',
    firstName: 'Fatou',
    lastName: 'Sow',
    phone: '78 987 65 43',
    isBlocked: false,
    createdAt: offsetDate(-7),
  },
  {
    id: 'client-3',
    firstName: 'Moussa',
    lastName: 'Ba',
    phone: '76 555 12 34',
    isBlocked: true, // Statut : Crédit bloqué
    createdAt: offsetDate(-30),
  },
  {
    id: 'client-4',
    firstName: 'Aïda',
    lastName: 'Ndiaye',
    phone: '70 111 22 33',
    isBlocked: false,
    createdAt: offsetDate(0), // Aujourd'hui
  },
  {
    id: 'client-5',
    firstName: 'Ousmane',
    lastName: 'Fall',
    phone: '77 444 88 99',
    isBlocked: false,
    createdAt: offsetDate(-40),
  },
];

export const getInitialCredits = (): Credit[] => [
  // 1. Mamadou Diallo: Crédit 25 000 FCFA, Échéance dépassée de 3 jours (-3)
  {
    id: 'credit-1',
    clientId: 'client-1',
    amount: 25000,
    date: offsetDate(-10),
    dueDate: offsetDate(-3),
    description: 'Courses diverses',
    createdAt: Date.now() - 10 * 86400000,
  },

  // 2. Fatou Sow: Crédit 15 000 FCFA, Échéance demain (+1)
  {
    id: 'credit-2',
    clientId: 'client-2',
    amount: 15000,
    date: offsetDate(-6),
    dueDate: offsetDate(1), // Demain
    description: 'Provisions semaine',
    createdAt: Date.now() - 6 * 86400000,
  },

  // 3. Moussa Ba: 3 crédits (Riz 20 000, Huile 15 000, Sucre 10 000 = 45 000 FCFA), Retard 20 jours
  {
    id: 'credit-3-1',
    clientId: 'client-3',
    amount: 20000,
    date: offsetDate(-28),
    dueDate: offsetDate(-20), // Échéance dépassée de 20 jours
    description: 'Sac de riz',
    items: [{ id: 'item-3-1', name: 'Riz', price: 20000, quantity: 1 }],
    createdAt: Date.now() - 28 * 86400000,
  },
  {
    id: 'credit-3-2',
    clientId: 'client-3',
    amount: 15000,
    date: offsetDate(-25),
    dueDate: offsetDate(-20),
    description: 'Bidon huile',
    items: [{ id: 'item-3-2', name: 'Huile', price: 15000, quantity: 1 }],
    createdAt: Date.now() - 25 * 86400000,
  },
  {
    id: 'credit-3-3',
    clientId: 'client-3',
    amount: 10000,
    date: offsetDate(-22),
    dueDate: offsetDate(-20),
    description: 'Sucre en poudre',
    items: [{ id: 'item-3-3', name: 'Sucre', price: 10000, quantity: 1 }],
    createdAt: Date.now() - 22 * 86400000,
  },

  // 4. Aïda Ndiaye: Crédit détaillé (Riz 5000, Savon 3500 = 8 500 FCFA), pris aujourd'hui, échéance dans 15 jours
  {
    id: 'credit-4',
    clientId: 'client-4',
    amount: 8500,
    date: offsetDate(0), // Aujourd'hui
    dueDate: offsetDate(15), // Dans 15 jours
    description: 'Riz (5 000 FCFA) + Savon (3 500 FCFA)',
    items: [
      { id: 'item-4-1', name: 'Riz', price: 5000, quantity: 1 },
      { id: 'item-4-2', name: 'Savon', price: 3500, quantity: 1 },
    ],
    createdAt: Date.now(),
  },

  // 5. Ousmane Fall: Ancien crédit 20 000 FCFA
  {
    id: 'credit-5',
    clientId: 'client-5',
    amount: 20000,
    date: offsetDate(-35),
    dueDate: offsetDate(-15),
    description: 'Ancien crédit soldé',
    createdAt: Date.now() - 35 * 86400000,
  },
];

export const getInitialPayments = (): Payment[] => [
  // Moussa Ba: Paiement déjà effectué de 10 000 FCFA (sur 45 000 = reste 35 000 FCFA)
  {
    id: 'payment-3',
    clientId: 'client-3',
    amount: 10000,
    date: offsetDate(-14),
    notes: 'Acompte espèces au comptoir',
    createdAt: Date.now() - 14 * 86400000,
  },

  // Ousmane Fall: Paiement complet de 20 000 FCFA (solde = 0 FCFA)
  {
    id: 'payment-5',
    clientId: 'client-5',
    amount: 20000,
    date: offsetDate(-10),
    notes: 'Règlement total espèces',
    createdAt: Date.now() - 10 * 86400000,
  },
];
