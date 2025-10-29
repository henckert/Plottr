import { z } from 'zod';

/**
 * Share Link Zod Schemas
 * Validation schemas for share links API endpoints
 */

// ===========================
// Request Schemas
// ===========================

/**
 * Schema for creating a new share link
 * POST /api/share-links
 */
export const ShareLinkCreateSchema = z.object({
  layout_id: z.number().int().positive(),
  expires_at: z.string().datetime().optional().nullable(),
});

export type ShareLinkCreate = z.infer<typeof ShareLinkCreateSchema>;

/**
 * Schema for updating a share link (typically expiration)
 * PUT /api/share-links/:id
 */
export const ShareLinkUpdateSchema = z.object({
  expires_at: z.string().datetime().optional().nullable(),
});

export type ShareLinkUpdate = z.infer<typeof ShareLinkUpdateSchema>;

/**
 * Query parameters for listing share links
 * GET /api/share-links
 */
export const ShareLinkListQuerySchema = z.object({
  layout_id: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  expired: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  cursor: z.string().optional(),
});

export type ShareLinkListQuery = z.infer<typeof ShareLinkListQuerySchema>;

// ===========================
// Response Schemas
// ===========================

/**
 * Share link response schema
 * Matches ShareLink interface from service layer
 */
export const ShareLinkSchema = z.object({
  id: z.number().int(),
  layout_id: z.number().int(),
  slug: z.string().length(10),
  expires_at: z.string().datetime().nullable(),
  view_count: z.number().int().nonnegative(),
  last_accessed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ShareLink = z.infer<typeof ShareLinkSchema>;

/**
 * Paginated share links response
 * GET /api/share-links
 */
export const ShareLinksListResponseSchema = z.object({
  data: z.array(ShareLinkSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

export type ShareLinksListResponse = z.infer<typeof ShareLinksListResponseSchema>;

/**
 * Single share link response
 * POST /api/share-links, GET /api/share-links/:id
 */
export const ShareLinkResponseSchema = z.object({
  data: ShareLinkSchema,
});

export type ShareLinkResponse = z.infer<typeof ShareLinkResponseSchema>;

/**
 * Public share view response
 * GET /share/:slug
 * 
 * Returns layout with zones and assets (no auth required)
 */
export const PublicShareViewSchema = z.object({
  layout: z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    is_published: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
  zones: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      zone_type: z.string(),
      geometry: z.any(), // GeoJSON
      color: z.string().nullable(),
      surface: z.string().nullable(),
      notes: z.string().nullable(),
      area_sqm: z.number().nullable(),
      perimeter_m: z.number().nullable(),
    })
  ),
  assets: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      asset_type: z.string(),
      geometry: z.any(), // GeoJSON
      icon: z.string().nullable(),
      rotation_deg: z.number().nullable(),
      properties: z.record(z.any()).nullable(),
    })
  ),
  share_link: ShareLinkSchema,
});

export type PublicShareView = z.infer<typeof PublicShareViewSchema>;
