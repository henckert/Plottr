import { z } from 'zod';

export const VenueSchema = z.object({
  id: z.number().optional(),
  club_id: z.number().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  center_point: z.any().optional(),
  bbox: z.any().optional(),
  tz: z.string().optional(),
  visibility: z.string().optional(),
  published_at: z.string().optional(),
});

export const VenuesListResponseSchema = z.object({ data: z.array(VenueSchema) });

export type Venue = z.infer<typeof VenueSchema>;
