import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db';

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
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  let resolvedUserId = '';

  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded?.sub) {
      resolvedUserId = decoded.sub;
    }
  }

  // Support direct X-User-Id STRICTLY in test environment (NODE_ENV === 'test')
  // In production (and standard runtime), X-User-Id is strictly forbidden and ignored to prevent spoofing
  if (!resolvedUserId && process.env.NODE_ENV === 'test' && req.headers['x-user-id']) {
    resolvedUserId = String(req.headers['x-user-id']).trim();
  }

  if (!resolvedUserId) {
    return res.status(401).json({
      error: 'Session non authentifiée. Veuillez vous connecter.',
      code: 'UNAUTHORIZED',
    });
  }

  const user = db.prepare(`
    SELECT id, phone, full_name, shop_name 
    FROM users 
    WHERE id = ?
  `).get(resolvedUserId) as any;

  if (!user) {
    return res.status(401).json({
      error: 'Utilisateur introuvable ou compte désactivé.',
      code: 'UNAUTHORIZED',
    });
  }

  req.userId = user.id;
  req.user = {
    id: user.id,
    phone: user.phone,
    fullName: user.full_name,
    shopName: user.shop_name,
  };

  next();
}
