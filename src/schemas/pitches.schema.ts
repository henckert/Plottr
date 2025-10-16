import { z } from 'zod';
import { validatePitchPolygon } from '../lib/geospatial';

// Zod schema for geometry validation: must be a valid GeoJSON Polygon
const GeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
}).refine(
  (geom) => {
    const error = validatePitchPolygon(geom);
    return !error; // Zod refine: true = valid, false = invalid
  },
  (geom) => {
    const error = validatePitchPolygon(geom);
    return {
      message: error?.message || 'Invalid polygon geometry',
    };
  }
);

export const PitchSchema = z.object({
  id: z.number().optional(),
  venue_id: z.number().optional(),
  name: z.string().optional(),
  code: z.string().optional().nullable(),
  sport: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  geometry: z.any().optional(),
  rotation_deg: z.number().optional().nullable(),
  template_id: z.string().optional().nullable(),
  status: z.string().optional(),
  version_token: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const PitchCreateSchema = z.object({
  venue_id: z.number().int().positive('venue_id must be a positive integer'),
  name: z.string().min(1, 'name is required').max(255, 'name must be <= 255 chars'),
  code: z.string().max(50, 'code must be <= 50 chars').optional(),
  sport: z.string().max(100, 'sport must be <= 100 chars').optional(),
  level: z.string().max(100, 'level must be <= 100 chars').optional(),
  geometry: GeometrySchema.optional(),
  rotation_deg: z.number().optional(),
  template_id: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const PitchUpdateSchema = z.object({
  name: z.string().min(1, 'name is required').max(255, 'name must be <= 255 chars').optional(),
  code: z.string().max(50, 'code must be <= 50 chars').optional(),
  sport: z.string().max(100, 'sport must be <= 100 chars').optional(),
  level: z.string().max(100, 'level must be <= 100 chars').optional(),
  geometry: GeometrySchema.optional(),
  rotation_deg: z.number().optional(),
  template_id: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export const PitchesListResponseSchema = z.object({ data: z.array(PitchSchema) });

export type Pitch = z.infer<typeof PitchSchema>;
export type PitchCreate = z.infer<typeof PitchCreateSchema>;
export type PitchUpdate = z.infer<typeof PitchUpdateSchema>;
