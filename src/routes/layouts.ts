import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { addTierHeaders, requireTier } from '../middleware/tier';

const router = Router();

/**
 * CORRECT MIDDLEWARE ORDER:
 * 1. requireAuth        → 401 if no valid token
 * 2. addTierHeaders      → attach tier info to response headers
 * 3. requireTier(...)    → 403 if tier insufficient (only after authenticated)
 * 4. handler             → actual business logic
 */

/**
 * POST /api/layouts/:id/export
 * Export layout in paid format (e.g., PDF, GeoJSON)
 * Tier requirement: paid_individual, club_admin, admin
 * Free users: 403 TIER_UPGRADE_REQUIRED
 */
router.post(
  '/:id/export',
  requireAuth, // 1) Authenticate first → 401 for no token
  addTierHeaders, // 2) Attach tier headers for observability
  requireTier('paid_individual'), // 3) Enforce tier → 403 only if authenticated but insufficient tier
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.clerkId;

      // Export handler (stub for now)
      res.status(200).json({
        message: `Export of layout ${id} initiated for user ${userId}`,
        status: 'pending',
      });
    } catch (error) {
      res.status(500).json({ error: 'Export failed' });
    }
  }
);

export default router;
