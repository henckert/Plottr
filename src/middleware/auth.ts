import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { getConfig } from '../config';
import { AppError } from '../errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    clerkId: string;
    email?: string;
    tier?: 'free' | 'paid_individual' | 'club_admin' | 'admin' | string;
    token: string;
  };
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

const config = getConfig();

/**
 * Clerk JWT validation middleware
 * - Extracts JWT from Authorization: Bearer <token> header
 * - Validates JWT signature using Clerk's public key
 * - Extracts user tier from custom claims
 * - Attaches user context to req.user
 * - Falls back to dev mode if AUTH_REQUIRED is false
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    // Dev mode: allow missing auth
    if (!authHeader && !config.AUTH_REQUIRED) {
      req.user = {
        clerkId: 'dev-user-123',
        email: 'dev@plottr.local',
        tier: 'free',
        token: 'dev-mode',
      };
      return next();
    }

    if (!authHeader) {
      return next(
        new AppError(
          'Missing Authorization header. Use "Bearer <token>"',
          401,
          'MISSING_AUTH'
        )
      );
    }

    // Parse "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next(
        new AppError(
          'Invalid Authorization header format. Use "Bearer <token>"',
          401,
          'INVALID_AUTH_FORMAT'
        )
      );
    }

    const token = parts[1];

    // Dev mode: accept any token
    if (!config.AUTH_REQUIRED) {
      req.user = {
        clerkId: 'dev-user-123',
        email: 'dev@plottr.local',
        tier: 'free',
        token,
      };
      return next();
    }

    // Verify Clerk JWT token
    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY || '',
    });

    // Extract user info from JWT
    const clerkId = decoded.sub || ''; // Clerk user ID
    const emailArray = (decoded as any).email_addresses;
    const email = Array.isArray(emailArray) ? emailArray[0]?.email_address : undefined;
    const publicMetadata = (decoded as any).public_metadata || {};
    const tier = (publicMetadata.tier as string) || 'free';

    // Attach to request
    req.user = {
      clerkId,
      email,
      tier: tier as 'free' | 'paid_individual' | 'club_admin' | 'admin',
      token,
    };

    next();
  } catch (error) {
    return next(
      new AppError(
        `Invalid or expired token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        403,
        'INVALID_TOKEN'
      )
    );
  }
}

/**
 * Stricter middleware for endpoints that always require auth
 * (useful if you want some endpoints public and others private)
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.clerkId) {
    return next(
      new AppError('Authentication required', 401, 'MISSING_AUTH')
    );
  }
  next();
}
