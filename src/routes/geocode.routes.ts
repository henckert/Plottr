import { Router } from 'express';
import { geocode } from '../controllers/geocode.controller';

const router = Router();

// GET /api/geocode?q=...&limit=5
router.get('/', geocode);

export default router;
