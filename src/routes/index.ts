import { Router } from 'express';
import auth from './auth.routes';
import templates from './templates.routes';
import venues from './venues.routes';
import pitches from './pitches.routes';
import sessions from './sessions.routes';
import geocode from './geocode.routes';

const router = Router();

router.use('/auth', auth);
router.use('/templates', templates);
router.use('/venues', venues);
router.use('/pitches', pitches);
router.use('/sessions', sessions);
router.use('/geocode', geocode);

export default router;
