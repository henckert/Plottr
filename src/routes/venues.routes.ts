import { Router } from 'express';
import { listVenues, getVenue, createVenue } from '../controllers/venues.controller';

const router = Router();

router.get('/', listVenues);
router.get('/:id', getVenue);
router.post('/', createVenue);

export default router;
