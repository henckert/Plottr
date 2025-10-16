import { Router } from 'express';
import { listPitches, createPitch, getPitch, updatePitch } from '../controllers/pitches.controller';

const router = Router({ mergeParams: true });

router.get('/', listPitches);
router.get('/:id', getPitch);
router.post('/', createPitch);
router.put('/:id', updatePitch);

export default router;
