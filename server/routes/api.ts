import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { CreditService } from '../services/creditService';
import { SupabaseService } from '../services/supabaseService';
import { AuthenticatedRequest, authenticateUser, generateAuthToken, DEFAULT_USER_ID, verifyPin, hashPin } from '../auth';
import { db, normalizePhone, seedCheikhInitialData } from '../db';
import { isSupabaseConfigured, getSupabaseConfigInfo, getSupabaseClient } from '../supabase';
import fs from 'node:fs';
import path from 'node:path';

export const apiRouter = Router();

/**
 * GET /api/health
 */
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * POST /api/auth/login
 * Authenticates merchant using Phone + 4-6 digit PIN
 */
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({
        error: 'Numéro de téléphone et code PIN requis.',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({
        error: 'Format de téléphone invalide.',
        code: 'INVALID_PHONE',
      });
    }

    // Lookup user in SQLite
    const user = db.prepare(`
      SELECT id, phone, full_name, shop_name, pin
      FROM users
      WHERE phone = ?
    `).get(cleanPhone) as any;

    if (!user) {
      return res.status(401).json({
        error: 'Aucun compte trouvé avec ce numéro de téléphone.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Compare PIN with timing attack protection & scrypt hash support
    const trimmedPin = String(pin).trim();
    if (!verifyPin(trimmedPin, user.pin)) {
      return res.status(401).json({
        error: 'Code PIN incorrect. Veuillez réessayer.',
        code: 'INVALID_PIN',
      });
    }

    const token = generateAuthToken({
      id: user.id,
      phone: user.phone,
      fullName: user.full_name,
      shopName: user.shop_name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.full_name,
        shopName: user.shop_name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la connexion.' });
  }
});

/**
 * POST /api/auth/register
 * Creates a new merchant profile with Phone, Name, Shop Name and PIN
 */
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { fullName, phone, shopName, pin } = req.body;

    const trimmedName = (fullName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({
        error: 'Veuillez saisir votre nom complet (minimum 2 caractères).',
        code: 'INVALID_NAME',
      });
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({
        error: 'Numéro de téléphone invalide (minimum 8 chiffres).',
        code: 'INVALID_PHONE',
      });
    }

    const cleanPin = String(pin || '').trim();
    if (!cleanPin || cleanPin.length < 4 || !/^\d+$/.test(cleanPin)) {
      return res.status(400).json({
        error: 'Le code PIN doit comporter au moins 4 chiffres.',
        code: 'INVALID_PIN',
      });
    }

    // Check uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
    if (existing) {
      return res.status(409).json({
        error: 'Un compte avec ce numéro de téléphone existe déjà. Veuillez vous connecter.',
        code: 'PHONE_EXISTS',
      });
    }

    const newUserId = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const finalShopName = (shopName || '').trim() || 'Ma Boutique';
    const hashedPin = hashPin(cleanPin);

    // Insert into SQLite with hashed PIN
    db.prepare(`
      INSERT INTO users (id, phone, full_name, shop_name, pin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newUserId, cleanPhone, trimmedName, finalShopName, hashedPin, now, now);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from('users').upsert({
            id: newUserId,
            phone: cleanPhone,
            name: trimmedName,
            store_name: finalShopName,
            created_at: now,
            updated_at: now,
          });
        }
      } catch (sbErr: any) {
        console.warn('[Supabase] Warning syncing new user to Supabase:', sbErr?.message);
      }
    }

    const token = generateAuthToken({
      id: newUserId,
      phone: cleanPhone,
      fullName: trimmedName,
      shopName: finalShopName,
    });

    res.status(201).json({
      token,
      user: {
        id: newUserId,
        phone: cleanPhone,
        fullName: trimmedName,
        shopName: finalShopName,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’inscription.' });
  }
});

/**
 * POST /api/auth/quick-demo
 * Instant 1-click access for Cheikh in demo mode
 */
apiRouter.post('/api/auth/quick-demo', async (_req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, phone, full_name, shop_name, pin
      FROM users
      WHERE id = ?
    `).get(DEFAULT_USER_ID) as any;

    if (!user) {
      return res.status(404).json({ error: 'Compte de démonstration introuvable.' });
    }

    const token = generateAuthToken({
      id: user.id,
      phone: user.phone,
      fullName: user.full_name,
      shopName: user.shop_name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.full_name,
        shopName: user.shop_name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post('/auth/quick-demo', async (_req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, phone, full_name, shop_name, pin
      FROM users
      WHERE id = ?
    `).get(DEFAULT_USER_ID) as any;

    if (!user) {
      return res.status(404).json({ error: 'Compte de démonstration introuvable.' });
    }

    const token = generateAuthToken({
      id: user.id,
      phone: user.phone,
      fullName: user.full_name,
      shopName: user.shop_name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.full_name,
        shopName: user.shop_name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Apply auth middleware to all subsequent API endpoints
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
 * POST /api/auth/change-pin
 * Changes the current authenticated user PIN
 */
apiRouter.post('/auth/change-pin', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.status(400).json({ error: 'Ancien et nouveau code PIN requis.' });
    }

    const cleanNewPin = String(newPin).trim();
    if (cleanNewPin.length < 4 || !/^\d+$/.test(cleanNewPin)) {
      return res.status(400).json({ error: 'Le nouveau code PIN doit comporter au moins 4 chiffres.' });
    }

    const user = db.prepare('SELECT pin FROM users WHERE id = ?').get(req.userId!) as any;
    if (!user || !verifyPin(String(oldPin).trim(), user.pin)) {
      return res.status(401).json({ error: 'Ancien code PIN incorrect.' });
    }

    const hashedNewPin = hashPin(cleanNewPin);
    db.prepare('UPDATE users SET pin = ?, updated_at = ? WHERE id = ?').run(
      hashedNewPin,
      new Date().toISOString(),
      req.userId!
    );

    res.json({ success: true, message: 'Code PIN modifié avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/auth/profile
 * Updates the boutique/merchant profile (fullName, shopName, phone)
 */
apiRouter.patch('/auth/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, shopName, phone } = req.body;
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId!) as any;
    if (!currentUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    let finalPhone = currentUser.phone;
    if (phone) {
      const cleanPhone = String(phone).replace(/\s+/g, '');
      if (cleanPhone.length < 8) {
        return res.status(400).json({ error: 'Numéro de téléphone invalide (au moins 8 chiffres).' });
      }
      // Check phone uniqueness
      const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(cleanPhone, req.userId!);
      if (existing) {
        return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé par un autre compte.' });
      }
      finalPhone = cleanPhone;
    }

    const finalFullName = fullName !== undefined ? String(fullName).trim() : currentUser.full_name;
    const finalShopName = shopName !== undefined ? String(shopName).trim() : currentUser.shop_name;

    if (!finalFullName) {
      return res.status(400).json({ error: 'Le nom complet est obligatoire.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users 
      SET full_name = ?, shop_name = ?, phone = ?, updated_at = ?
      WHERE id = ?
    `).run(finalFullName, finalShopName || 'Ma Boutique', finalPhone, now, req.userId!);

    // Sync to Supabase if active
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from('users').update({
            name: finalFullName,
            store_name: finalShopName || 'Ma Boutique',
            phone: finalPhone,
            updated_at: now,
          }).eq('id', req.userId!);
        }
      } catch (sbErr: any) {
        console.warn('[Supabase] Warning updating user in Supabase:', sbErr?.message);
      }
    }

    const updatedUser = {
      id: req.userId!,
      phone: finalPhone,
      fullName: finalFullName,
      shopName: finalShopName || 'Ma Boutique',
    };

    const token = generateAuthToken(updatedUser);

    res.json({
      token,
      user: updatedUser,
      message: 'Profil mis à jour avec succès.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
 * Real-time aggregated KPIs for Cheikh (SQLite single source of truth)
 */
apiRouter.get('/cockpit/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = CreditService.getCockpitStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

/**
 * GET /api/clients
 * List all active clients with calculated balances and independent statuses (SQLite source of truth)
 */
apiRouter.get('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.q as string | undefined;
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
 * PATCH /api/clients/:id
 * Update client information (firstName, lastName, phone)
 */
apiRouter.patch('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const client = CreditService.updateClient(req.userId!, req.params.id, { firstName, lastName, phone });
    res.json(client);
  } catch (error: any) {
    const status = error.code === 'CLIENT_NOT_FOUND' ? 404 : error.code === 'PHONE_ALREADY_EXISTS' ? 409 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
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
 * PATCH /api/credits/:id
 * Update a credit entry (amount, dueDate, description)
 */
apiRouter.patch('/credits/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, dueDate, description } = req.body;
    const result = CreditService.updateCredit(req.userId!, req.params.id, { amount, dueDate, description });
    res.json(result);
  } catch (error: any) {
    const status = error.code === 'CREDIT_NOT_FOUND' ? 404 : error.code === 'CREDIT_LOWER_THAN_PAYMENTS' ? 422 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
});

/**
 * DELETE /api/credits/:id
 * Delete a credit entry
 */
apiRouter.delete('/credits/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = CreditService.deleteCredit(req.userId!, req.params.id);
    res.json(result);
  } catch (error: any) {
    const status = error.code === 'CREDIT_NOT_FOUND' ? 404 : error.code === 'CANNOT_DELETE_CREDIT_PAYMENT_EXCEEDS' ? 422 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
});

/**
 * POST /api/payments
 * Record a payment with strict idempotency and concurrency protection (SQLite WAL)
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

    const rawKey =
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey ||
      req.body.idempotency_key;

    // Use caller-provided idempotency key or generate controlled key if omitted
    const idempotencyKey = rawKey ? String(rawKey).trim() : `auto-${crypto.randomUUID()}`;

    const result = CreditService.createPayment(
      req.userId!,
      clientId,
      Number(amount),
      notes,
      creditId || null,
      idempotencyKey
    );

    if (result.isIdempotentReplay) {
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(200).json({
        ...result,
        message: 'Paiement déjà enregistré précédemment (rejeu idempotent).',
      });
    }

    res.status(201).json(result);
  } catch (error: any) {
    const statusCode =
      error.code === 'IDEMPOTENCY_CONFLICT'
        ? 409
        : error.code === 'PAYMENT_EXCEEDS_BALANCE'
        ? 422
        : error.code === 'CLIENT_NOT_FOUND'
        ? 404
        : 400;

    res.status(statusCode).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
      details: error.details,
    });
  }
});

/**
 * PATCH /api/payments/:id
 * Update a payment entry (amount, notes, paymentDate)
 */
apiRouter.patch('/payments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, notes, paymentDate } = req.body;
    const result = CreditService.updatePayment(req.userId!, req.params.id, { amount, notes, paymentDate });
    res.json(result);
  } catch (error: any) {
    const status = error.code === 'PAYMENT_NOT_FOUND' ? 404 : error.code === 'PAYMENT_EXCEEDS_BALANCE' ? 422 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
});

/**
 * DELETE /api/payments/:id
 * Delete a payment entry
 */
apiRouter.delete('/payments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = CreditService.deletePayment(req.userId!, req.params.id);
    res.json(result);
  } catch (error: any) {
    const status = error.code === 'PAYMENT_NOT_FOUND' ? 404 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
});

/**
 * POST /api/test/reset
 * Resets database to initial test state (Used for test repeatability)
 */
apiRouter.post('/test/reset', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userId === DEFAULT_USER_ID) {
      seedCheikhInitialData(true);
      res.json({ message: 'Données de Cheikh réinitialisées avec succès aux 5 profils étalons.' });
    } else {
      // Purge data only for this merchant
      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('DELETE FROM payments WHERE user_id = ?').run(req.userId!);
        db.prepare('DELETE FROM credit_items WHERE credit_id IN (SELECT id FROM credits WHERE user_id = ?)').run(req.userId!);
        db.prepare('DELETE FROM credits WHERE user_id = ?').run(req.userId!);
        db.prepare('DELETE FROM clients WHERE user_id = ?').run(req.userId!);
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
      res.json({ message: 'Votre carnet a été réinitialisé avec succès.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
