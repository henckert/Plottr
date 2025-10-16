import { z } from 'zod';

export const TemplateSchema = z.object({
  id: z.number(),
  template_id: z.string(),
  name: z.string(),
  meta: z.any().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const TemplatesListResponse = z.object({
  data: z.array(TemplateSchema),
});

export type Template = z.infer<typeof TemplateSchema>;
export type TemplatesList = z.infer<typeof TemplatesListResponse>;
