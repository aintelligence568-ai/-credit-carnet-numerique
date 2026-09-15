import { Router, Response } from 'express';
import { CreditService } from '../services/creditService';
import { SupabaseService } from '../services/supabaseService';
import { AuthenticatedRequest, authenticateUser } from '../auth';
import { seedCheikhInitialData } from '../db';
import { isSupabaseConfigured, getSupabaseConfigInfo } from '../supabase';
import fs from 'node:fs';
import path from 'node:path';

export const apiRouter = Router();

/**
 * GET /api/health
 */
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Apply auth middleware to all API endpoints
apiRouter.use(authenticateUser);

/**
 * GET /api/auth/me
 */
apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
    supabase: getSupabaseConfigInfo(),
  });
});

/**
 * GET /api/supabase/status
 * Returns connection details and active storage engine
 */
apiRouter.get('/supabase/status', async (req: AuthenticatedRequest, res: Response) => {
  const info = getSupabaseConfigInfo();
  res.json(info);
});

/**
 * POST /api/supabase/test
 * Validates connection with the configured Supabase instance
 */
apiRouter.post('/supabase/test', async (req: AuthenticatedRequest, res: Response) => {
  const result = await SupabaseService.testConnection();
  res.json(result);
});

/**
 * GET /api/supabase/schema
 * Returns the raw SQL migration script for Supabase SQL Editor
 */
apiRouter.get('/supabase/schema', (req: AuthenticatedRequest, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.type('text/plain').send(sql);
    } else {
      res.status(404).send('Fichier schema.sql introuvable.');
    }
  } catch (err: any) {
    res.status(500).send(`Erreur lecture schéma: ${err.message}`);
  }
});

function isTableMissingError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('relation') ||
    msg.includes('pgrst205')
  );
}

/**
 * GET /api/cockpit/stats
 * Real-time aggregated KPIs for Cheikh
 */
apiRouter.get('/cockpit/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const stats = await SupabaseService.getCockpitStats(req.userId!);
        return res.json(stats);
      } catch (err: any) {
        if (isTableMissingError(err)) {
          console.warn('[Supabase] Schéma SQL non exécuté dans Supabase, utilisation des données locales.');
          res.setHeader('X-Storage-Fallback', 'sqlite-schema-pending');
          const stats = CreditService.getCockpitStats(req.userId!);
          return res.json(stats);
        }
        throw err;
      }
    }
    const stats = CreditService.getCockpitStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * GET /api/clients
 * List all active clients with calculated balances and independent statuses
 */
apiRouter.get('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.q as string | undefined;
    if (isSupabaseConfigured()) {
      try {
        const clients = await SupabaseService.listClients(req.userId!, search);
        return res.json(clients);
      } catch (err: any) {
        if (isTableMissingError(err)) {
          res.setHeader('X-Storage-Fallback', 'sqlite-schema-pending');
          const clients = CreditService.listClients(req.userId!, search);
          return res.json(clients);
        }
        throw err;
      }
    }
    const clients = CreditService.listClients(req.userId!, search);
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * GET /api/clients/:id
 * Get single client summary
 */
apiRouter.get('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const client = await SupabaseService.getClientSummary(req.userId!, req.params.id);
        if (!client) {
          return res.status(404).json({ error: 'Client introuvable.', code: 'NOT_FOUND' });
        }
        return res.json(client);
      } catch (err: any) {
        if (isTableMissingError(err)) {
          res.setHeader('X-Storage-Fallback', 'sqlite-schema-pending');
          const client = CreditService.getClientSummary(req.userId!, req.params.id);
          if (!client) {
            return res.status(404).json({ error: 'Client introuvable.', code: 'NOT_FOUND' });
          }
          return res.json(client);
        }
        throw err;
      }
    }
    const client = CreditService.getClientSummary(req.userId!, req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client introuvable.', code: 'NOT_FOUND' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * GET /api/clients/:id/credits
 * Get credit history for client
 */
apiRouter.get('/clients/:id/credits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const credits = await SupabaseService.getClientCredits(req.userId!, req.params.id);
        return res.json(credits);
      } catch (err: any) {
        if (isTableMissingError(err)) {
          const credits = CreditService.getClientCredits(req.userId!, req.params.id);
          return res.json(credits);
        }
        throw err;
      }
    }
    const credits = CreditService.getClientCredits(req.userId!, req.params.id);
    res.json(credits);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * GET /api/clients/:id/payments
 * Get payment history for client
 */
apiRouter.get('/clients/:id/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const payments = await SupabaseService.getClientPayments(req.userId!, req.params.id);
        return res.json(payments);
      } catch (err: any) {
        if (isTableMissingError(err)) {
          const payments = CreditService.getClientPayments(req.userId!, req.params.id);
          return res.json(payments);
        }
        throw err;
      }
    }
    const payments = CreditService.getClientPayments(req.userId!, req.params.id);
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * POST /api/clients
 * Create a new client with normalized phone and duplicate check
 */
apiRouter.post('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    if (isSupabaseConfigured()) {
      const client = await SupabaseService.createClient(req.userId!, firstName, lastName, phone);
      return res.status(201).json(client);
    }
    const client = CreditService.createClient(req.userId!, firstName, lastName, phone);
    res.status(201).json(client);
  } catch (error: any) {
    const status = error.code === 'PHONE_ALREADY_EXISTS' ? 409 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
      details: error.details,
    });
  }
});

/**
 * PATCH /api/clients/:id/credit-status
 * Toggle/update client authorization status (AUTHORIZED <-> BLOCKED)
 */
apiRouter.patch('/clients/:id/credit-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creditStatus } = req.body;
    if (!['AUTHORIZED', 'BLOCKED'].includes(creditStatus)) {
      return res.status(400).json({
        error: 'Statut de crédit invalide (doit être AUTHORIZED ou BLOCKED).',
        code: 'INVALID_STATUS',
      });
    }

    if (isSupabaseConfigured()) {
      const updated = await SupabaseService.setClientCreditStatus(req.userId!, req.params.id, creditStatus);
      return res.json(updated);
    }

    const updated = CreditService.updateClientCreditStatus(req.userId!, req.params.id, creditStatus);
    res.json(updated);
  } catch (error: any) {
    const status = error.code === 'CLIENT_NOT_FOUND' ? 404 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
});

/**
 * DELETE /api/clients/:id
 * Soft delete client (strictly forbidden if client has active debt)
 */
apiRouter.delete('/clients/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = CreditService.deleteClient(req.userId!, req.params.id);
    res.json(result);
  } catch (error: any) {
    const status = error.code === 'CANNOT_DELETE_ACTIVE_DEBT' ? 422 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
      details: error.details,
    });
  }
});

/**
 * POST /api/credits
 * Record a new credit (EXPRESS or DETAILED)
 */
apiRouter.post('/credits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, amount, dueDate, entryMode, description, items, forceOverride } = req.body;

    if (!clientId || !amount || !dueDate) {
      return res.status(400).json({
        error: 'Champs requis manquants (clientId, amount, dueDate).',
        code: 'MISSING_FIELDS',
      });
    }

    if (isSupabaseConfigured()) {
      const result = await SupabaseService.createCredit(
        req.userId!,
        clientId,
        Number(amount),
        dueDate,
        entryMode === 'DETAILED' ? 'DETAILED' : 'EXPRESS',
        description,
        items,
        Boolean(forceOverride)
      );
      return res.status(201).json(result);
    }

    const result = CreditService.createCredit(
      req.userId!,
      clientId,
      Number(amount),
      dueDate,
      entryMode === 'DETAILED' ? 'DETAILED' : 'EXPRESS',
      description,
      items,
      Boolean(forceOverride)
    );

    res.status(201).json(result);
  } catch (error: any) {
    const statusCode =
      error.code === 'CLIENT_BLOCKED'
        ? 403
        : error.code === 'ITEMS_SUM_MISMATCH'
        ? 422
        : 400;

    res.status(statusCode).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
      details: error.details,
    });
  }
});

/**
 * POST /api/payments
 * Record a payment (Strict validation: payment <= balance, PAYMENT_EXCEEDS_BALANCE rejection)
 */
apiRouter.post('/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, amount, notes, creditId } = req.body;

    if (!clientId || !amount) {
      return res.status(400).json({
        error: 'Champs requis manquants (clientId, amount).',
        code: 'MISSING_FIELDS',
      });
    }

    if (isSupabaseConfigured()) {
      const result = await SupabaseService.createPayment(
        req.userId!,
        clientId,
        Number(amount),
        notes,
        creditId || null
      );
      return res.status(201).json(result);
    }

    const result = CreditService.createPayment(
      req.userId!,
      clientId,
      Number(amount),
      notes,
      creditId || null
    );

    res.status(201).json(result);
  } catch (error: any) {
    const statusCode = error.code === 'PAYMENT_EXCEEDS_BALANCE' ? 422 : 400;
    res.status(statusCode).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
      details: error.details,
    });
  }
});

/**
 * POST /api/test/reset
 * Resets database to initial test state (Used for test repeatability)
 */
apiRouter.post('/test/reset', (req: AuthenticatedRequest, res: Response) => {
  try {
    seedCheikhInitialData(true);
    res.json({ message: 'Base réinitialisée avec succès aux 5 profils étalons.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
