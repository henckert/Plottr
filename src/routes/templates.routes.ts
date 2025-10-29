import { Router } from 'express';
import {
  listTemplates,
  getTemplate,
  createTemplateFromLayout,
  applyTemplate,
  deleteTemplate,
} from '../controllers/templates.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', listTemplates); // List templates (filterable by sport_type, is_public)
router.get('/:id', getTemplate); // Get single template

// Protected routes (require authentication)
router.post('/from-layout', authMiddleware, createTemplateFromLayout); // Create template from layout
router.post('/:id/apply', authMiddleware, applyTemplate); // Apply template to layout
router.delete('/:id', authMiddleware, deleteTemplate); // Delete template (owner only)

export default router;

