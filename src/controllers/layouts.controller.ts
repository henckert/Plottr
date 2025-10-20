/**
 * Layouts Controller - HTTP handlers for layout management endpoints
 * Handles request/response, validation, pagination, version token checks
 */

import { Request, Response, NextFunction } from 'express';
import { LayoutsService } from '../services/layouts.service';
import {
  LayoutCreateSchema,
  LayoutUpdateSchema,
  LayoutResponseSchema,
  LayoutsListResponseSchema,
} from '../schemas/layouts.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';
import { AuthenticatedRequest } from '../middleware/auth';

const service = new LayoutsService();

/**
 * GET /api/layouts
 * List layouts for a specific site with cursor-based pagination
 * Query params: site_id (required), cursor (optional), limit (optional, default 50, max 100)
 */
export async function listLayouts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Parse and validate pagination params
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const siteId = req.query.site_id ? Number(req.query.site_id) : undefined;

    // Validate site_id is provided
    if (!siteId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SITE_ID',
          message: 'site_id query parameter is required',
        },
      });
    }

    // Extract club_id from authenticated user context
    // In production, this would come from the user's club membership
    // For now, we'll require it as a query param (TODO: get from user context)
    const clubId = req.query.club_id ? Number(req.query.club_id) : undefined;
    if (!clubId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CLUB_ID',
          message: 'club_id query parameter is required',
        },
      });
    }

    let params;
    try {
      params = validatePaginationParams(cursor, limit);
    } catch (err) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: (err as Error).message,
        },
      });
    }

    // Fetch limit+1 to detect if there are more pages
    const data = await service.listBySite(siteId, clubId, params.limit! + 1, params.cursor);

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
    const parsed = LayoutsListResponseSchema.safeParse({
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
 * GET /api/layouts/:id
 * Get a single layout by ID
 */
export async function getLayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Layout ID must be a number',
        },
      });
    }

    // Extract club_id from query (TODO: get from user context)
    const clubId = req.query.club_id ? Number(req.query.club_id) : undefined;
    if (!clubId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CLUB_ID',
          message: 'club_id query parameter is required',
        },
      });
    }

    const layout = await service.get(id, clubId);

    // Validate response schema
    const parsed = LayoutResponseSchema.safeParse(layout);
    if (!parsed.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.json({ data: layout });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/layouts
 * Create a new layout
 */
export async function createLayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const parsed = LayoutCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
      });
    }

    // Extract club_id from query (TODO: get from user context)
    const clubId = req.query.club_id ? Number(req.query.club_id) : undefined;
    if (!clubId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CLUB_ID',
          message: 'club_id query parameter is required',
        },
      });
    }

    // Get created_by from authenticated user
    const createdBy = req.user?.clerkId || 'unknown';

    // Create layout with ownership validation
    const created = await service.create(
      { ...parsed.data, created_by: createdBy },
      clubId
    );

    // Validate response schema
    const validated = LayoutResponseSchema.safeParse(created);
    if (!validated.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/layouts/:id
 * Update an existing layout
 * Requires If-Match header with version_token for optimistic concurrency control
 */
export async function updateLayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Layout ID must be a number',
        },
      });
    }

    // Check for If-Match header (version token)
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return res.status(400).json({
        error: {
          code: 'MISSING_IF_MATCH',
          message: 'If-Match header is required for PUT requests',
        },
      });
    }

    // Validate request body
    const parsed = LayoutUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
      });
    }

    // Extract club_id from query (TODO: get from user context)
    const clubId = req.query.club_id ? Number(req.query.club_id) : undefined;
    if (!clubId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CLUB_ID',
          message: 'club_id query parameter is required',
        },
      });
    }

    // Update with version token validation
    const updated = await service.update(id, ifMatch as string, parsed.data, clubId);

    // Validate response schema
    const validated = LayoutResponseSchema.safeParse(updated);
    if (!validated.success) {
      throw new AppError('Response validation failed', 500, 'VALIDATION_ERROR');
    }

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/layouts/:id
 * Delete a layout (hard delete - cascades to zones, assets, templates, share_links)
 * Requires If-Match header with version_token for optimistic concurrency control
 */
export async function deleteLayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Layout ID must be a number',
        },
      });
    }

    // Check for If-Match header (version token)
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return res.status(400).json({
        error: {
          code: 'MISSING_IF_MATCH',
          message: 'If-Match header is required for DELETE requests',
        },
      });
    }

    // Extract club_id from query (TODO: get from user context)
    const clubId = req.query.club_id ? Number(req.query.club_id) : undefined;
    if (!clubId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CLUB_ID',
          message: 'club_id query parameter is required',
        },
      });
    }

    // Delete with version token validation
    await service.delete(id, ifMatch as string, clubId);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
