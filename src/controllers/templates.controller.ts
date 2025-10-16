import { Request, Response, NextFunction } from 'express';
import { TemplatesService } from '../services/templates.service';

const service = new TemplatesService();

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.list();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
