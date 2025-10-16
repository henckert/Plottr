import { Router } from 'express';
import { listTemplates } from '../controllers/templates.controller';

const router = Router();

router.get('/', listTemplates);

export default router;
