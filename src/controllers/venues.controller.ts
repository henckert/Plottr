import { Request, Response, NextFunction } from 'express';
import { VenuesService } from '../services/venues.service';
import { VenuesListResponseSchema, VenueCreateSchema, VenueUpdateSchema } from '../schemas/venues.schema';
import { AppError } from '../errors';

const service = new VenuesService();

export async function listVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.list();
    const parsed = VenuesListResponseSchema.safeParse({ data });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);
    return res.json(parsed.data);
  } catch (err) {
    next(err);
  }
}

export async function getVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const item = await service.get(id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    const parsed = VenuesListResponseSchema.safeParse({ data: [item] });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);
    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function createVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = VenueCreateSchema.safeParse(req.body);
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

export async function updateVenue(req: Request, res: Response, next: NextFunction) {
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

    const parsed = VenueUpdateSchema.safeParse(req.body);
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