/**
 * Boundaries Data Repository
 * 
 * Handles all database operations for imported boundaries:
 * - Save imported geometries
 * - Retrieve user's boundaries
 * - Track usage (count per month)
 * - Delete boundaries
 * - Query with spatial indexes
 */

import { getKnex } from './knex';
import { toGeometryJson } from '../lib/geojson';

export interface BoundaryRow {
  id: number;
  user_id: string;
  file_name?: string;
  file_mime_type?: string;
  geometry: any; // PostGIS geometry type
  area_m2: number;
  bbox: [number, number, number, number];
  is_valid: boolean;
  validation_errors?: string;
  warnings?: string[];
  imported_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBoundaryPayload {
  user_id: string;
  file_name: string;
  file_mime_type: string;
  geometry: string; // WKT format or GeoJSON
  area_m2: number;
  bbox: [number, number, number, number];
  is_valid: boolean;
  validation_errors?: string;
  warnings?: string[];
}

export class BoundariesRepo {
  private knex = getKnex();

  /**
   * Save a newly imported boundary
   */
  async create(payload: CreateBoundaryPayload): Promise<BoundaryRow> {
    // Normalize any GeoJSON input (FeatureCollection, Feature, or Geometry) to pure Geometry JSON
    const geomJson = toGeometryJson(payload.geometry);
    
    const result = await this.knex('boundaries')
      .insert({
        user_id: payload.user_id,
        file_name: payload.file_name,
        file_mime_type: payload.file_mime_type,
        // Use normalized Geometry JSON with PostGIS conversion
        geometry: this.knex.raw(
          'ST_GeomFromGeoJSON(?)::geometry(Polygon,4326)',
          [geomJson]
        ),
        area_m2: payload.area_m2,
        bbox: JSON.stringify(payload.bbox),
        is_valid: payload.is_valid,
        validation_errors: payload.validation_errors,
        warnings: payload.warnings ? JSON.stringify(payload.warnings) : null,
        imported_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.formatBoundary(result[0]);
  }

  /**
   * Get a boundary by ID
   */
  async getById(id: number): Promise<BoundaryRow | null> {
    const result = await this.knex('boundaries')
      .select('*')
      .where({ id })
      .first();

    return result ? this.formatBoundary(result) : null;
  }

  /**
   * List user's boundaries with pagination
   */
  async listByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ boundaries: BoundaryRow[]; total: number }> {
    const [rows, countResult] = await Promise.all([
      this.knex('boundaries')
        .select('*')
        .where({ user_id: userId })
        .orderBy('imported_at', 'desc')
        .limit(limit)
        .offset(offset),
      this.knex('boundaries')
        .count('* as count')
        .where({ user_id: userId })
        .first(),
    ]);

    return {
      boundaries: rows.map((r: any) => this.formatBoundary(r)),
      total: Number(countResult?.count) || 0,
    };
  }

  /**
   * Count boundaries imported by user in current month
   * Used for tier-based usage limits
   */
  async countCurrentMonth(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.knex('boundaries')
      .count('* as count')
      .where({ user_id: userId })
      .whereRaw('imported_at >= ?', [startOfMonth])
      .first();

    return Number(result?.count) || 0;
  }

  /**
   * Find geometries within a bounding box (for spatial queries)
   */
  async findNearby(
    bbox: [number, number, number, number],
    userId?: string
  ): Promise<BoundaryRow[]> {
    const [minLng, minLat, maxLng, maxLat] = bbox;

    let query = this.knex('boundaries')
      .select('*')
      .whereRaw(
        `geometry && ST_MakeEnvelope(?, ?, ?, ?, 4326)`,
        [minLng, minLat, maxLng, maxLat]
      );

    if (userId) {
      query = query.where({ user_id: userId });
    }

    const results = await query.orderBy('imported_at', 'desc');
    return results.map((r: any) => this.formatBoundary(r));
  }

  /**
   * Delete a boundary (soft delete or hard delete)
   */
  async delete(id: number, userId: string): Promise<boolean> {
    const result = await this.knex('boundaries')
      .delete()
      .where({ id, user_id: userId });

    return result > 0;
  }

  /**
   * Format boundary row, parsing JSON fields
   */
  private formatBoundary(row: any): BoundaryRow {
    return {
      id: row.id,
      user_id: row.user_id,
      file_name: row.file_name,
      file_mime_type: row.file_mime_type,
      geometry: row.geometry,
      area_m2: Number(row.area_m2),
      bbox: Array.isArray(row.bbox) ? row.bbox : JSON.parse(row.bbox),
      is_valid: row.is_valid,
      validation_errors: row.validation_errors,
      warnings: row.warnings
        ? Array.isArray(row.warnings)
          ? row.warnings
          : JSON.parse(row.warnings)
        : undefined,
      imported_at: new Date(row.imported_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export default BoundariesRepo;
