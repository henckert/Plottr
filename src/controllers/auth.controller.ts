import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * GET /api/auth/me
 * Returns the current authenticated user information from the Clerk JWT
 */
export async function getAuthUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user info from Clerk JWT
    res.json({
      clerkId: req.user.clerkId,
      email: req.user.email,
      tier: req.user.tier,
    });
  } catch (err) {
    next(err);
  }
}
