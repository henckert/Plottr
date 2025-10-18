import { Router } from 'express';
import { getAuthUser } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/auth/me - Get current authenticated user info
router.get('/me', requireAuth, getAuthUser);

export default router;
