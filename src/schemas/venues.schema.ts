import { z } from 'zod';

export const VenueSchema = z.object({
  id: z.number().optional(),
  club_id: z.number().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  center_point: z.any().optional(),
  bbox: z.any().optional(),
  tz: z.string().optional(),
  published: z.boolean().optional(),
  version_token: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const VenueCreateSchema = z.object({
  club_id: z.number().int().positive('club_id must be a positive integer'),
  name: z.string().min(1, 'name is required').max(255, 'name must be <= 255 chars'),
  address: z.string().max(500, 'address must be <= 500 chars').optional(),
  center_point: z.any().optional(),
  bbox: z.any().optional(),
  tz: z.string().max(50, 'tz must be <= 50 chars').optional(),
  published: z.boolean().default(false),
});

export const VenuesListResponseSchema = z.object({ data: z.array(VenueSchema) });

export type Venue = z.infer<typeof VenueSchema>;
export type VenueCreate = z.infer<typeof VenueCreateSchema>;
