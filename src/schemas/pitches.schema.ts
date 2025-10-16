import { z } from 'zod';

export const PitchSchema = z.object({
  id: z.number().optional(),
  venue_id: z.number().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  sport: z.string().optional(),
  level: z.string().optional(),
  geometry: z.any().optional(),
  rotation_deg: z.number().optional(),
  template_id: z.string().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const PitchCreateSchema = z.object({
  venue_id: z.number().int().positive('venue_id must be a positive integer'),
  name: z.string().min(1, 'name is required').max(255, 'name must be <= 255 chars'),
  code: z.string().max(50, 'code must be <= 50 chars').optional(),
  sport: z.string().max(100, 'sport must be <= 100 chars').optional(),
  level: z.string().max(100, 'level must be <= 100 chars').optional(),
  geometry: z.any().optional(),
  rotation_deg: z.number().optional(),
  template_id: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const PitchesListResponseSchema = z.object({ data: z.array(PitchSchema) });

export type Pitch = z.infer<typeof PitchSchema>;
export type PitchCreate = z.infer<typeof PitchCreateSchema>;
