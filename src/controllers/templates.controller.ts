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
      // If runtime validation fails, throw an error so middleware can handle it
      const err = new Error('Response validation failed');
      // attach validation details for debugging
      (err as any).details = parsed.error.format();
      throw err;
    }
    res.json(parsed.data as TemplatesList);
  } catch (err) {
    next(err);
  }
}
