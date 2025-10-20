/**
 * Zod validation schemas for Zones API
 * Defines input/output validation for zone management
 */

import { z } from 'zod';

/**
 * GeoJSON Polygon schema
 * Validates PostGIS POLYGON geometry for zone boundaries
 * 
 * Enforces:
 * - Valid Polygon structure with coordinates array
 * - At least one ring (exterior)
 * - Each ring has minimum 4 points (3 unique + 1 closing)
 * - WGS84 coordinate bounds: longitude [-180, 180], latitude [-90, 90]
 * - Ring closure (first point = last point) validated in service layer
 */
const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(
      z.tuple([z.number(), z.number()]) // [longitude, latitude]
    ).min(4, 'Polygon ring must have at least 4 points (3 unique + 1 closing)')
  ).min(1, 'Polygon must have at least one ring (exterior)'),
}).refine(
  (data) => {
    // Validate WGS84 bounds for all coordinates
    for (const ring of data.coordinates) {
      for (const [lon, lat] of ring) {
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: 'All coordinates must be within WGS84 bounds: longitude [-180, 180], latitude [-90, 90]',
  }
).refine(
  (data) => {
    // Validate ring closure (first point = last point)
    for (const ring of data.coordinates) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Polygon rings must be closed (first point must equal last point)',
  }
);

/**
 * Zone response schema
 * Represents a zone in API responses
 */
export const ZoneResponseSchema = z.object({
  id: z.number().int().positive(),
  layout_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  zone_type: z.string().min(1).max(50),
  surface: z.string().max(50).nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(), // Hex color format
  boundary: GeoJSONPolygonSchema,
  area_sqm: z.number().nullable(),
  perimeter_m: z.number().nullable(),
  version_token: z.string(),
  created_at: z.union([z.string().datetime(), z.date()]).transform((val) =>
    val instanceof Date ? val.toISOString() : val
  ),
  updated_at: z.union([z.string().datetime(), z.date()]).transform((val) =>
    val instanceof Date ? val.toISOString() : val
  ),
});

/**
 * Zone creation input schema
 * Validates all fields for POST /api/zones
 */
export const ZoneCreateSchema = z.object({
  layout_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  zone_type: z.enum([
    'pitch',
    'goal_area',
    'penalty_area',
    'training_zone',
    'competition',
    'parking',
    'seating',
    'entrance',
    'exit',
    'restroom',
    'concession',
    'vendor',
    'medical',
    'equipment',
    'other',
  ]),
  surface: z.enum(['grass', 'turf', 'clay', 'concrete', 'asphalt', 'gravel', 'other']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #22c55e)').optional(),
  boundary: GeoJSONPolygonSchema,
});

/**
 * Zone update input schema
 * Validates partial updates for PUT /api/zones/:id
 * All fields optional (partial update)
 */
export const ZoneUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  zone_type: z.enum([
    'pitch',
    'goal_area',
    'penalty_area',
    'training_zone',
    'competition',
    'parking',
    'seating',
    'entrance',
    'exit',
    'restroom',
    'concession',
    'vendor',
    'medical',
    'equipment',
    'other',
  ]).optional(),
  surface: z.enum(['grass', 'turf', 'clay', 'concrete', 'asphalt', 'gravel', 'other']).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').nullable().optional(),
  boundary: GeoJSONPolygonSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

/**
 * Paginated zones list response schema
 * Used for GET /api/zones?layout_id=X responses
 */
export const ZonesListResponseSchema = z.object({
  data: z.array(ZoneResponseSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

// Export inferred TypeScript types
export type ZoneResponse = z.infer<typeof ZoneResponseSchema>;
export type ZoneCreate = z.infer<typeof ZoneCreateSchema>;
export type ZoneUpdate = z.infer<typeof ZoneUpdateSchema>;
export type ZonesListResponse = z.infer<typeof ZonesListResponseSchema>;
