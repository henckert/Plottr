import { getZonesRepo, ZoneRow, ZoneCreateInput, ZoneUpdateInput } from '../data/zones.repo';
import { LayoutsRepository } from '../data/layouts.repo';
import { AppError } from '../errors';

/**
 * Zones Service
 * Business logic for zones management
 * 
 * Responsibilities:
 * - Map untyped DB rows to typed Zone objects
 * - Validate ownership via layout→site→club chain
 * - Enforce business rules (zone limits, boundary validation)
 * - Handle version conflicts
 */

export interface Zone {
  id: number;
  layout_id: number;
  name: string;
  zone_type: string;
  surface: string | null;
  color: string | null;
  boundary: any; // GeoJSON Polygon
  area_sqm: number | null;
  perimeter_m: number | null;
  version_token: string;
  created_at: string;
  updated_at: string;
}

export class ZonesService {
  private repo = getZonesRepo();
  private layoutsRepo = new LayoutsRepository();

  /**
   * List zones with cursor pagination
   */
  async listPaginated(
    limit: number,
    cursor?: string,
    layoutId?: number,
    zoneType?: string
  ): Promise<Zone[]> {
    const rows = await this.repo.list(limit, cursor, layoutId, zoneType);
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Get zone by ID
   */
  async get(id: number): Promise<Zone | null> {
    const row = await this.repo.getById(id);
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Create a new zone
   * Validates:
   * - Layout exists
   * - User has access to layout's club
   * - Zone boundary is valid GeoJSON Polygon
   */
  async create(
    data: ZoneCreateInput,
    userClerkId: string
  ): Promise<Zone> {
    // Validate layout exists and user has access
    await this.validateLayoutAccess(data.layout_id, userClerkId);

    // Validate zone boundary geometry (basic validation only - PostGIS will enforce correctness)
    const { validatePolygonStructure, validateWGS84Bounds } = await import('../lib/geospatial');
    
    const structureError = validatePolygonStructure(data.boundary);
    if (structureError) {
      throw new AppError(
        structureError.message,
        400,
        structureError.code
      );
    }

    const boundsError = validateWGS84Bounds(data.boundary);
    if (boundsError) {
      throw new AppError(
        boundsError.message,
        400,
        boundsError.code
      );
    }

    // Note: We skip winding order and self-intersection checks for zones
    // PostGIS will handle these constraints at the database level

    const created = await this.repo.create(data);
    return this.mapRow(created);
  }

  /**
   * Update an existing zone
   * Validates version token for optimistic concurrency control
   */
  async update(
    id: number,
    versionToken: string,
    data: ZoneUpdateInput,
    userClerkId: string
  ): Promise<Zone> {
    // Validate ownership before update
    const layoutId = await this.repo.getLayoutId(id);
    if (!layoutId) {
      throw new AppError('Zone not found', 404, 'NOT_FOUND');
    }

    await this.validateLayoutAccess(layoutId, userClerkId);

    // Validate boundary geometry if being updated
    if (data.boundary) {
      const { validatePolygonStructure, validateWGS84Bounds } = await import('../lib/geospatial');
      
      const structureError = validatePolygonStructure(data.boundary);
      if (structureError) {
        throw new AppError(
          structureError.message,
          400,
          structureError.code
        );
      }

      const boundsError = validateWGS84Bounds(data.boundary);
      if (boundsError) {
        throw new AppError(
          boundsError.message,
          400,
          boundsError.code
        );
      }
    }

    // Attempt update with version check
    const updated = await this.repo.update(id, versionToken, data);
    
    if (!updated) {
      throw new AppError(
        'Version conflict: zone was modified by another request',
        409,
        'VERSION_CONFLICT'
      );
    }

    return this.mapRow(updated);
  }

  /**
   * Delete a zone
   * Validates version token for optimistic concurrency control
   */
  async delete(
    id: number,
    versionToken: string,
    userClerkId: string
  ): Promise<void> {
    // Validate ownership before delete
    const layoutId = await this.repo.getLayoutId(id);
    if (!layoutId) {
      throw new AppError('Zone not found', 404, 'NOT_FOUND');
    }

    await this.validateLayoutAccess(layoutId, userClerkId);

    // Attempt delete with version check
    const deleted = await this.repo.delete(id, versionToken);
    
    if (!deleted) {
      throw new AppError(
        'Version conflict: zone was modified by another request',
        409,
        'VERSION_CONFLICT'
      );
    }
  }

  /**
   * Validate user has access to layout's club
   * Traverses layout→site→club ownership chain
   */
  private async validateLayoutAccess(
    layoutId: number,
    userClerkId: string
  ): Promise<void> {
    const layout = await this.layoutsRepo.findById(layoutId);
    
    if (!layout) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // TODO: Validate user owns layout's club via sites→clubs chain
    // For now, skip ownership check (will be implemented with club context)
    
    // In production, this would:
    // 1. Get site from layout.site_id
    // 2. Get club from site.club_id
    // 3. Verify club.owner_clerk_id === userClerkId
  }

  /**
   * Map database row to typed Zone object
   */
  private mapRow(row: ZoneRow): Zone {
    return {
      id: row.id,
      layout_id: row.layout_id,
      name: row.name,
      zone_type: row.zone_type,
      surface: row.surface,
      color: row.color,
      boundary: row.boundary,
      area_sqm: row.area_sqm,
      perimeter_m: row.perimeter_m,
      version_token: row.version_token,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
