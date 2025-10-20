/**
 * Sites Routes - Express router for site management endpoints
 * Mounts all CRUD handlers at /api/sites
 */

import { Router } from 'express';
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
} from '../controllers/sites.controller';

const router = Router();

/**
 * GET /api/sites
 * List sites with cursor-based pagination
 * Query params: club_id (required), cursor (optional), limit (optional)
 */
router.get('/', listSites);

/**
 * GET /api/sites/:id
 * Get a single site by ID
 */
router.get('/:id', getSite);

/**
 * POST /api/sites
 * Create a new site with optional geocoding
 * Body: { club_id, name, address?, location?, bbox? }
 */
router.post('/', createSite);

/**
 * PUT /api/sites/:id
 * Update a site with version token check
 * Headers: If-Match (required, version token)
 * Body: { name?, address?, location?, bbox? }
 */
router.put('/:id', updateSite);

/**
 * DELETE /api/sites/:id
 * Soft delete a site with version token check
 * Headers: If-Match (required, version token)
 */
router.delete('/:id', deleteSite);

export default router;
