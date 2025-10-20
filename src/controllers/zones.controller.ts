import { Request, Response, NextFunction } from 'express';
import { ZonesService } from '../services/zones.service';
import { ZonesListResponseSchema, ZoneCreateSchema, ZoneUpdateSchema } from '../schemas/zones.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';
import { AuthenticatedRequest } from '../middleware/auth';

const service = new ZonesService();

/**
 * List zones with cursor pagination
 * GET /api/zones?layout_id=X&zone_type=Y&limit=N&cursor=ABC
 */
export async function listZones(req: Request, res: Response, next: NextFunction) {
  try {
    // Parse query parameters
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const layoutId = req.query.layout_id ? Number(req.query.layout_id) : undefined;
    const zoneType = req.query.zone_type as string | undefined;

    // Validate pagination params
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
    const data = await service.listPaginated(
      params.limit! + 1,
      params.cursor,
      layoutId,
      zoneType
    );

    // Extract ID and sort value from items
    const getIdValue = (item: any) => item.id;
    const getSortValue = (item: any) => item.updated_at;

    // Paginate and format response
    const paginated = paginateResults(data, params, getIdValue, getSortValue);

    // Build full response object
    const response = {
      data: paginated.data,
      next_cursor: paginated.next_cursor,
      has_more: paginated.has_more,
    };

    // Validate response
    const parsed = ZonesListResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new AppError(`VALIDATION_ERROR: ${JSON.stringify(parsed.error.errors)}`, 500, 'VALIDATION_ERROR');
    }

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Get zone by ID
 * GET /api/zones/:id
 */
export async function getZone(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Zone ID must be a number',
      });
    }

    const zone = await service.get(id);
    
    if (!zone) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Zone not found',
      });
    }

    return res.json({ data: zone });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new zone
 * POST /api/zones
 */
export async function createZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const parsed = ZoneCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    // Get authenticated user
    const userClerkId = req.user?.clerkId;
    if (!userClerkId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const created = await service.create(parsed.data, userClerkId);
    
    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing zone
 * PUT /api/zones/:id
 */
export async function updateZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Zone ID must be a number',
      });
    }

    // Require If-Match header for version control
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return res.status(400).json({
        error: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for PUT requests',
      });
    }

    // Validate request body
    const parsed = ZoneUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    // Get authenticated user
    const userClerkId = req.user?.clerkId;
    if (!userClerkId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const updated = await service.update(id, ifMatch as string, parsed.data, userClerkId);
    
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a zone
 * DELETE /api/zones/:id
 */
export async function deleteZone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Zone ID must be a number',
      });
    }

    // Require If-Match header for version control
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return res.status(400).json({
        error: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for DELETE requests',
      });
    }

    // Get authenticated user
    const userClerkId = req.user?.clerkId;
    if (!userClerkId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    await service.delete(id, ifMatch as string, userClerkId);
    
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
