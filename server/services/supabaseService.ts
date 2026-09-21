import { getSupabaseClient } from '../supabase';
import {
  DebtStatus,
  CreditAuthStatus,
  ClientSummaryResponse,
  CreditDetailResponse,
  PaymentResponse,
  computeDebtStatus,
  CreditItemInput,
} from './creditService';
import { normalizePhone } from '../db';
import crypto from 'node:crypto';

export class SupabaseService {
  /**
   * Tests connection to Supabase
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase n’est pas configuré. Veuillez renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY).',
      };
    }

    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        return {
          success: false,
          message: `Erreur Supabase: ${error.message}. Avez-vous exécuté le script SQL fourni dans supabase/schema.sql ?`,
        };
      }
      return { success: true, message: 'Connexion Supabase active et tables accessibles.' };
    } catch (err: any) {
      return { success: false, message: `Erreur de connexion : ${err.message}` };
    }
  }

  /**
   * Calculates cockpit statistics for a user from Supabase
   */
  static async getCockpitStats(userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const firstDayMonth = `${currentYear}-${currentMonth}-01`;

    // 1. All active clients
    const { data: clients, error: clErr } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (clErr) throw new Error(`Supabase query error: ${clErr.message}`);

    // 2. All credits
    const { data: credits, error: crErr } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId);

    if (crErr) throw new Error(`Supabase query error: ${crErr.message}`);

    // 3. All payments
    const { data: payments, error: pyErr } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (pyErr) throw new Error(`Supabase query error: ${pyErr.message}`);

    let totalCreditedThisMonth = 0;
    (credits || []).forEach((c) => {
      if (c.credit_date >= firstDayMonth) {
        totalCreditedThisMonth += Number(c.amount);
      }
    });

    let totalRecoveredThisMonth = 0;
    (payments || []).forEach((p) => {
      if (p.payment_date >= firstDayMonth) {
        totalRecoveredThisMonth += Number(p.amount);
      }
    });

    let totalRemainingToRecover = 0;
    let overdueClientsCount = 0;
    let dueSoonClientsCount = 0;

    (clients || []).forEach((cl) => {
      const clientCredits = (credits || []).filter((cr) => cr.client_id === cl.id);
      const clientPayments = (payments || []).filter((py) => py.client_id === cl.id);

      const totCr = clientCredits.reduce((sum, cr) => sum + Number(cr.amount), 0);
      const totPy = clientPayments.reduce((sum, py) => sum + Number(py.amount), 0);
      const balance = Math.max(0, totCr - totPy);

      totalRemainingToRecover += balance;

      if (balance > 0) {
        // Find earliest unpaid credit dueDate
        const sortedDueDates = clientCredits
          .map((c) => c.due_date)
          .sort();
        const earliestDueDate = sortedDueDates[0] || new Date().toISOString().slice(0, 10);
        const debtStatus = computeDebtStatus(earliestDueDate, balance);

        if (debtStatus.status === 'OVERDUE') overdueClientsCount++;
        if (debtStatus.status === 'DUE_SOON') dueSoonClientsCount++;
      }
    });

    return {
      totalCreditedThisMonth,
      totalRecoveredThisMonth,
      totalRemainingToRecover,
      overdueClientsCount,
      dueSoonClientsCount,
      activeClientsCount: (clients || []).length,
    };
  }

  /**
   * List clients from Supabase
   */
  static async listClients(userId: string, search?: string): Promise<ClientSummaryResponse[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('first_name', { ascending: true });

    const { data: clients, error: clErr } = await query;
    if (clErr) throw new Error(`Supabase query error: ${clErr.message}`);

    const { data: credits } = await supabase.from('credits').select('*').eq('user_id', userId);
    const { data: payments } = await supabase.from('payments').select('*').eq('user_id', userId);

    const summaries: ClientSummaryResponse[] = (clients || []).map((cl) => {
      const clientCredits = (credits || []).filter((cr) => cr.client_id === cl.id);
      const clientPayments = (payments || []).filter((py) => py.client_id === cl.id);

      const totalCredits = clientCredits.reduce((sum, cr) => sum + Number(cr.amount), 0);
      const totalPayments = clientPayments.reduce((sum, py) => sum + Number(py.amount), 0);
      const balance = Math.max(0, totalCredits - totalPayments);

      const sortedDueDates = clientCredits.map((c) => c.due_date).sort();
      const earliestDueDate = sortedDueDates[0];
      const debtStatus = earliestDueDate
        ? computeDebtStatus(earliestDueDate, balance)
        : balance <= 0
        ? { status: 'SETTLED' as DebtStatus }
        : { status: 'UP_TO_DATE' as DebtStatus };

      return {
        id: cl.id,
        userId: cl.user_id,
        firstName: cl.first_name,
        lastName: cl.last_name,
        phone: cl.phone,
        creditStatus: cl.credit_status as CreditAuthStatus,
        status: debtStatus.status,
        balance,
        totalCredits,
        totalPayments,
        daysOverdue: debtStatus.daysOverdue,
        daysUntilDue: debtStatus.daysUntilDue,
        earliestDueDate,
        isBlocked: cl.credit_status === 'BLOCKED',
        isActive: cl.is_active,
        createdAt: cl.created_at,
      };
    });

    if (!search || !search.trim()) {
      return summaries;
    }

    const term = search.trim().toLowerCase();
    const normPhoneSearch = term.replace(/\D/g, '');

    return summaries.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchName = fullName.includes(term);
      const matchPhone = normPhoneSearch ? c.phone.includes(normPhoneSearch) : c.phone.includes(term);
      return matchName || matchPhone;
    });
  }

  /**
   * Get client summary by ID from Supabase
   */
  static async getClientSummary(userId: string, clientId: string): Promise<ClientSummaryResponse | null> {
    const list = await this.listClients(userId);
    return list.find((c) => c.id === clientId) || null;
  }

  /**
   * Get credit history for client from Supabase
   */
  static async getClientCredits(userId: string, clientId: string): Promise<CreditDetailResponse[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const { data: credits, error } = await supabase
      .from('credits')
      .select('*, credit_items(*)')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase query error: ${error.message}`);

    return (credits || []).map((cr: any) => {
      const debt = computeDebtStatus(cr.due_date, Number(cr.amount));
      return {
        id: cr.id,
        userId: cr.user_id,
        clientId: cr.client_id,
        amount: Number(cr.amount),
        creditDate: cr.credit_date,
        dueDate: cr.due_date,
        entryMode: cr.entry_mode,
        description: cr.description,
        status: debt.status,
        daysOverdue: debt.daysOverdue,
        daysUntilDue: debt.daysUntilDue,
        items: (cr.credit_items || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          price: Number(it.price),
        })),
        createdAt: cr.created_at,
      };
    });
  }

  /**
   * Get payment history for client from Supabase
   */
  static async getClientPayments(userId: string, clientId: string): Promise<PaymentResponse[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase query error: ${error.message}`);

    return (payments || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      clientId: p.client_id,
      creditId: p.credit_id,
      amount: Number(p.amount),
      paymentDate: p.payment_date,
      notes: p.notes,
      createdAt: p.created_at,
    }));
  }

  /**
   * Create client in Supabase
   */
  static async createClient(userId: string, firstName: string, lastName: string, rawPhone: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const fName = (firstName || '').trim();
    const lName = (lastName || '').trim();
    if (!fName || !lName) {
      const err: any = new Error('Prénom et nom requis.');
      err.code = 'INVALID_CLIENT_DATA';
      throw err;
    }

    const cleanPhone = normalizePhone(rawPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      const err: any = new Error('Numéro de téléphone invalide.');
      err.code = 'INVALID_PHONE';
      throw err;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('user_id', userId)
      .eq('phone', cleanPhone)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      const err: any = new Error(
        `Un client avec le numéro ${cleanPhone} existe déjà (${existing.first_name} ${existing.last_name}).`
      );
      err.code = 'PHONE_ALREADY_EXISTS';
      err.details = { existingClientId: existing.id };
      throw err;
    }

    const newId = `client-${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from('clients')
      .insert({
        id: newId,
        user_id: userId,
        first_name: fName,
        last_name: lName,
        phone: cleanPhone,
        credit_status: 'AUTHORIZED',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    return {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      creditStatus: data.credit_status as CreditAuthStatus,
      isBlocked: false,
      isActive: true,
      createdAt: data.created_at,
    };
  }

  /**
   * Add a credit in Supabase
   */
  static async createCredit(
    userId: string,
    clientId: string,
    amount: number,
    dueDate: string,
    entryMode: 'EXPRESS' | 'DETAILED' = 'EXPRESS',
    description?: string,
    items?: CreditItemInput[],
    forceOverride: boolean = false
  ) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const intAmount = Math.round(Number(amount));
    if (isNaN(intAmount) || intAmount <= 0) {
      const err: any = new Error('Le montant du crédit doit être supérieur à zéro.');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // Validate client
    const { data: client, error: clErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (clErr || !client) {
      const err: any = new Error('Client introuvable ou inactif.');
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    if (client.credit_status === 'BLOCKED' && !forceOverride) {
      const err: any = new Error(
        `Crédit refusé : ${client.first_name} ${client.last_name} est actuellement bloqué pour les crédits.`
      );
      err.code = 'CLIENT_BLOCKED';
      throw err;
    }

    // Validate items sum for detailed mode
    if (entryMode === 'DETAILED') {
      if (!items || items.length === 0) {
        const err: any = new Error('Le mode détaillé requiert au moins un article.');
        err.code = 'INVALID_ITEMS';
        throw err;
      }
      const sumItems = items.reduce((s, it) => s + (it.price * (it.quantity || 1)), 0);
      if (sumItems !== intAmount) {
        const err: any = new Error(
          `La somme des articles (${sumItems} FCFA) ne correspond pas au montant déclaré (${intAmount} FCFA).`
        );
        err.code = 'ITEMS_SUM_MISMATCH';
        throw err;
      }
    }

    const creditId = `credit-${crypto.randomUUID()}`;
    const today = new Date().toISOString().slice(0, 10);

    const { error: insErr } = await supabase.from('credits').insert({
      id: creditId,
      user_id: userId,
      client_id: clientId,
      amount: intAmount,
      credit_date: today,
      due_date: dueDate,
      entry_mode: entryMode,
      description: description || null,
    });

    if (insErr) throw new Error(`Supabase credit insert error: ${insErr.message}`);

    if (entryMode === 'DETAILED' && items) {
      const itemsToInsert = items.map((it) => ({
        id: `item-${crypto.randomUUID()}`,
        credit_id: creditId,
        name: it.name,
        quantity: it.quantity || 1,
        price: it.price,
      }));
      const { error: itemErr } = await supabase.from('credit_items').insert(itemsToInsert);
      if (itemErr) throw new Error(`Supabase item insert error: ${itemErr.message}`);
    }

    return {
      id: creditId,
      userId,
      clientId,
      amount: intAmount,
      creditDate: today,
      dueDate,
      entryMode,
      description,
    };
  }

  /**
   * Add a payment in Supabase (with strict anti-negative balance check)
   */
  static async createPayment(
    userId: string,
    clientId: string,
    amount: number,
    notes?: string,
    creditId?: string | null
  ) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const intAmount = Math.round(Number(amount));
    if (isNaN(intAmount) || intAmount <= 0) {
      const err: any = new Error('Le montant du paiement doit être supérieur à zéro.');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // Check client & current balance
    const { data: client, error: clErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (clErr || !client) {
      const err: any = new Error('Client introuvable ou inactif.');
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    const { data: credits } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .eq('client_id', clientId);
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', userId)
      .eq('client_id', clientId);

    const totCr = (credits || []).reduce((s, c) => s + Number(c.amount), 0);
    const totPy = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const currentBalance = Math.max(0, totCr - totPy);

    if (intAmount > currentBalance) {
      const err: any = new Error(
        `Le montant payé (${intAmount} FCFA) dépasse le solde restant dû (${currentBalance} FCFA). Le solde ne peut pas être négatif.`
      );
      err.code = 'PAYMENT_EXCEEDS_BALANCE';
      err.details = { currentBalance, attemptedAmount: intAmount };
      throw err;
    }

    const payId = `pay-${crypto.randomUUID()}`;
    const today = new Date().toISOString().slice(0, 10);

    const { error: payErr } = await supabase.from('payments').insert({
      id: payId,
      user_id: userId,
      client_id: clientId,
      credit_id: creditId || null,
      amount: intAmount,
      payment_date: today,
      notes: notes || null,
    });

    if (payErr) throw new Error(`Supabase payment insert error: ${payErr.message}`);

    const newBalance = currentBalance - intAmount;

    return {
      payment: {
        id: payId,
        userId,
        clientId,
        amount: intAmount,
        paymentDate: today,
        notes,
      },
      newBalance,
      isSettled: newBalance === 0,
    };
  }

  /**
   * Update client credit status (AUTHORIZED / BLOCKED) in Supabase
   */
  static async setClientCreditStatus(userId: string, clientId: string, status: CreditAuthStatus) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const { data, error } = await supabase
      .from('clients')
      .update({ credit_status: status, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Supabase update error: ${error.message}`);
    return data;
  }

  /**
   * Update client details in Supabase
   */
  static async updateClient(userId: string, clientId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (data.firstName) updatePayload.first_name = data.firstName.trim();
    if (data.lastName) updatePayload.last_name = data.lastName.trim();
    if (data.phone) {
      const normalized = normalizePhone(data.phone);
      if (normalized) updatePayload.phone = normalized;
    }

    const { data: updated, error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', clientId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Supabase client update error: ${error.message}`);
    return this.getClientSummary(userId, clientId);
  }

  /**
   * Delete / Deactivate client in Supabase
   */
  static async deleteClient(userId: string, clientId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const summary = await this.getClientSummary(userId, clientId);
    if (!summary) throw new Error('Client introuvable.');
    if (summary.balance > 0) {
      const err: any = new Error(`Impossible de désactiver un client ayant encore une dette active de ${summary.balance} FCFA.`);
      err.code = 'CANNOT_DELETE_ACTIVE_DEBT';
      throw err;
    }

    const { error } = await supabase
      .from('clients')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('user_id', userId);

    if (error) throw new Error(`Supabase client delete error: ${error.message}`);
    return { success: true };
  }

  /**
   * Update credit in Supabase
   */
  static async updateCredit(userId: string, creditId: string, data: { amount?: number; dueDate?: string; description?: string }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (data.amount !== undefined) updatePayload.amount = Math.round(Number(data.amount));
    if (data.dueDate) updatePayload.due_date = data.dueDate;
    if (data.description !== undefined) updatePayload.description = data.description;

    const { data: updated, error } = await supabase
      .from('credits')
      .update(updatePayload)
      .eq('id', creditId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Supabase credit update error: ${error.message}`);
    return updated;
  }

  /**
   * Delete credit in Supabase
   */
  static async deleteCredit(userId: string, creditId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const { error } = await supabase
      .from('credits')
      .delete()
      .eq('id', creditId)
      .eq('user_id', userId);

    if (error) throw new Error(`Supabase credit delete error: ${error.message}`);
    return { success: true };
  }

  /**
   * Update payment in Supabase
   */
  static async updatePayment(userId: string, paymentId: string, data: { amount?: number; notes?: string; paymentDate?: string }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const updatePayload: any = {};
    if (data.amount !== undefined) updatePayload.amount = Math.round(Number(data.amount));
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.paymentDate) updatePayload.payment_date = data.paymentDate;

    const { data: updated, error } = await supabase
      .from('payments')
      .update(updatePayload)
      .eq('id', paymentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Supabase payment update error: ${error.message}`);
    return updated;
  }

  /**
   * Delete payment in Supabase
   */
  static async deletePayment(userId: string, paymentId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client unavailable');

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', userId);

    if (error) throw new Error(`Supabase payment delete error: ${error.message}`);
    return { success: true };
  }
}
