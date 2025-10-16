import { Request, Response, NextFunction } from 'express';
import { TemplatesService } from '../services/templates.service';
import { TemplatesListResponse, TemplatesList } from '../schemas/templates.schema';

const service = new TemplatesService();

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.list();
    // Runtime validate the response shape
    const parsed = TemplatesListResponse.safeParse({ data });
    if (!parsed.success) {
      // If runtime validation fails, throw AppError with code VALIDATION_ERROR
      const { AppError } = await import('../errors');
      const err = new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
      // attach validation details for debugging
      (err as any).details = parsed.error.format();
      throw err;
    }
    res.json(parsed.data as TemplatesList);
  } catch (err) {
    next(err);
  }
}
