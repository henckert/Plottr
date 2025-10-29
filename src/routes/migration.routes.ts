import { Router } from 'express';
import { getMigrationStatus } from '../controllers/migration.controller';

const router = Router();

/**
 * GET /api/migration/status
 * Check if user needs to migrate from venues→sites
 */
router.get('/status', getMigrationStatus);

export default router;
