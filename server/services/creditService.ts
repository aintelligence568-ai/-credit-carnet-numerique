import { db, normalizePhone } from '../db';
import crypto from 'node:crypto';

export type DebtStatus = 'UP_TO_DATE' | 'DUE_SOON' | 'OVERDUE' | 'SETTLED';
export type CreditAuthStatus = 'AUTHORIZED' | 'BLOCKED';

export interface CreditItemInput {
  name: string;
  quantity?: number;
  price: number;
}

export interface ClientSummaryResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  creditStatus: CreditAuthStatus;
  status: DebtStatus; // Independent debt status
  balance: number;
  totalCredits: number;
  totalPayments: number;
  daysOverdue?: number;
  daysUntilDue?: number;
  earliestDueDate?: string;
  isBlocked: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreditDetailResponse {
  id: string;
  userId: string;
  clientId: string;
  amount: number;
  creditDate: string;
  dueDate: string;
  entryMode: 'EXPRESS' | 'DETAILED';
  description?: string;
  status: DebtStatus;
  daysOverdue?: number;
  daysUntilDue?: number;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export interface PaymentResponse {
  id: string;
  userId: string;
  clientId: string;
  creditId?: string | null;
  amount: number;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

/**
 * Computes debt status and days difference given a due date and remaining balance
 */
export function computeDebtStatus(dueDateStr: string, balance: number): {
  status: DebtStatus;
  daysOverdue?: number;
  daysUntilDue?: number;
} {
  if (balance <= 0) {
    return { status: 'SETTLED' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'OVERDUE',
      daysOverdue: Math.abs(diffDays),
    };
  } else if (diffDays <= 1) {
    // Today or tomorrow
    return {
      status: 'DUE_SOON',
      daysUntilDue: Math.max(0, diffDays),
    };
  } else {
    return {
      status: 'UP_TO_DATE',
      daysUntilDue: diffDays,
    };
  }
}

/**
 * Service to manage all credit carnet operations with strict business validation
 */
export class CreditService {
  /**
   * Get client summary including calculated balance and dual statuses
   */
  static getClientSummary(userId: string, clientId: string): ClientSummaryResponse | null {
    const client = db.prepare(`
      SELECT * FROM clients 
      WHERE id = ? AND user_id = ?
    `).get(clientId, userId) as any;

    if (!client) return null;

    const totalCreditsRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM credits 
      WHERE client_id = ? AND user_id = ?
    `).get(clientId, userId) as any;

    const totalPaymentsRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE client_id = ? AND user_id = ?
    `).get(clientId, userId) as any;

    const totalCredits = totalCreditsRow ? totalCreditsRow.total : 0;
    const totalPayments = totalPaymentsRow ? totalPaymentsRow.total : 0;
    const balance = Math.max(0, totalCredits - totalPayments);

    // Get all credits to determine earliest due date and overall debt status
    const credits = db.prepare(`
      SELECT id, due_date, amount 
      FROM credits 
      WHERE client_id = ? AND user_id = ?
      ORDER BY due_date ASC
    `).all(clientId, userId) as any[];

    let overallStatus: DebtStatus = 'SETTLED';
    let daysOverdue: number | undefined;
    let daysUntilDue: number | undefined;
    let earliestDueDate: string | undefined;

    if (balance > 0 && credits.length > 0) {
      // Look for overdue credit first
      const overdueCredit = credits.find((c) => {
        const res = computeDebtStatus(c.due_date, balance);
        return res.status === 'OVERDUE';
      });

      if (overdueCredit) {
        const res = computeDebtStatus(overdueCredit.due_date, balance);
        overallStatus = 'OVERDUE';
        daysOverdue = res.daysOverdue;
        earliestDueDate = overdueCredit.due_date;
      } else {
        const dueSoonCredit = credits.find((c) => {
          const res = computeDebtStatus(c.due_date, balance);
          return res.status === 'DUE_SOON';
        });

        if (dueSoonCredit) {
          const res = computeDebtStatus(dueSoonCredit.due_date, balance);
          overallStatus = 'DUE_SOON';
          daysUntilDue = res.daysUntilDue;
          earliestDueDate = dueSoonCredit.due_date;
        } else {
          overallStatus = 'UP_TO_DATE';
          const firstCredit = credits[0];
          const res = computeDebtStatus(firstCredit.due_date, balance);
          daysUntilDue = res.daysUntilDue;
          earliestDueDate = firstCredit.due_date;
        }
      }
    }

    return {
      id: client.id,
      userId: client.user_id,
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      creditStatus: client.credit_status as CreditAuthStatus,
      status: overallStatus,
      balance,
      totalCredits,
      totalPayments,
      daysOverdue,
      daysUntilDue,
      earliestDueDate,
      isBlocked: client.credit_status === 'BLOCKED',
      isActive: Boolean(client.is_active),
      createdAt: client.created_at,
    };
  }

  /**
   * Get all active client summaries for user
   */
  static listClients(userId: string, search?: string): ClientSummaryResponse[] {
    let query = `
      SELECT id FROM clients 
      WHERE user_id = ? AND is_active = 1
    `;
    const params: any[] = [userId];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      const normalizedTerm = `%${normalizePhone(search.trim())}%`;
      query += ` AND (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR phone LIKE ?)`;
      params.push(term, term, normalizedTerm);
    }

    query += ` ORDER BY updated_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows
      .map((r) => this.getClientSummary(userId, r.id))
      .filter((c): c is ClientSummaryResponse => c !== null);
  }

  /**
   * Get credits for a client
   */
  static getClientCredits(userId: string, clientId: string): CreditDetailResponse[] {
    const rows = db.prepare(`
      SELECT * FROM credits 
      WHERE client_id = ? AND user_id = ?
      ORDER BY credit_date DESC, created_at DESC
    `).all(clientId, userId) as any[];

    return rows.map((c) => {
      const statusRes = computeDebtStatus(c.due_date, c.amount);

      // Fetch items if detailed
      let items: any[] | undefined;
      if (c.entry_mode === 'DETAILED') {
        const itemRows = db.prepare(`
          SELECT id, item_name as name, quantity, total_price as price 
          FROM credit_items 
          WHERE credit_id = ?
          ORDER BY created_at ASC
        `).all(c.id) as any[];
        items = itemRows;
      }

      return {
        id: c.id,
        userId: c.user_id,
        clientId: c.client_id,
        amount: c.amount,
        creditDate: c.credit_date,
        dueDate: c.due_date,
        entryMode: c.entry_mode,
        description: c.description || undefined,
        status: statusRes.status,
        daysOverdue: statusRes.daysOverdue,
        daysUntilDue: statusRes.daysUntilDue,
        items,
        createdAt: c.created_at,
      };
    });
  }

  /**
   * Get payments for a client
   */
  static getClientPayments(userId: string, clientId: string): PaymentResponse[] {
    const rows = db.prepare(`
      SELECT * FROM payments 
      WHERE client_id = ? AND user_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `).all(clientId, userId) as any[];

    return rows.map((p) => ({
      id: p.id,
      userId: p.user_id,
      clientId: p.client_id,
      creditId: p.credit_id || null,
      amount: p.amount,
      paymentDate: p.payment_date,
      notes: p.notes || undefined,
      createdAt: p.created_at,
    }));
  }

  /**
   * Create a new client with normalized phone and duplicate check
   */
  static createClient(
    userId: string,
    firstName: string,
    lastName: string,
    rawPhone: string
  ): ClientSummaryResponse {
    const normalized = normalizePhone(rawPhone);
    if (!normalized) {
      const err = new Error('Numéro de téléphone invalide.');
      (err as any).code = 'INVALID_PHONE';
      throw err;
    }

    if (!firstName.trim() || !lastName.trim()) {
      const err = new Error('Le prénom et le nom sont requis.');
      (err as any).code = 'MISSING_NAME';
      throw err;
    }

    // Check duplicate
    const existing = db.prepare(`
      SELECT id, first_name, last_name FROM clients 
      WHERE user_id = ? AND phone = ?
    `).get(userId, normalized) as any;

    if (existing) {
      const err = new Error(
        `Un client avec le numéro ${normalized} existe déjà (${existing.first_name} ${existing.last_name}).`
      );
      (err as any).code = 'PHONE_ALREADY_EXISTS';
      throw err;
    }

    const clientId = `client-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'AUTHORIZED', 1, ?, ?)
    `).run(clientId, userId, firstName.trim(), lastName.trim(), normalized, now, now);

    return this.getClientSummary(userId, clientId)!;
  }

  /**
   * Toggle or update client credit authorization status (AUTHORIZED <-> BLOCKED)
   */
  static updateClientCreditStatus(
    userId: string,
    clientId: string,
    newStatus: CreditAuthStatus
  ): ClientSummaryResponse {
    const client = db.prepare(`
      SELECT id FROM clients WHERE id = ? AND user_id = ?
    `).get(clientId, userId);

    if (!client) {
      const err = new Error('Client introuvable.');
      (err as any).code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE clients 
      SET credit_status = ?, updated_at = ? 
      WHERE id = ? AND user_id = ?
    `).run(newStatus, now, clientId, userId);

    return this.getClientSummary(userId, clientId)!;
  }

  /**
   * Create a new credit with strict business rules:
   * 1. Check client belongs to user & is active
   * 2. Check if client is BLOCKED -> error CLIENT_BLOCKED unless forceOverride is true
   * 3. Validate mode DETAILED: sum(items) === amount (atomic transaction)
   * 4. Mode EXPRESS: insert single credit record
   */
  static createCredit(
    userId: string,
    clientId: string,
    amount: number,
    dueDate: string,
    entryMode: 'EXPRESS' | 'DETAILED',
    description?: string,
    items?: CreditItemInput[],
    forceOverride?: boolean
  ): { creditId: string; clientSummary: ClientSummaryResponse } {
    if (!amount || amount <= 0) {
      const err = new Error('Le montant du crédit doit être un entier strictement positif.');
      (err as any).code = 'INVALID_AMOUNT';
      throw err;
    }

    const client = db.prepare(`
      SELECT id, credit_status, is_active FROM clients 
      WHERE id = ? AND user_id = ?
    `).get(clientId, userId) as any;

    if (!client || !client.is_active) {
      const err = new Error('Client introuvable ou inactif.');
      (err as any).code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    // Rule: if client is BLOCKED and no explicit override
    if (client.credit_status === 'BLOCKED' && !forceOverride) {
      const err = new Error(
        'Le crédit est bloqué pour ce client. Impossible d’enregistrer un nouveau crédit sans autorisation explicite.'
      );
      (err as any).code = 'CLIENT_BLOCKED';
      throw err;
    }

    // Mode DETAILED atomic check
    if (entryMode === 'DETAILED') {
      if (!items || items.length === 0) {
        const err = new Error('Le mode détaillé requiert au moins un article.');
        (err as any).code = 'INVALID_ITEMS';
        throw err;
      }

      const itemsTotal = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
      if (itemsTotal !== amount) {
        const err = new Error(
          `La somme des articles (${itemsTotal} FCFA) ne correspond pas au montant total (${amount} FCFA).`
        );
        (err as any).code = 'ITEMS_SUM_MISMATCH';
        (err as any).details = { itemsTotal, creditAmount: amount };
        throw err;
      }
    }

    const creditId = `credit-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        creditId,
        userId,
        clientId,
        amount,
        todayDate,
        dueDate,
        entryMode,
        description || null,
        now,
        now
      );

      if (entryMode === 'DETAILED' && items) {
        const itemStmt = db.prepare(`
          INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          const itemId = `item-${crypto.randomUUID()}`;
          itemStmt.run(
            itemId,
            creditId,
            item.name,
            item.quantity || 1,
            item.price,
            item.price,
            now
          );
        }
      }

      // Update client's updated_at
      db.prepare(`
        UPDATE clients SET updated_at = ? WHERE id = ?
      `).run(now, clientId);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updatedSummary = this.getClientSummary(userId, clientId)!;
    return { creditId, clientSummary: updatedSummary };
  }

  /**
   * Create a payment with strict business rules:
   * 1. Check client belongs to user
   * 2. Calculate current real balance
   * 3. Verify payment does not exceed current balance
   * 4. Reject if amount > balance with error PAYMENT_EXCEEDS_BALANCE
   * 5. Record payment and return new balance
   */
  static createPayment(
    userId: string,
    clientId: string,
    amount: number,
    notes?: string,
    creditId?: string | null
  ): { paymentId: string; clientSummary: ClientSummaryResponse; newBalance: number } {
    if (!amount || amount <= 0) {
      const err = new Error('Le montant du paiement doit être un entier supérieur à zéro.');
      (err as any).code = 'INVALID_AMOUNT';
      throw err;
    }

    const clientSummary = this.getClientSummary(userId, clientId);
    if (!clientSummary || !clientSummary.isActive) {
      const err = new Error('Client introuvable ou inactif.');
      (err as any).code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    const currentBalance = clientSummary.balance;

    // RULE 5: Solde ne peut pas devenir négatif
    if (amount > currentBalance) {
      const err = new Error(
        `Le montant payé (${amount} FCFA) dépasse le solde restant (${currentBalance} FCFA). Le solde ne peut pas être négatif.`
      );
      (err as any).code = 'PAYMENT_EXCEEDS_BALANCE';
      (err as any).details = {
        currentBalance,
        attemptedAmount: amount,
        excess: amount - currentBalance,
      };
      throw err;
    }

    const paymentId = `payment-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO payments (id, user_id, client_id, credit_id, amount, payment_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        userId,
        clientId,
        creditId || null,
        amount,
        todayDate,
        notes || null,
        now
      );

      db.prepare(`
        UPDATE clients SET updated_at = ? WHERE id = ?
      `).run(now, clientId);

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updatedSummary = this.getClientSummary(userId, clientId)!;
    return {
      paymentId,
      clientSummary: updatedSummary,
      newBalance: updatedSummary.balance,
    };
  }

  /**
   * Soft delete client: permitted only if balance is 0.
   */
  static deleteClient(userId: string, clientId: string): { success: boolean } {
    const summary = this.getClientSummary(userId, clientId);
    if (!summary) {
      const err = new Error('Client introuvable.');
      (err as any).code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    if (summary.balance > 0) {
      const err = new Error(
        `Impossible de désactiver un client ayant encore une dette active de ${summary.balance} FCFA.`
      );
      (err as any).code = 'CANNOT_DELETE_ACTIVE_DEBT';
      (err as any).details = { balance: summary.balance };
      throw err;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE clients SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(now, clientId, userId);

    return { success: true };
  }

  /**
   * Get Cockpit Dashboard stats for Cheikh
   */
  static getCockpitStats(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const firstDayOfMonth = `${currentYear}-${currentMonth}-01`;

    // Credits this month
    const creditedThisMonthRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM credits 
      WHERE user_id = ? AND credit_date >= ?
    `).get(userId, firstDayOfMonth) as any;

    // Recovered this month
    const recoveredThisMonthRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE user_id = ? AND payment_date >= ?
    `).get(userId, firstDayOfMonth) as any;

    const allClients = this.listClients(userId);

    const totalRemainingToRecover = allClients.reduce((acc, c) => acc + c.balance, 0);
    const overdueClientsCount = allClients.filter((c) => c.status === 'OVERDUE').length;
    const dueSoonClientsCount = allClients.filter((c) => c.status === 'DUE_SOON').length;

    return {
      totalCreditedThisMonth: creditedThisMonthRow ? creditedThisMonthRow.total : 0,
      totalRecoveredThisMonth: recoveredThisMonthRow ? recoveredThisMonthRow.total : 0,
      totalRemainingToRecover,
      overdueClientsCount,
      dueSoonClientsCount,
      activeClientsCount: allClients.length,
    };
  }
}
