import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.number().optional(),
  venue_id: z.number().optional(),
  pitch_id: z.number().optional(),
  starts_at: z.string().optional(),
  metadata: z.any().optional(),
});

export const SessionsListResponseSchema = z.object({ data: z.array(SessionSchema) });

export type Session = z.infer<typeof SessionSchema>;
