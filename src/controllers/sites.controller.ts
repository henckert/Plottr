/**
 * Sites Controller - HTTP handlers for site management endpoints
 * Handles request/response, validation, pagination, version token checks
 */

import { Request, Response, NextFunction } from 'express';
import { SitesService } from '../services/sites.service';
import {
  SiteCreateSchema,
  SiteUpdateSchema,
  SiteResponseSchema,
  SitesListResponseSchema,
} from '../schemas/sites.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';

const service = new SitesService();

/**
 * GET /api/sites
 * List sites with cursor-based pagination
 * Query params: cursor (optional), limit (optional, default 50, max 100)
 */
export async function listSites(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse and validate pagination params
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    // In dev mode (AUTH_REQUIRED=false), club_id is optional - defaults to 1 for demo
    const clubId = req.query.club_id ? Number(req.query.club_id) : 1;

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
    const data = await service.listPaginated(clubId, params.limit! + 1, params.cursor);

    // Extract ID and sort value from items
    const getIdValue = (item: any) => item.id;
    const getSortValue = (item: any) => {
      // Convert Date objects to ISO strings for consistent cursor encoding
      const val = item.updated_at;
      return val instanceof Date ? val.toISOString() : val;
    };

    // Paginate and format response
    const paginated = paginateResults(data, params, getIdValue, getSortValue);

    // Validate response schema
    const parsed = SitesListResponseSchema.safeParse({
      data: paginated.data,
      next_cursor: paginated.next_cursor,
      has_more: paginated.has_more,
    });
    if (!parsed.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.json({
      data: paginated.data,
      next_cursor: paginated.next_cursor,
      has_more: paginated.has_more,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sites/:id
 * Get a single site by ID
 */
export async function getSite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Site ID must be a number',
      });
    }

    const site = await service.get(id);

    // Validate response schema
    const parsed = SiteResponseSchema.safeParse(site);
    if (!parsed.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.json({ data: site });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sites
 * Create a new site with optional geocoding
 */
export async function createSite(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const parsed = SiteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid site data',
        details: parsed.error.errors,
      });
    }

    // Create site (service handles geocoding)
    const created = await service.create(parsed.data);

    // Validate response schema
    const validatedResponse = SiteResponseSchema.safeParse(created);
    if (!validatedResponse.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/sites/:id
 * Update a site with version token check (optimistic concurrency)
 * Requires If-Match header with current version_token
 */
export async function updateSite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const ifMatch = req.headers['if-match'];

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Site ID must be a number',
      });
    }

    // Check If-Match header
    if (!ifMatch) {
      return res.status(400).json({
        error: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for PUT requests',
      });
    }

    // Validate request body
    const parsed = SiteUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid site data',
        details: parsed.error.errors,
      });
    }

    // Update site (service handles version token check)
    const updated = await service.update(id, ifMatch as string, parsed.data);

    // Validate response schema
    const validatedResponse = SiteResponseSchema.safeParse(updated);
    if (!validatedResponse.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/sites/:id
 * Soft delete a site with version token check
 * Requires If-Match header with current version_token
 */
export async function deleteSite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const ifMatch = req.headers['if-match'];

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Site ID must be a number',
      });
    }

    // Check If-Match header
    if (!ifMatch) {
      return res.status(400).json({
        error: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for DELETE requests',
      });
    }

    // Soft delete site (service handles version token check)
    await service.delete(id, ifMatch as string);

    // Return 204 No Content (successful deletion)
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
