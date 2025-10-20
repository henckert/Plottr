import { Knex } from 'knex';
import { getKnex } from './knex';
import { decodeCursor } from '../lib/pagination';

/**
 * Zones Repository
 * Raw SQL queries for zones table using Knex
 * 
 * Zones represent areas within a layout (pitches, goal areas, training zones, etc.)
 * Each zone has a PostGIS POLYGON boundary and belongs to a layout.
 * 
 * Features:
 * - Cursor-based pagination (no offset)
 * - Version tokens for optimistic locking
 * - PostGIS POLYGON for boundary geometry
 * - CASCADE delete on layout deletion
 * - Computed area_sqm and perimeter_m from PostGIS functions
 */

export interface ZoneRow {
  id: number;
  layout_id: number;
  name: string;
  zone_type: string;
  surface: string | null;
  color: string | null;
  boundary: any; // PostGIS geography (GeoJSON when selected)
  area_sqm: number | null;
  perimeter_m: number | null;
  version_token: string;
  created_at: Date;
  updated_at: Date;
}

export interface ZoneCreateInput {
  layout_id: number;
  name: string;
  zone_type: string;
  surface?: string | null;
  color?: string | null;
  boundary: any; // GeoJSON Polygon
}

export interface ZoneUpdateInput {
  name?: string;
  zone_type?: string;
  surface?: string | null;
  color?: string | null;
  boundary?: any; // GeoJSON Polygon
}

export class ZonesRepository {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getKnex();
  }

  /**
   * List zones with cursor pagination
   * @param limit - Number of records to fetch (+ 1 for has_more detection)
   * @param cursor - Base64 encoded cursor {id}:{updated_at}
   * @param layoutId - Filter by layout_id (optional)
   * @param zoneType - Filter by zone_type (optional)
   */
  async list(
    limit: number,
    cursor?: string,
    layoutId?: number,
    zoneType?: string
  ): Promise<ZoneRow[]> {
    const query = this.db('zones')
      .select(
        'id',
        'layout_id',
        'name',
        'zone_type',
        'surface',
        'color',
        'area_sqm',
        'perimeter_m',
        'version_token',
        'created_at',
        'updated_at'
      )
      .select(this.db.raw('ST_AsGeoJSON(boundary::geometry)::json as boundary'))
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit);

    // Apply layout_id filter
    if (layoutId !== undefined) {
      query.where('layout_id', layoutId);
    }

    // Apply zone_type filter
    if (zoneType) {
      query.where('zone_type', zoneType);
    }

    // Apply cursor filter
    if (cursor) {
      const { id, sortValue } = decodeCursor(cursor);
      query.where((q) => {
        q.where('updated_at', '<', sortValue).orWhere((q2) => {
          q2.where('updated_at', '=', sortValue).where('id', '<', id);
        });
      });
    }

    return query;
  }

  /**
   * Get zone by ID
   */
  async getById(id: number): Promise<ZoneRow | null> {
    const row = await this.db('zones')
      .select(
        'id',
        'layout_id',
        'name',
        'zone_type',
        'surface',
        'color',
        'area_sqm',
        'perimeter_m',
        'version_token',
        'created_at',
        'updated_at'
      )
      .select(this.db.raw('ST_AsGeoJSON(boundary::geometry)::json as boundary'))
      .where({ id })
      .first();

    return row || null;
  }

  /**
   * Create a new zone
   * Computes area_sqm and perimeter_m from PostGIS functions
   */
  async create(data: ZoneCreateInput): Promise<ZoneRow> {
    const [row] = await this.db('zones')
      .insert({
        layout_id: data.layout_id,
        name: data.name,
        zone_type: data.zone_type,
        surface: data.surface || null,
        color: data.color || null,
        boundary: this.db.raw(
          'ST_GeomFromGeoJSON(?)::geography',
          JSON.stringify(data.boundary)
        ),
        area_sqm: this.db.raw('ST_Area(ST_GeomFromGeoJSON(?::text)::geography)', JSON.stringify(data.boundary)),
        perimeter_m: this.db.raw('ST_Perimeter(ST_GeomFromGeoJSON(?::text)::geography)', JSON.stringify(data.boundary)),
        version_token: this.db.raw('gen_random_uuid()'),
      })
      .returning([
        'id',
        'layout_id',
        'name',
        'zone_type',
        'surface',
        'color',
        'area_sqm',
        'perimeter_m',
        'version_token',
        'created_at',
        'updated_at',
      ]);

    // Fetch with boundary GeoJSON
    const created = await this.getById(row.id);
    if (!created) throw new Error('Failed to create zone');
    return created;
  }

  /**
   * Update an existing zone with version check
   */
  async update(
    id: number,
    versionToken: string,
    data: ZoneUpdateInput
  ): Promise<ZoneRow | null> {
    const updateData: any = {
      version_token: this.db.raw('gen_random_uuid()'),
      updated_at: this.db.fn.now(),
    };

    // Only update provided fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.zone_type !== undefined) updateData.zone_type = data.zone_type;
    if (data.surface !== undefined) updateData.surface = data.surface;
    if (data.color !== undefined) updateData.color = data.color;
    
    // Update boundary and recompute area/perimeter
    if (data.boundary !== undefined) {
      updateData.boundary = this.db.raw(
        'ST_GeomFromGeoJSON(?)::geography',
        JSON.stringify(data.boundary)
      );
      updateData.area_sqm = this.db.raw(
        'ST_Area(ST_GeomFromGeoJSON(?::text)::geography)',
        JSON.stringify(data.boundary)
      );
      updateData.perimeter_m = this.db.raw(
        'ST_Perimeter(ST_GeomFromGeoJSON(?::text)::geography)',
        JSON.stringify(data.boundary)
      );
    }

    const updated = await this.db('zones')
      .where({ id, version_token: versionToken })
      .update(updateData)
      .returning('id');

    if (!updated || updated.length === 0) {
      return null; // Version mismatch or not found
    }

    return this.getById(id);
  }

  /**
   * Delete a zone with version check
   */
  async delete(id: number, versionToken: string): Promise<boolean> {
    const deleted = await this.db('zones')
      .where({ id, version_token: versionToken })
      .delete();

    return deleted > 0;
  }

  /**
   * Get layout_id for a zone (for ownership validation)
   */
  async getLayoutId(zoneId: number): Promise<number | null> {
    const row = await this.db('zones')
      .select('layout_id')
      .where({ id: zoneId })
      .first();

    return row ? row.layout_id : null;
  }

  /**
   * Count zones for a layout (for tier limit enforcement)
   */
  async countByLayout(layoutId: number): Promise<number> {
    const result = await this.db('zones')
      .where({ layout_id: layoutId })
      .count('id as count')
      .first();

    return result ? parseInt(result.count as string, 10) : 0;
  }
}

// Export singleton instance
let zonesRepo: ZonesRepository;

export function getZonesRepo(db?: Knex): ZonesRepository {
  if (!zonesRepo) {
    zonesRepo = new ZonesRepository(db);
  }
  return zonesRepo;
}
