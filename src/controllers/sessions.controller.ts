import { Request, Response, NextFunction } from 'express';
import { SessionsService } from '../services/sessions.service';
import { SessionsListResponseSchema, SessionCreateSchema } from '../schemas/sessions.schema';
import { AppError } from '../errors';

const service = new SessionsService();

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.list();
    const parsed = SessionsListResponseSchema.safeParse({ data });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);
    return res.json(parsed.data);
  } catch (err) {
    next(err);
  }
}

export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const item = await service.get(id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SessionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const created = await service.create(parsed.data);
    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}
