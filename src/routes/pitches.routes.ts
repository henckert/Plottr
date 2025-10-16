import { Router } from 'express';
import { listPitches, createPitch, getPitch } from '../controllers/pitches.controller';

const router = Router({ mergeParams: true });

router.get('/', listPitches);
router.get('/:id', getPitch);
router.post('/', createPitch);

export default router;
