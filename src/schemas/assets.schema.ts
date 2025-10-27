import { z } from 'zod';

// GeoJSON schemas for POINT and LINESTRING
const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [lon, lat]
});

const GeoJSONLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

const AssetGeometrySchema = z.union([
  GeoJSONPointSchema,
  GeoJSONLineStringSchema,
]);

// Asset type enum (14 common types)
export const AssetTypeSchema = z.enum([
  'goal',
  'bench',
  'light',
  'cone',
  'flag',
  'marker',
  'tree',
  'fence',
  'net',
  'scoreboard',
  'water_fountain',
  'trash_bin',
  'camera',
  'other',
]);

// FontAwesome icon validation
export const AssetIconSchema = z.enum([
  'fa-futbol',
  'fa-basketball',
  'fa-volleyball',
  'fa-baseball',
  'fa-flag',
  'fa-bullseye',
  'fa-chair',
  'fa-lightbulb',
  'fa-tree',
  'fa-cone-striped',
  'fa-water',
  'fa-dumpster',
  'fa-square-parking',
  'fa-restroom',
  'fa-kit-medical',
  'fa-camera',
  'fa-wifi',
  'fa-phone',
  'fa-door-open',
  'fa-fence',
]);

// Full asset schema
export const AssetSchema = z.object({
  id: z.number(),
  layout_id: z.number(),
  zone_id: z.number().nullable().optional(),
  name: z.string().min(1).max(100),
  asset_type: AssetTypeSchema,
  icon: AssetIconSchema.nullable().optional(),
  geometry: AssetGeometrySchema.nullable().optional(),
  rotation_deg: z.number().min(0).max(360).nullable().optional(),
  properties: z.record(z.any()).nullable().optional(),
  version_token: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Create schema (no id, timestamps, version_token)
export const AssetCreateSchema = z.object({
  layout_id: z.number().int().positive(),
  zone_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(100).trim(),
  asset_type: AssetTypeSchema,
  icon: AssetIconSchema.nullable().optional(),
  geometry: AssetGeometrySchema.nullable().optional(),
  rotation_deg: z.number().min(0).max(360).nullable().optional(),
  properties: z.record(z.any()).nullable().optional(),
});

// Update schema (all fields optional)
export const AssetUpdateSchema = z.object({
  zone_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  asset_type: AssetTypeSchema.optional(),
  icon: AssetIconSchema.nullable().optional(),
  geometry: AssetGeometrySchema.nullable().optional(),
  rotation_deg: z.number().min(0).max(360).nullable().optional(),
  properties: z.record(z.any()).nullable().optional(),
});

// List response
export const AssetsListResponseSchema = z.object({
  data: z.array(AssetSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

// Export inferred types
export type Asset = z.infer<typeof AssetSchema>;
export type AssetCreate = z.infer<typeof AssetCreateSchema>;
export type AssetUpdate = z.infer<typeof AssetUpdateSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetIcon = z.infer<typeof AssetIconSchema>;
