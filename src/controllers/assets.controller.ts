import { Request, Response, NextFunction } from 'express';
import { AssetsService } from '../services/assets.service';
import { AssetCreateSchema, AssetUpdateSchema, AssetsListResponseSchema } from '../schemas/assets.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';

const service = new AssetsService();

/**
 * List assets with optional filters and pagination
 * GET /api/assets?layout_id=1&zone_id=2&asset_type=goal&cursor=xxx&limit=50
 */
export async function listAssets(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const layoutId = req.query.layout_id ? Number(req.query.layout_id) : undefined;
    const zoneId = req.query.zone_id ? Number(req.query.zone_id) : undefined;
    const assetType = req.query.asset_type as string | undefined;

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
      zoneId,
      assetType
    );

    // Paginate and format response
    const paginated = paginateResults(
      data,
      params,
      (item: any) => item.id,
      (item: any) => item.updated_at
    );

    const parsed = AssetsListResponseSchema.safeParse({ data: paginated.data });
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 500, parsed.error.message);
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
 * Get single asset by ID
 * GET /api/assets/:id
 */
export async function getAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const asset = await service.get(id);
    return res.json({ data: asset });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new asset
 * POST /api/assets
 */
export async function createAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = AssetCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const created = await service.create({
      layoutId: parsed.data.layout_id,
      zoneId: parsed.data.zone_id,
      name: parsed.data.name,
      assetType: parsed.data.asset_type,
      icon: parsed.data.icon,
      geometry: parsed.data.geometry,
      rotationDeg: parsed.data.rotation_deg,
      properties: parsed.data.properties,
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * Update asset
 * PUT /api/assets/:id
 */
export async function updateAsset(req: Request, res: Response, next: NextFunction) {
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

    const parsed = AssetUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }

    const updated = await service.update(id, ifMatch as string, {
      zoneId: parsed.data.zone_id,
      name: parsed.data.name,
      assetType: parsed.data.asset_type,
      icon: parsed.data.icon,
      geometry: parsed.data.geometry,
      rotationDeg: parsed.data.rotation_deg,
      properties: parsed.data.properties,
    });

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete asset
 * DELETE /api/assets/:id
 */
export async function deleteAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const ifMatch = req.headers['if-match'];

    if (!ifMatch) {
      return res.status(400).json({
        error: {
          message: 'If-Match header is required for DELETE requests',
          code: 'MISSING_IF_MATCH',
        },
      });
    }

    await service.delete(id, ifMatch as string);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
