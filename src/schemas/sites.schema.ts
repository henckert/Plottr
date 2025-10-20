/**
 * Zod validation schemas for Sites API
 * Defines input/output validation with GeoJSON support
 */

import { z } from 'zod';

/**
 * GeoJSON Point schema
 * Validates WGS84 coordinates: longitude [-180, 180], latitude [-90, 90]
 */
export const GeoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

/**
 * GeoJSON Polygon schema
 * Validates:
 * - Polygon structure (array of rings, each ring is array of coordinate pairs)
 * - Minimum 4 points per ring (3 unique + 1 closing point)
 * - Closed ring (first point equals last point)
 * - WGS84 coordinate bounds
 */
export const GeoPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(
      z.tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90),   // latitude
      ])
    ).min(4) // At least 4 points (3 unique + 1 closing)
  ).min(1), // At least one ring (exterior)
}).refine(
  (polygon) => {
    // Validate that each ring is closed (first point === last point)
    return polygon.coordinates.every((ring) => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    });
  },
  {
    message: 'Polygon rings must be closed (first point must equal last point)',
  }
);

/**
 * Site creation input schema
 * Validates all fields for POST /api/sites
 */
export const SiteCreateSchema = z.object({
  club_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  location: GeoPointSchema.optional(),
  bbox: GeoPolygonSchema.optional(),
});

/**
 * Site update input schema
 * Validates partial updates for PUT /api/sites/:id
 * All fields optional except club_id (cannot change club ownership)
 */
export const SiteUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  location: GeoPointSchema.optional(),
  bbox: GeoPolygonSchema.optional(),
}).strict(); // Reject unknown fields

/**
 * Site response schema
 * Validates output from GET /api/sites/:id
 */
export const SiteResponseSchema = z.object({
  id: z.number().int().positive(),
  club_id: z.number().int().positive(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
  location: GeoPointSchema.nullable(),
  bbox: GeoPolygonSchema.nullable(),
  version_token: z.string().uuid(),
  created_at: z.union([z.string().datetime(), z.date()]).transform(val => 
    val instanceof Date ? val.toISOString() : val
  ),
  updated_at: z.union([z.string().datetime(), z.date()]).transform(val => 
    val instanceof Date ? val.toISOString() : val
  ),
  deleted_at: z.union([z.string().datetime(), z.date()]).transform(val => 
    val instanceof Date ? val.toISOString() : val
  ).nullable(),
});

/**
 * Paginated sites list response schema
 * Validates output from GET /api/sites?cursor=...&limit=...
 */
export const SitesListResponseSchema = z.object({
  data: z.array(SiteResponseSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

/**
 * Exported TypeScript types (inferred from schemas)
 */
export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type GeoPolygon = z.infer<typeof GeoPolygonSchema>;
export type SiteCreate = z.infer<typeof SiteCreateSchema>;
export type SiteUpdate = z.infer<typeof SiteUpdateSchema>;
export type SiteResponse = z.infer<typeof SiteResponseSchema>;
export type SitesListResponse = z.infer<typeof SitesListResponseSchema>;
