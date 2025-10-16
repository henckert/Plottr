import { Router } from 'express';
import { listSessions, createSession, getSession } from '../controllers/sessions.controller';

const router = Router();

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/', createSession);

export default router;
