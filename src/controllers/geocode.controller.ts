import { Request, Response, NextFunction } from 'express';
import * as geocodeService from '../services/geocode.service';
import { z } from 'zod';

const QuerySchema = z.object({ q: z.string().min(1), limit: z.string().optional() });

export async function geocode(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = QuerySchema.parse(req.query);
    const limit = parsed.limit ? Number(parsed.limit) : 5;
    const result = await geocodeService.forwardGeocode(parsed.q, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
