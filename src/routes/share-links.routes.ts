import { Router } from 'express';
import * as controller from '@/controllers/share-links.controller';
import { authMiddleware } from '@/middleware/auth';

// API router for authenticated endpoints
const apiRouter = Router();

// Public router for anonymous access (no auth required)
export const publicShareRouter = Router();

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

// Protected endpoints (mounted at /api/share-links)
apiRouter.post('/', authMiddleware, controller.createShareLink);
apiRouter.get('/', authMiddleware, controller.listShareLinks);
apiRouter.get('/:id', authMiddleware, controller.getShareLink);
apiRouter.put('/:id', authMiddleware, controller.updateShareLink);
apiRouter.delete('/:id', authMiddleware, controller.deleteShareLink);

// Public endpoint (mounted at /share/:slug)
publicShareRouter.get('/:slug', controller.getPublicShareView);

export default apiRouter;
