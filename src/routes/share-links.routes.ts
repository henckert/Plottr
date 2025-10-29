import { Router } from 'express';
import * as controller from '@/controllers/share-links.controller';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

/**
 * Share Links Routes
 * 
 * Protected endpoints (require authentication):
 * - POST /api/share-links - Create share link
 * - GET /api/share-links - List share links
 * - GET /api/share-links/:id - Get share link by ID
 * - PUT /api/share-links/:id - Update share link
 * - DELETE /api/share-links/:id - Revoke share link
 * 
 * Public endpoints (no authentication):
 * - GET /share/:slug - Public share view
 */

// Protected endpoints
router.post('/', authMiddleware, controller.createShareLink);
router.get('/', authMiddleware, controller.listShareLinks);
router.get('/:id', authMiddleware, controller.getShareLink);
router.put('/:id', authMiddleware, controller.updateShareLink);
router.delete('/:id', authMiddleware, controller.deleteShareLink);

export default router;
