/**
 * Zod validation schemas for Layouts API
 * Defines input/output validation for layout management
 */

import { z } from 'zod';

/**
 * Layout response schema
 * Represents a layout in API responses
 */
export const LayoutResponseSchema = z.object({
  id: z.number().int().positive(),
  site_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  is_published: z.boolean(),
  version_token: z.string().uuid(),
  created_by: z.string().min(1).max(100), // Clerk user ID
  created_at: z.union([z.string().datetime(), z.date()]).transform((val) =>
    val instanceof Date ? val.toISOString() : val
  ),
  updated_at: z.union([z.string().datetime(), z.date()]).transform((val) =>
    val instanceof Date ? val.toISOString() : val
  ),
});

/**
 * Layout creation input schema
 * Validates all fields for POST /api/layouts
 */
export const LayoutCreateSchema = z.object({
  site_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  is_published: z.boolean().optional().default(false),
});

/**
 * Layout update input schema
 * Validates partial updates for PUT /api/layouts/:id
 * All fields optional (partial update)
 */
export const LayoutUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  is_published: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

/**
 * Paginated layouts list response schema
 * Used for GET /api/layouts?site_id=X responses
 */
export const LayoutsListResponseSchema = z.object({
  data: z.array(LayoutResponseSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

// Export inferred TypeScript types
export type LayoutResponse = z.infer<typeof LayoutResponseSchema>;
export type LayoutCreate = z.infer<typeof LayoutCreateSchema>;
export type LayoutUpdate = z.infer<typeof LayoutUpdateSchema>;
export type LayoutsListResponse = z.infer<typeof LayoutsListResponseSchema>;
