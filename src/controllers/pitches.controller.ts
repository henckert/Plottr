import { Request, Response, NextFunction } from 'express';
import { PitchesService } from '../services/pitches.service';
import { PitchesListResponseSchema } from '../schemas/pitches.schema';
import { AppError } from '../errors';

const service = new PitchesService();

export async function listPitches(req: Request, res: Response, next: NextFunction) {
  try {
    const venueId = req.params.venueId ? Number(req.params.venueId) : undefined;
    const data = await service.list(venueId);
    const parsed = PitchesListResponseSchema.safeParse({ data });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);
    return res.json(parsed.data);
  } catch (err) {
    next(err);
  }
}

export async function getPitch(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const item = await service.get(id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function createPitch(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const created = await service.create(payload);
    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}
