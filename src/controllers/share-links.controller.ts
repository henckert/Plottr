import { Request, Response, NextFunction } from 'express';
import * as shareLinksService from '@/services/share-links.service';
import { ZonesService } from '@/services/zones.service';
import { AssetsService } from '@/services/assets.service';
import {
  ShareLinkCreateSchema,
  ShareLinkUpdateSchema,
  ShareLinkListQuerySchema,
} from '@/schemas/share-links.schema';
import { AppError } from '@/errors';
import { AuthenticatedRequest } from '@/middleware/auth';
import { validatePaginationParams, paginateResults } from '@/lib/pagination';

const zonesService = new ZonesService();
const assetsService = new AssetsService();

/**
 * Create a new share link for a layout
 * POST /api/share-links
 */
export async function createShareLink(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate request body
    const parsed = ShareLinkCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const userId = req.user?.clerkId;
    const shareLink = await shareLinksService.create(parsed.data, userId);

    return res.status(201).json({ data: shareLink });
  } catch (err) {
    next(err);
  }
}

/**
 * List share links with filters
 * GET /api/share-links?layout_id=1&expired=false&limit=50&cursor=...
 */
export async function listShareLinks(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate query parameters
    const parsed = ShareLinkListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const { layout_id, expired, limit, cursor } = parsed.data;

    // Validate pagination params
    let paginationParams;
    try {
      paginationParams = validatePaginationParams(cursor, limit || 50);
    } catch (err) {
      return res.status(400).json({
        error: 'INVALID_PAGINATION',
        message: (err as Error).message,
      });
    }

    // Fetch limit+1 to detect if there are more pages
    const data = await shareLinksService.list(
      { layout_id, expired },
      paginationParams.limit! + 1,
      paginationParams.cursor
    );

    // Extract ID and sort value from items
    const getIdValue = (item: any) => item.id;
    const getSortValue = (item: any) => item.created_at;

    // Paginate and format response
    const paginated = paginateResults(data, paginationParams, getIdValue, getSortValue);

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
 * Get a single share link by ID
 * GET /api/share-links/:id
 */
export async function getShareLink(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Share link ID must be a number',
      });
    }

    const shareLink = await shareLinksService.getById(id);
    if (!shareLink) {
      return res.status(404).json({
        error: 'SHARE_LINK_NOT_FOUND',
        message: `Share link ${id} not found`,
      });
    }

    return res.json({ data: shareLink });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a share link (typically to change expiration)
 * PUT /api/share-links/:id
 */
export async function updateShareLink(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Share link ID must be a number',
      });
    }

    // Validate request body
    const parsed = ShareLinkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const updated = await shareLinksService.update(id, parsed.data);
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a share link (revoke access)
 * DELETE /api/share-links/:id
 */
export async function deleteShareLink(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Share link ID must be a number',
      });
    }

    await shareLinksService.deleteById(id);
    return res.json({ message: 'Share link revoked successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Public share link view - Get layout with zones and assets
 * GET /share/:slug
 * No authentication required
 */
export async function getPublicShareView(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { slug } = req.params;

    // Get shared layout data
    const { share_link, layout } = await shareLinksService.getSharedLayout(slug);

    // Fetch zones for this layout
    const zones = await zonesService.listPaginated(1000, undefined, layout.id);

    // Fetch assets for this layout
    const assets = await assetsService.listPaginated(1000, undefined, layout.id);

    // Return public view (no sensitive data)
    return res.json({
      data: {
        layout: {
          id: layout.id,
          name: layout.name,
          description: layout.description,
          is_published: layout.is_published,
          created_at: layout.created_at,
          updated_at: layout.updated_at,
        },
        zones: zones.map((z: any) => ({
          id: z.id,
          name: z.name,
          zone_type: z.zone_type,
          geometry: z.boundary, // Note: zones use 'boundary' not 'geometry'
          color: z.color,
          surface: z.surface,
          notes: null, // zones don't have notes field
          area_sqm: z.area_sqm,
          perimeter_m: z.perimeter_m,
        })),
        assets: assets.map((a: any) => ({
          id: a.id,
          name: a.name,
          asset_type: a.asset_type,
          geometry: a.geometry,
          icon: a.icon,
          rotation_deg: a.rotation_deg,
          properties: a.properties,
        })),
        share_link: {
          slug: share_link.slug,
          view_count: share_link.view_count,
          last_accessed_at: share_link.last_accessed_at,
          created_at: share_link.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
