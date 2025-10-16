import { Router } from 'express';
import templates from './templates.routes';

const router = Router();

router.use('/templates', templates);

export default router;
