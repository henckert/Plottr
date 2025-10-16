import { Router } from 'express';
import { listSessions, createSession, getSession, updateSession } from '../controllers/sessions.controller';

const router = Router();

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/', createSession);
router.put('/:id', updateSession);

export default router;
