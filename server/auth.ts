import { Request, Response, NextFunction } from 'express';
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

/**
 * Middleware ensuring an authenticated user context is always present and verified against the DB
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Support custom header (X-User-Id), Bearer token, or default to Cheikh
  let userId = (req.headers['x-user-id'] as string) || '';

  if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
    userId = req.headers.authorization.split(' ')[1];
  }

  if (!userId) {
    userId = DEFAULT_USER_ID;
  }

  const user = db.prepare(`
    SELECT id, phone, full_name, shop_name 
    FROM users 
    WHERE id = ?
  `).get(userId) as any;

  if (!user) {
    return res.status(401).json({
      error: 'Utilisateur non authentifié ou inexistant.',
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
