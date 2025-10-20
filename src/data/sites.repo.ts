/**
 * Sites Repository
 * Handles database operations for sites using raw Knex queries + PostGIS
 */

import { getKnex } from './knex';
import type { Knex } from 'knex';

// ===========================
// TypeScript Interfaces
// ===========================

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lon, lat], [lon, lat], ...]]
}

export interface SiteCreateInput {
  club_id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: GeoPoint; // Will be converted to PostGIS geography
  bbox?: GeoPolygon; // Will be converted to PostGIS geography
}

export interface SiteUpdateInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: GeoPoint;
  bbox?: GeoPolygon;
}

export interface Site {
  id: number;
  club_id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  location: GeoPoint | null;
  bbox: GeoPolygon | null;
  version_token: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ===========================
// Helper Functions
// ===========================

/**
 * Convert GeoJSON Point to PostGIS WKT string for ST_GeogFromText
 */
function pointToWKT(point: GeoPoint): string {
  const [lon, lat] = point.coordinates;
  return `POINT(${lon} ${lat})`;
}

/**
 * Convert GeoJSON Polygon to PostGIS WKT string for ST_GeogFromText
 */
function polygonToWKT(polygon: GeoPolygon): string {
  const rings = polygon.coordinates.map((ring) => {
    const coords = ring.map(([lon, lat]) => `${lon} ${lat}`).join(',');
    return `(${coords})`;
  }).join(',');
  return `POLYGON(${rings})`;
}

/**
 * Parse PostGIS geography column (Buffer or WKT string) to GeoJSON Point
 */
function parsePointGeography(geography: any): GeoPoint | null {
  if (!geography) return null;
  
  // PostGIS returns geography as Buffer in some drivers
  // We use ST_AsText to get WKT, then parse it
  // This function assumes the row was fetched with ST_AsText already applied
  if (typeof geography === 'string') {
    // Parse WKT: "POINT(lon lat)"
    const match = geography.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!match) return null;
    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    return {
      type: 'Point',
      coordinates: [lon, lat],
    };
  }
  
  return null;
}

/**
 * Parse PostGIS geography column to GeoJSON Polygon
 */
function parsePolygonGeography(geography: any): GeoPolygon | null {
  if (!geography) return null;
  
  if (typeof geography === 'string') {
    // Parse WKT: "POLYGON((lon lat, lon lat, ...))"
    const match = geography.match(/POLYGON\(\((.*?)\)\)/);
    if (!match) return null;
    
    const coords = match[1].split(',').map((pair) => {
      const [lon, lat] = pair.trim().split(/\s+/).map(parseFloat);
      return [lon, lat];
    });
    
    return {
      type: 'Polygon',
      coordinates: [coords],
    };
  }
  
  return null;
}

// ===========================
// Sites Repository
// ===========================

export class SitesRepository {
  /**
   * Create a new site with optional PostGIS location and bbox
   */
  async create(data: SiteCreateInput): Promise<Site> {
    const knex = getKnex();
    
    const insertData: any = {
      club_id: data.club_id,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postal_code: data.postal_code,
      version_token: knex.raw('gen_random_uuid()'),
    };
    
    // Convert GeoJSON location to PostGIS geography
    if (data.location) {
      const wkt = pointToWKT(data.location);
      insertData.location = knex.raw(`ST_GeogFromText('${wkt}')`);
    }
    
    // Convert GeoJSON bbox to PostGIS geography
    if (data.bbox) {
      const wkt = polygonToWKT(data.bbox);
      insertData.bbox = knex.raw(`ST_GeogFromText('${wkt}')`);
    }
    
    // Insert and get the ID
    const [inserted] = await knex('sites').insert(insertData).returning('id');
    
    // Fetch the complete row with geography columns as WKT
    const created = await this.findById(inserted.id);
    if (!created) {
      throw new Error('Failed to retrieve created site');
    }
    
    return created;
  }
  
  /**
   * Find site by ID (excludes soft-deleted)
   */
  async findById(id: number): Promise<Site | null> {
    const knex = getKnex();
    
    // Use ST_AsText to convert geography to WKT for parsing
    const row = await knex('sites')
      .select(
        'id',
        'club_id',
        'name',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        knex.raw('ST_AsText(location::geometry) as location_wkt'),
        knex.raw('ST_AsText(bbox::geometry) as bbox_wkt'),
        'version_token',
        'created_at',
        'updated_at',
        'deleted_at'
      )
      .where({ id })
      .whereNull('deleted_at')
      .first();
    
    return row ? this.mapRow(row) : null;
  }
  
  /**
   * Find sites by club_id with cursor-based pagination
   * Returns limit+1 records to detect if there are more pages
   */
  async findByClubId(clubId: number, limit: number, cursor?: string): Promise<Site[]> {
    const knex = getKnex();
    
    let query = knex('sites')
      .select(
        'id',
        'club_id',
        'name',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        knex.raw('ST_AsText(location::geometry) as location_wkt'),
        knex.raw('ST_AsText(bbox::geometry) as bbox_wkt'),
        'version_token',
        'created_at',
        'updated_at',
        'deleted_at'
      )
      .where({ club_id: clubId })
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit);
    
    // Apply cursor filtering if provided
    if (cursor) {
      // Use the centralized decodeCursor helper which handles timestamps with colons
      try {
        const { decodeCursor } = require('../lib/pagination');
        const { id: cursorId, sortValue: cursorUpdatedAt } = decodeCursor(cursor);
        
        query = query.where((qb) => {
          qb.where('updated_at', '<', cursorUpdatedAt)
            .orWhere((qb2) => {
              qb2.where('updated_at', '=', cursorUpdatedAt)
                .where('id', '<', cursorId);
            });
        });
      } catch (err) {
        // Invalid cursor - ignore and return from start
        console.warn('Invalid cursor format:', cursor, (err as Error).message);
      }
    }
    
    const rows = await query;
    return rows.map((row) => this.mapRow(row));
  }
  
  /**
   * Update site by ID
   */
  async update(id: number, data: SiteUpdateInput): Promise<Site | null> {
    const knex = getKnex();
    
    const updateData: any = {
      updated_at: knex.fn.now(),
      version_token: knex.raw('gen_random_uuid()'), // Generate new version token
    };
    
    // Only include fields that are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code;
    
    // Update PostGIS columns if provided
    if (data.location) {
      const wkt = pointToWKT(data.location);
      updateData.location = knex.raw(`ST_GeogFromText('${wkt}')`);
    }
    if (data.bbox) {
      const wkt = polygonToWKT(data.bbox);
      updateData.bbox = knex.raw(`ST_GeogFromText('${wkt}')`);
    }
    
    const count = await knex('sites')
      .where({ id })
      .whereNull('deleted_at')
      .update(updateData);
    
    if (count === 0) {
      return null;
    }
    
    // Fetch the updated row with geography columns as WKT
    return this.findById(id);
  }
  
  /**
   * Soft delete site by setting deleted_at timestamp
   */
  async softDelete(id: number): Promise<boolean> {
    const knex = getKnex();
    
    const count = await knex('sites')
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: knex.fn.now() });
    
    return count > 0;
  }
  
  /**
   * Check if version token matches (for optimistic concurrency control)
   */
  async checkVersionToken(id: number, token: string): Promise<boolean> {
    const knex = getKnex();
    
    const row = await knex('sites')
      .select('version_token')
      .where({ id })
      .whereNull('deleted_at')
      .first();
    
    return row?.version_token === token;
  }
  
  /**
   * Map database row to typed Site object
   * Handles PostGIS WKT to GeoJSON conversion
   */
  private mapRow(row: any): Site {
    // Parse PostGIS geography columns from WKT
    let location: GeoPoint | null = null;
    if (row.location_wkt) {
      const parsed = parsePointGeography(row.location_wkt);
      if (parsed) location = parsed;
    }

    let bbox: GeoPolygon | null = null;
    if (row.bbox_wkt) {
      const parsed = parsePolygonGeography(row.bbox_wkt);
      if (parsed) bbox = parsed;
    }

    const site: Site = {
      id: row.id,
      club_id: row.club_id,
      name: row.name,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      country: row.country || null,
      postal_code: row.postal_code || null,
      location,
      bbox,
      version_token: row.version_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || null,
    };
    
    return site;
  }
}
