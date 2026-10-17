import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

function getSupabaseAuthClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@carnet.local`;
}

export async function ensureSupabaseAuthUser(phone: string, pin: string, profile: { id: string; fullName: string; shopName?: string }) {
  const admin = getSupabaseClient();
  if (!admin) throw new Error('Supabase est obligatoire pour l’authentification.');
  const email = authEmail(phone);
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((candidate) => candidate.email === email);
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: { profile_id: profile.id, full_name: profile.fullName, shop_name: profile.shopName },
    });
    if (error) throw error;
  } else {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password: pin });
    if (error) throw error;
  }
}

export async function signInWithSupabase(phone: string, pin: string) {
  const client = getSupabaseAuthClient();
  if (!client) throw new Error('Supabase Auth n’est pas configuré.');
  const { data, error } = await client.auth.signInWithPassword({ email: authEmail(phone), password: pin });
  if (error || !data.session || !data.user) return null;
  return { accessToken: data.session.access_token, authUserId: data.user.id };
}

export async function createSupabaseAuthUser(phone: string, pin: string, profile: { id: string; fullName: string; shopName?: string }) {
  const client = getSupabaseAuthClient();
  if (!client) throw new Error('Supabase Auth n’est pas configuré.');
  const { data, error } = await client.auth.signUp({
    email: authEmail(phone),
    password: pin,
    options: { data: { profile_id: profile.id, full_name: profile.fullName, shop_name: profile.shopName } },
  });
  if (error || !data.user) throw error || new Error('Création du compte Supabase Auth impossible.');
  return data.session?.access_token || null;
}

export async function getSupabaseUserFromToken(token: string) {
  const client = getSupabaseAuthClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export function requireSupabaseAuth() {
  if (!isSupabaseConfigured()) throw new Error('Supabase est obligatoire en production.');
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    phone: string;
    fullName: string;
    shopName?: string;
  };
}

export const DEFAULT_USER_ID = 'user-cheikh-1';

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[CRITICAL_SECURITY] AUTH_SECRET environment variable is mandatory in production mode.');
    }
    return 'koring-counda-carnet-credit-secret-salt-2026';
  }
  return secret;
}

/**
 * Hash a merchant PIN using scrypt with a random 16-byte salt
 */
export function hashPin(pin: string, customSalt?: string): string {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/**
 * Verifies a PIN against stored hash or legacy plaintext with timing attack protection
 */
export function verifyPin(pin: string, storedPinOrHash: string): boolean {
  if (!pin || !storedPinOrHash) return false;

  // If already scrypt hashed
  if (storedPinOrHash.startsWith('scrypt$')) {
    const parts = storedPinOrHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const expectedHash = parts[2];
    const computedHash = crypto.scryptSync(pin, salt, 64).toString('hex');

    const bufExpected = Buffer.from(expectedHash, 'hex');
    const bufComputed = Buffer.from(computedHash, 'hex');
    if (bufExpected.length !== bufComputed.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufComputed);
  }

  // Fallback for legacy plaintext in existing databases during migration
  const bufInput = Buffer.from(pin);
  const bufStored = Buffer.from(storedPinOrHash);
  if (bufInput.length !== bufStored.length) return false;
  return crypto.timingSafeEqual(bufInput, bufStored);
}

/**
 * Generate a cryptographically signed HMAC token for a user
 */
export function generateAuthToken(user: { id: string; phone: string; fullName: string; shopName?: string }): string {
  const secret = getAuthSecret();
  const payload = {
    sub: user.id,
    phone: user.phone,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Verify HMAC token and return decoded payload if valid
 */
export function verifyAuthToken(token: string): { sub: string; phone: string } | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return null;
  }

  const [payloadStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');

  try {
    const isMatch = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isMatch) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware ensuring an authenticated user context is verified against DB
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : String(req.headers['x-auth-token'] || '').trim();

    if (!token || !isSupabaseConfigured()) {
      return res.status(401).json({ error: 'Session non authentifiée. Veuillez vous connecter.', code: 'UNAUTHORIZED' });
    }

    const authUser = await getSupabaseUserFromToken(token);
    if (!authUser?.email) {
      return res.status(401).json({ error: 'Session Supabase invalide ou expirée.', code: 'UNAUTHORIZED' });
    }

    const phone = authUser.email.split('@')[0];
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase est obligatoire pour l’authentification.');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, name, store_name')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return res.status(401).json({ error: 'Profil utilisateur introuvable ou compte désactivé.', code: 'UNAUTHORIZED' });
    }

    req.userId = user.id;
    req.user = { id: user.id, phone: user.phone, fullName: user.name, shopName: user.store_name };
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Session non authentifiée.', code: 'UNAUTHORIZED' });
  }
}
