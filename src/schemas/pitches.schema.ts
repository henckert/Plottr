import { z } from 'zod';

export const PitchSchema = z.object({
  id: z.number().optional(),
  venue_id: z.number().optional(),
  name: z.string().optional(),
  geometry: z.any().optional(),
  template_id: z.string().optional(),
});

export const PitchesListResponseSchema = z.object({ data: z.array(PitchSchema) });

export type Pitch = z.infer<typeof PitchSchema>;
