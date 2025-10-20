/**
 * Layouts Routes
 * HTTP routes for layout management API
 * 
 * Endpoints:
 * - GET    /api/layouts        List layouts for a site (cursor pagination)
 * - GET    /api/layouts/:id    Get single layout by ID
 * - POST   /api/layouts        Create new layout
 * - PUT    /api/layouts/:id    Update layout (requires If-Match version token)
 * - DELETE /api/layouts/:id    Delete layout (requires If-Match version token)
 */

import { Router } from 'express';
import {
  listLayouts,
  getLayout,
  createLayout,
  updateLayout,
  deleteLayout,
} from '../controllers/layouts.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/layouts
 * List layouts for a specific site with cursor pagination
 * Query params: site_id (required), club_id (required), cursor (optional), limit (optional)
 */
router.get('/', listLayouts);

/**
 * GET /api/layouts/:id
 * Get a single layout by ID
 * Query params: club_id (required)
 */
router.get('/:id', getLayout);

/**
 * POST /api/layouts
 * Create a new layout
 * Query params: club_id (required)
 * Body: { site_id, name, description?, is_published? }
 */
router.post('/', createLayout);

/**
 * PUT /api/layouts/:id
 * Update an existing layout
 * Headers: If-Match (version_token)
 * Query params: club_id (required)
 * Body: { name?, description?, is_published? }
 */
router.put('/:id', updateLayout);

/**
 * DELETE /api/layouts/:id
 * Delete a layout (hard delete, cascades to zones/assets/templates/share_links)
 * Headers: If-Match (version_token)
 * Query params: club_id (required)
 */
router.delete('/:id', deleteLayout);

export default router;
