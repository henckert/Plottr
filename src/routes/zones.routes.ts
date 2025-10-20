import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
} from '../controllers/zones.controller';

const router = Router();

/**
 * Zones API Routes
 * All endpoints require authentication
 * 
 * GET    /api/zones           - List zones with cursor pagination
 * POST   /api/zones           - Create new zone
 * GET    /api/zones/:id       - Get zone by ID
 * PUT    /api/zones/:id       - Update zone (requires If-Match header)
 * DELETE /api/zones/:id       - Delete zone (requires If-Match header)
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);

// List zones with pagination (supports filtering by layout_id and zone_type)
router.get('/', listZones);

// Create new zone
router.post('/', createZone);

// Get zone by ID
router.get('/:id', getZone);

// Update zone (requires If-Match header for version control)
router.put('/:id', updateZone);

// Delete zone (requires If-Match header for version control)
router.delete('/:id', deleteZone);

export default router;
