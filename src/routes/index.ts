import { Router } from 'express';
import templates from './templates.routes';
import venues from './venues.routes';
import pitches from './pitches.routes';
import sessions from './sessions.routes';

const router = Router();

router.use('/templates', templates);
router.use('/venues', venues);
router.use('/pitches', pitches);
router.use('/sessions', sessions);

export default router;
