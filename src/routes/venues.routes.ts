import { Router } from 'express';
import { listVenues, getVenue, createVenue, updateVenue } from '../controllers/venues.controller';

const router = Router();

router.get('/', listVenues);
router.get('/:id', getVenue);
router.post('/', createVenue);
router.put('/:id', updateVenue);

export default router;
