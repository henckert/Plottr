import { Request, Response, NextFunction } from 'express';
import { PitchesService } from '../services/pitches.service';
import { PitchesListResponseSchema, PitchCreateSchema, PitchUpdateSchema } from '../schemas/pitches.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';

const service = new PitchesService();

export async function listPitches(req: Request, res: Response, next: NextFunction) {
  try {
    const venueId = req.params.venueId ? Number(req.params.venueId) : undefined;
    
    // Parse and validate pagination params
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    let params;
    try {
      params = validatePaginationParams(cursor, limit);
    } catch (err) {
      return res.status(400).json({
        error: 'INVALID_PAGINATION',
        message: (err as Error).message,
      });
    }

    // Fetch limit+1 to detect if there are more pages
    const data = await service.listPaginated(venueId, params.limit! + 1, params.cursor);

    // Extract ID and sort value from items
    const getIdValue = (item: any) => item.id;
    const getSortValue = (item: any) => item.updated_at;

    // Paginate and format response
    const paginated = paginateResults(data, params, getIdValue, getSortValue);

    const parsed = PitchesListResponseSchema.safeParse({ data: paginated.data });
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);

    return res.json({
      data: paginated.data,
      next_cursor: paginated.next_cursor,
      has_more: paginated.has_more,
    });
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
