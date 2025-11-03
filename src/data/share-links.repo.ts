import crypto from 'crypto';
import { getKnex } from './knex';
import { decodeCursor } from '@/lib/pagination';

export interface ShareLinkRow {
  id: number;
  layout_id: number;
  slug: string;
  expires_at: string | null;
  view_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareLinkFilters {
  layout_id?: number;
  slug?: string;
  expired?: boolean; // Filter by expired status
}

export interface CreateShareLinkInput {
  layout_id: number;
  slug: string;
  expires_at?: string | null;
  created_by?: string | null; // Clerk user ID (optional)
}

export interface UpdateShareLinkInput {
  expires_at?: string | null;
}

/**
 * Generate a unique slug (8-12 alphanumeric characters).
 * Uses crypto.randomBytes for security.
 * Retries if slug already exists (rare collision).
 */
export async function generateUniqueSlug(length = 10): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let slug = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      slug += chars[randomBytes[i] % chars.length];
    }

    // Check uniqueness
    const existing = await getBySlug(slug);
    if (!existing) {
      return slug;
    }
  }

  throw new Error('Failed to generate unique slug after 5 attempts');
}

/**
 * Create a new share link.
 */
export async function create(data: CreateShareLinkInput): Promise<ShareLinkRow> {
  const knex = getKnex();

  const [row] = await knex('share_links')
    .insert({
      layout_id: data.layout_id,
      slug: data.slug,
      expires_at: data.expires_at || null,
      created_by: data.created_by || null,
      view_count: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning('*');

  return row;
}

/**
 * Get share link by slug (public access).
 * Returns null if not found or expired.
 */
export async function getBySlug(slug: string): Promise<ShareLinkRow | null> {
  const knex = getKnex();

  const row = await knex('share_links')
    .where('slug', slug)
    .first();

  if (!row) return null;

  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null; // Expired
  }

  return row;
}

/**
 * Get share link by ID (for owner access).
 */
export async function getById(id: number): Promise<ShareLinkRow | null> {
  const knex = getKnex();

  const row = await knex('share_links')
    .where('id', id)
    .first();

  return row || null;
}

/**
 * List share links with filters and pagination.
 */
export async function list(
  filters: ShareLinkFilters,
  limit: number,
  cursor?: string
): Promise<ShareLinkRow[]> {
  const knex = getKnex();
  let query = knex('share_links')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(limit);

  // Apply filters
  if (filters.layout_id) {
    query = query.where('layout_id', filters.layout_id);
  }

  if (filters.slug) {
    query = query.where('slug', filters.slug);
  }

  if (filters.expired === true) {
    // Only expired links
    query = query.whereNotNull('expires_at').where('expires_at', '<', knex.fn.now());
  } else if (filters.expired === false) {
    // Only active links (not expired or no expiration)
    query = query.where((qb) => {
      qb.whereNull('expires_at').orWhere('expires_at', '>=', knex.fn.now());
    });
  }

  // Apply cursor pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    // Use proper cursor pagination: created_at < cursor_value OR (created_at = cursor_value AND id < cursor_id)
    // Since we're ordering by created_at DESC, we want rows BEFORE the cursor
    query = query.where((qb) => {
      qb.where('created_at', '<', decoded.sortValue)
        .orWhere((qb2) => {
          qb2.where('created_at', '=', decoded.sortValue).where('id', '<', decoded.id);
        });
    });
  }

  return await query;
}

/**
 * Update share link (typically to change expiration).
 */
export async function update(id: number, data: UpdateShareLinkInput): Promise<ShareLinkRow> {
  const knex = getKnex();

  const [row] = await knex('share_links')
    .where('id', id)
    .update({
      ...data,
      updated_at: knex.fn.now(),
    })
    .returning('*');

  if (!row) {
    throw new Error(`Share link ${id} not found`);
  }

  return row;
}

/**
 * Delete share link (revoke access).
 */
export async function deleteById(id: number): Promise<void> {
  const knex = getKnex();

  const deleted = await knex('share_links')
    .where('id', id)
    .delete();

  if (deleted === 0) {
    throw new Error(`Share link ${id} not found`);
  }
}

/**
 * Increment view count and update last accessed timestamp.
 * Called when share link is accessed publicly.
 */
export async function incrementViewCount(slug: string): Promise<void> {
  const knex = getKnex();

  await knex('share_links')
    .where('slug', slug)
    .increment('view_count', 1)
    .update({
      last_accessed_at: knex.fn.now(),
    });
}

/**
 * Delete expired share links (cleanup job).
 */
export async function deleteExpired(): Promise<number> {
  const knex = getKnex();

  const deleted = await knex('share_links')
    .whereNotNull('expires_at')
    .where('expires_at', '<', knex.fn.now())
    .delete();

  return deleted;
}
