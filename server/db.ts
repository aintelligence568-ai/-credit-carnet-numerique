import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'credit_cheikh.sqlite');
export const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys & WAL mode for high performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

/**
 * Initialize all required relational database tables according to Étape 11 & 12
 */
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      shop_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      credit_status TEXT NOT NULL CHECK (credit_status IN ('AUTHORIZED', 'BLOCKED')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, phone)
    );

    CREATE TABLE IF NOT EXISTS credits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      credit_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      entry_mode TEXT NOT NULL CHECK (entry_mode IN ('EXPRESS', 'DETAILED')),
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS credit_items (
      id TEXT PRIMARY KEY,
      credit_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity REAL DEFAULT 1.0,
      unit_price INTEGER,
      total_price INTEGER NOT NULL CHECK (total_price > 0),
      created_at TEXT NOT NULL,
      FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      credit_id TEXT,
      amount INTEGER NOT NULL CHECK (amount > 0),
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_clients_user_phone ON clients(user_id, phone);
    CREATE INDEX IF NOT EXISTS idx_clients_user_active ON clients(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_credits_client ON credits(client_id, credit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_credits_user_due ON credits(user_id, due_date ASC);
    CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id, payment_date DESC);
  `);
}

/**
 * Normalizes phone numbers: removes spaces, dashes, dots, and +221 country prefix
 * Example: "+221 77 123 45 67" or "77 123 45 67" -> "771234567"
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[\s\-\.\(\)\+]/g, '');
  // If starts with Senegal country code 221 and has 12 digits, strip 221
  if (cleaned.startsWith('221') && cleaned.length === 12) {
    cleaned = cleaned.substring(3);
  }
  return cleaned;
}

/**
 * Returns YYYY-MM-DD string with day offset relative to now
 */
export function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * Seed initial test data for Cheikh's account
 */
export function seedCheikhInitialData(forceReset: boolean = false, cleanAll: boolean = false) {
  const DEFAULT_USER_ID = 'user-cheikh-1';
  const now = new Date().toISOString();

  // Check if default user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_USER_ID);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, phone, full_name, shop_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      DEFAULT_USER_ID,
      '770000000',
      'Cheikh',
      'Alimentation Générale de Cheikh',
      now,
      now
    );
  }

  // If cleanAll is requested, purge all test data across users
  if (cleanAll) {
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM payments').run();
      db.prepare('DELETE FROM credit_items').run();
      db.prepare('DELETE FROM credits').run();
      db.prepare('DELETE FROM clients').run();
      db.prepare('DELETE FROM users WHERE id != ?').run(DEFAULT_USER_ID);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } else if (forceReset) {
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM payments WHERE user_id = ?').run(DEFAULT_USER_ID);
      db.prepare('DELETE FROM credit_items WHERE credit_id IN (SELECT id FROM credits WHERE user_id = ?)').run(DEFAULT_USER_ID);
      db.prepare('DELETE FROM credits WHERE user_id = ?').run(DEFAULT_USER_ID);
      db.prepare('DELETE FROM clients WHERE user_id = ?').run(DEFAULT_USER_ID);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // If forceReset is requested or if clients count for Cheikh is 0, seed the 5 standard test clients
  const clientCount = (db.prepare('SELECT COUNT(*) as count FROM clients WHERE user_id = ?').get(DEFAULT_USER_ID) as any).count;
  if (clientCount > 0 && !forceReset && !cleanAll) {
    return;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Mamadou Diallo: 77 123 45 67, 25 000 FCFA, 3 jours de retard
    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES ('client-1', ?, 'Mamadou', 'Diallo', '771234567', 'AUTHORIZED', 1, ?, ?)
    `).run(DEFAULT_USER_ID, now, now);

    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-1', ?, 'client-1', 25000, ?, ?, 'EXPRESS', 'Crédit comptoir', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-10), getRelativeDate(-3), now, now);

    // 2. Fatou Sow: 78 987 65 43, 15 000 FCFA, échéance demain (+1 jour)
    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES ('client-2', ?, 'Fatou', 'Sow', '789876543', 'AUTHORIZED', 1, ?, ?)
    `).run(DEFAULT_USER_ID, now, now);

    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-2', ?, 'client-2', 15000, ?, ?, 'EXPRESS', 'Achats divers', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-5), getRelativeDate(1), now, now);

    // 3. Moussa Ba: 76 555 12 34, 45 000 FCFA crédits, 10 000 paiement, 35 000 restant, BLOQUÉ, retard 20 jours
    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES ('client-3', ?, 'Moussa', 'Ba', '765551234', 'BLOCKED', 1, ?, ?)
    `).run(DEFAULT_USER_ID, now, now);

    // Crédit Riz 20 000
    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-3-1', ?, 'client-3', 20000, ?, ?, 'DETAILED', 'Sac de riz 50kg', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-30), getRelativeDate(-20), now, now);
    db.prepare(`
      INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
      VALUES ('item-3-1', 'credit-3-1', 'Sac de riz 50kg', 1, 20000, 20000, ?)
    `).run(now);

    // Crédit Huile 15 000
    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-3-2', ?, 'client-3', 15000, ?, ?, 'DETAILED', 'Bidon huile 5L', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-28), getRelativeDate(-20), now, now);
    db.prepare(`
      INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
      VALUES ('item-3-2', 'credit-3-2', 'Bidon huile 5L', 1, 15000, 15000, ?)
    `).run(now);

    // Crédit Sucre 10 000
    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-3-3', ?, 'client-3', 10000, ?, ?, 'DETAILED', 'Carton de sucre', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-25), getRelativeDate(-20), now, now);
    db.prepare(`
      INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
      VALUES ('item-3-3', 'credit-3-3', 'Carton de sucre', 1, 10000, 10000, ?)
    `).run(now);

    // Paiement Moussa Ba: 10 000 FCFA
    db.prepare(`
      INSERT INTO payments (id, user_id, client_id, credit_id, amount, payment_date, notes, created_at)
      VALUES ('payment-3-1', ?, 'client-3', NULL, 10000, ?, 'Acompte espèces comptoir', ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-10), now);

    // 4. Aïda Ndiaye: 70 111 22 33, Riz 5000 + Savon 3500 = 8500 FCFA, dans 15 jours
    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES ('client-4', ?, 'Aïda', 'Ndiaye', '701112233', 'AUTHORIZED', 1, ?, ?)
    `).run(DEFAULT_USER_ID, now, now);

    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-4', ?, 'client-4', 8500, ?, ?, 'DETAILED', 'Riz & Savon', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-2), getRelativeDate(15), now, now);

    db.prepare(`
      INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
      VALUES ('item-4-1', 'credit-4', 'Riz parfumé 5kg', 1, 5000, 5000, ?)
    `).run(now);
    db.prepare(`
      INSERT INTO credit_items (id, credit_id, item_name, quantity, unit_price, total_price, created_at)
      VALUES ('item-4-2', 'credit-4', 'Lot savon de ménage', 1, 3500, 3500, ?)
    `).run(now);

    // 5. Ousmane Fall: 77 444 88 99, 20 000 crédit, 20 000 payé, solde 0 (SETTLED)
    db.prepare(`
      INSERT INTO clients (id, user_id, first_name, last_name, phone, credit_status, is_active, created_at, updated_at)
      VALUES ('client-5', ?, 'Ousmane', 'Fall', '774448899', 'AUTHORIZED', 1, ?, ?)
    `).run(DEFAULT_USER_ID, now, now);

    db.prepare(`
      INSERT INTO credits (id, user_id, client_id, amount, credit_date, due_date, entry_mode, description, created_at, updated_at)
      VALUES ('credit-5', ?, 'client-5', 20000, ?, ?, 'EXPRESS', 'Fournitures de maison', ?, ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-20), getRelativeDate(-15), now, now);

    db.prepare(`
      INSERT INTO payments (id, user_id, client_id, credit_id, amount, payment_date, notes, created_at)
      VALUES ('payment-5', ?, 'client-5', 'credit-5', 20000, ?, 'Règlement total au comptoir', ?)
    `).run(DEFAULT_USER_ID, getRelativeDate(-14), now);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
