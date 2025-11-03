import { Request, Response, NextFunction } from 'express';
import * as geocodeService from '../services/geocode.service';
import { z } from 'zod';
import { AppError } from '../errors';

const QuerySchema = z.object({ q: z.string().min(1), limit: z.string().optional() });

// Legacy Mapbox geocode endpoint (keep for backwards compatibility)
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

/**
 * Forward geocoding using configured provider (address to coordinates)
 * GET /api/geocode/search?q=...&country=IE&limit=5&proximity=-6.26,53.35
 */
export async function searchGeocode(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, limit = '5', country, proximity } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Query parameter "q" is required',
          code: 'MISSING_QUERY',
        },
      });
    }

    // Clamp limit to [1, 10], default 5
    let parsedLimit = 5;
    if (typeof limit === 'string') {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        parsedLimit = 5;
      } else if (parsedLimit > 10) {
        parsedLimit = 10;
      }
    }

    const countryCode = typeof country === 'string' ? country : undefined;
    const proximityStr = typeof proximity === 'string' ? proximity : undefined;

    const results = await geocodeService.nominatimSearch(
      q,
      parsedLimit,
      'unknown', // IP tracking not implemented yet
      countryCode
    );

    return res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * Reverse geocoding using Nominatim (coordinates to address)
 * GET /api/geocode/reverse?lat=...&lon=...
 */
export async function reverseGeocode(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: {
          message: 'Query parameters "lat" and "lon" are required',
          code: 'MISSING_COORDINATES',
        },
      });
    }

    const latitude = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
    const longitude = typeof lon === 'string' ? parseFloat(lon) : Number(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: {
          message: 'Invalid coordinates',
          code: 'INVALID_COORDINATES',
        },
      });
    }

    const result = await geocodeService.nominatimReverse(latitude, longitude);

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
