import { Request, Response, NextFunction } from 'express';
import { PitchesService } from '../services/pitches.service';
import { PitchesListResponseSchema, PitchCreateSchema, PitchUpdateSchema } from '../schemas/pitches.schema';
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
    const parsed = PitchCreateSchema.safeParse(req.body);
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

export async function updatePitch(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const ifMatch = req.headers['if-match'];

    if (!ifMatch) {
      return res.status(400).json({
        error: {
          message: 'If-Match header is required for PUT requests',
          code: 'MISSING_IF_MATCH',
        },
      });
    }

    const parsed = PitchUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const updated = await service.update(id, ifMatch as string, parsed.data);
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
