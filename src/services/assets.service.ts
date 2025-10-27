/**
 * Assets Service - Business logic for asset operations
 * Validates ownership, geometry constraints, and icon presets
 */

import { AssetsRepository, AssetRow } from '../data/assets.repo';
import { LayoutsRepository } from '../data/layouts.repo';
import { ZonesRepository } from '../data/zones.repo';
import { AppError } from '../errors';
import { validateAssetGeometry } from '../lib/geospatial';
import { decodeCursor } from '../lib/pagination';

export class AssetsService {
  private assetsRepo: AssetsRepository;
  private layoutsRepo: LayoutsRepository;
  private zonesRepo: ZonesRepository;

  constructor() {
    this.assetsRepo = new AssetsRepository();
    this.layoutsRepo = new LayoutsRepository();
    this.zonesRepo = new ZonesRepository();
  }

  /**
   * List assets with pagination
   */
  async listPaginated(
    limit: number,
    cursor?: string,
    layoutId?: number,
    zoneId?: number,
    assetType?: string
  ) {
    const cursorParams = cursor
      ? decodeCursor(cursor)
      : undefined;

    return await this.assetsRepo.list({
      layoutId,
      zoneId,
      assetType,
      limit,
      cursor: cursorParams ? {
        id: cursorParams.id,
        updatedAt: cursorParams.sortValue,
      } : undefined,
    });
  }

  /**
   * Get single asset
   */
  async get(id: number) {
    const asset = await this.assetsRepo.getById(id);
    if (!asset) {
      throw new AppError('Asset not found', 404, 'NOT_FOUND');
    }
    return asset;
  }

  /**
   * Create new asset
   */
  async create(data: {
    layoutId: number;
    zoneId?: number | null;
    name: string;
    assetType: string;
    icon?: string | null;
    geometry?: any;
    rotationDeg?: number | null;
    properties?: any;
  }) {
    // Validate layout exists
    const layout = await this.layoutsRepo.findById(data.layoutId);
    if (!layout) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // Validate zone exists and belongs to layout (if provided)
    if (data.zoneId) {
      const zone = await this.zonesRepo.getById(data.zoneId);
      if (!zone) {
        throw new AppError('Zone not found', 404, 'ZONE_NOT_FOUND');
      }

      if (zone.layout_id !== data.layoutId) {
        throw new AppError('Zone does not belong to this layout', 400, 'ZONE_LAYOUT_MISMATCH');
      }
    }

    // Validate geometry (POINT or LINESTRING only)
    if (data.geometry) {
      const geometryError = validateAssetGeometry(data.geometry);
      if (geometryError) {
        throw new AppError(geometryError.message, 400, geometryError.code);
      }
    }

    return await this.assetsRepo.create({
      layoutId: data.layoutId,
      zoneId: data.zoneId,
      name: data.name,
      assetType: data.assetType,
      icon: data.icon,
      geometry: data.geometry,
      rotationDeg: data.rotationDeg,
      properties: data.properties,
    });
  }

  /**
   * Update asset
   */
  async update(id: number, versionToken: string, data: any) {
    // Validate zone belongs to same layout (if changing zone_id)
    if (data.zoneId !== undefined) {
      const asset = await this.assetsRepo.getById(id);
      if (!asset) {
        throw new AppError('Asset not found', 404, 'NOT_FOUND');
      }

      if (data.zoneId !== null) {
        const zone = await this.zonesRepo.getById(data.zoneId);
        if (!zone) {
          throw new AppError('Zone not found', 404, 'ZONE_NOT_FOUND');
        }

        if (zone.layout_id !== asset.layout_id) {
          throw new AppError('Zone does not belong to asset\'s layout', 400, 'ZONE_LAYOUT_MISMATCH');
        }
      }
    }

    // Validate geometry if provided
    if (data.geometry) {
      const geometryError = validateAssetGeometry(data.geometry);
      if (geometryError) {
        throw new AppError(geometryError.message, 400, geometryError.code);
      }
    }

    const updated = await this.assetsRepo.update(id, versionToken, {
      zoneId: data.zoneId,
      name: data.name,
      assetType: data.assetType,
      icon: data.icon,
      geometry: data.geometry,
      rotationDeg: data.rotationDeg,
      properties: data.properties,
    });

    if (!updated) {
      throw new AppError(
        'Asset not found or version conflict',
        409,
        'VERSION_CONFLICT'
      );
    }

    return updated;
  }

  /**
   * Delete asset
   */
  async delete(id: number, versionToken: string) {
    const deleted = await this.assetsRepo.delete(id, versionToken);
    if (!deleted) {
      throw new AppError(
        'Asset not found or version conflict',
        409,
        'VERSION_CONFLICT'
      );
    }
  }
}
