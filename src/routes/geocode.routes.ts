import { Router } from 'express';
import { geocode, searchGeocode, reverseGeocode } from '../controllers/geocode.controller';

const router = Router();

// Legacy Mapbox endpoint: GET /api/geocode?q=...&limit=5
router.get('/', geocode);

// Nominatim search: GET /api/geocode/search?q=...&countrycodes=ie&limit=10
router.get('/search', searchGeocode);

// Nominatim reverse: GET /api/geocode/reverse?lat=...&lon=...
router.get('/reverse', reverseGeocode);

export default router;
