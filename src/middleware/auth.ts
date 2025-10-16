import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';
import { AppError } from '../errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    token: string;
  };
}

const config = getConfig();

/**
 * Auth middleware: validates Authorization header (Bearer token)
 * - In dev mode (AUTH_REQUIRED=false), allows requests without auth
 * - In production (AUTH_REQUIRED=true), requires valid dev-token
 * - Attaches user context to req.user if authenticated
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // If AUTH_REQUIRED is false (dev), allow missing auth
    if (!config.AUTH_REQUIRED) {
      // Attach a placeholder user for dev
      req.user = { id: 0, token: 'dev-mode' };
      return next();
    }
    // Production: require auth
    return next(new AppError('Missing Authorization header', 401, 'MISSING_AUTH'));
  }

  // Parse "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new AppError('Invalid Authorization header format. Use "Bearer <token>"', 401, 'INVALID_AUTH_FORMAT'));
  }

  const token = parts[1];

  // In dev mode, accept any non-empty token
  if (!config.AUTH_REQUIRED) {
    req.user = { id: 0, token };
    return next();
  }

  // Production: validate against DEV_TOKEN (or actual JWT in real app)
  if (token !== config.DEV_TOKEN) {
    return next(new AppError('Invalid or expired token', 403, 'INVALID_TOKEN'));
  }

  // Valid token: attach user context
  req.user = { id: 0, token };
  next();
}

/**
 * Optional: stricter middleware for endpoints that always require auth
 * (useful if you want some endpoints public and others private)
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.token) {
    return next(new AppError('Authentication required', 401, 'MISSING_AUTH'));
  }
  next();
}
