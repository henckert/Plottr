import { z } from 'zod';

// Search query validation
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query must be less than 200 characters')
    .trim(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0.1).max(500).optional(), // km
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Location result validation
export const locationSchema = z.object({
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  type: z.enum(['address', 'poi', 'building']),
  tier_required: z.enum(['free', 'paid', 'admin']).optional(),
});

export type Location = z.infer<typeof locationSchema>;

// Search results response
export const searchResponseSchema = z.object({
  results: z.array(locationSchema),
  cached: z.boolean(),
  timestamp: z.string().datetime(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

// Reverse geocoding response
export const reverseGeocodeSchema = z.object({
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  type: z.enum(['address', 'poi', 'building']),
  cached: z.boolean(),
});

export type ReverseGeocodeResult = z.infer<typeof reverseGeocodeSchema>;

// Validate search query
export const validateSearchQuery = (
  query: unknown
): { valid: boolean; data?: SearchQuery; error?: string } => {
  try {
    const data = searchQuerySchema.parse(query);
    return { valid: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        error: err.errors[0]?.message || 'Invalid search query',
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
};

// Validate latitude/longitude
export const validateCoordinates = (
  lat: unknown,
  lon: unknown
): { valid: boolean; error?: string } => {
  try {
    z.number().min(-90).max(90).parse(lat);
    z.number().min(-180).max(180).parse(lon);
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        error: err.errors[0]?.message || 'Invalid coordinates',
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
};
