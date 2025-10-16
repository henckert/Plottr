import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.number().optional(),
  team_id: z.number().optional(),
  venue_id: z.number().optional(),
  pitch_id: z.number().optional().nullable(),
  segment_id: z.number().optional().nullable(),
  start_ts: z.string().optional(),
  end_ts: z.string().optional(),
  notes: z.string().optional(),
  share_token: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SessionCreateSchema = z.object({
  venue_id: z.number().int().positive('venue_id must be a positive integer'),
  pitch_id: z.number().int().positive('pitch_id must be a positive integer').optional().nullable(),
  team_id: z.number().int().optional(),
  segment_id: z.number().int().optional().nullable(),
  start_ts: z.string().datetime('start_ts must be ISO datetime').optional(),
  end_ts: z.string().datetime('end_ts must be ISO datetime').optional(),
  notes: z.string().max(1000, 'notes must be <= 1000 chars').optional(),
  share_token: z.string().max(255, 'share_token must be <= 255 chars').optional(),
});

export const SessionsListResponseSchema = z.object({ data: z.array(SessionSchema) });

export type Session = z.infer<typeof SessionSchema>;
export type SessionCreate = z.infer<typeof SessionCreateSchema>;
