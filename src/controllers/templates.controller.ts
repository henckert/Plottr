import { Request, Response, NextFunction } from 'express';
import { TemplatesService } from '../services/templates.service';
import { AppError } from '../errors';
import { AuthenticatedRequest } from '../middleware/auth';

const service = new TemplatesService();

/**
 * GET /api/templates
 * List templates with filters and pagination
 */
export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse query parameters
    const sport_type = req.query.sport_type as string | undefined;
    const is_public = req.query.is_public === 'true' ? true : req.query.is_public === 'false' ? false : undefined;
    const created_by = req.query.created_by as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    const result = await service.list({
      sport_type,
      is_public,
      created_by,
      limit,
      cursor,
    });

    res.json({
      data: result.templates,
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/templates/:id
 * Get a single template by ID
 */
export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return next(new AppError('Invalid template ID', 400, 'INVALID_ID'));
    }

    const template = await service.getById(id);
    if (!template) {
      return next(new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND'));
    }

    res.json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/templates/from-layout
 * Create a new template from an existing layout
 */
export async function createTemplateFromLayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { layout_id, name, sport_type, description, thumbnail_url, is_public } = req.body;

    if (!layout_id || !name) {
      return next(new AppError('layout_id and name are required', 400, 'MISSING_FIELDS'));
    }

    const template = await service.createFromLayout(layout_id, {
      created_by: req.user?.clerkId,
      name,
      sport_type,
      description,
      thumbnail_url,
      is_public,
    });

    res.status(201).json({ data: template });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/templates/:id/apply
 * Apply a template to a layout
 */
export async function applyTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const templateId = parseInt(req.params.id, 10);
    if (isNaN(templateId)) {
      return next(new AppError('Invalid template ID', 400, 'INVALID_ID'));
    }

    const { layout_id, clear_existing } = req.body;
    if (!layout_id) {
      return next(new AppError('layout_id is required', 400, 'MISSING_FIELDS'));
    }

    const result = await service.applyToLayout(templateId, layout_id, {
      clearExisting: clear_existing ?? true,
      userId: req.user?.clerkId,
    });

    res.json({
      data: {
        message: 'Template applied successfully',
        zones_created: result.zones_created,
        assets_created: result.assets_created,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/templates/:id
 * Delete a template (owner only)
 */
export async function deleteTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return next(new AppError('Invalid template ID', 400, 'INVALID_ID'));
    }

    await service.delete(id, req.user?.clerkId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

