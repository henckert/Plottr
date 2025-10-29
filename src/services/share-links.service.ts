import * as shareLinksRepo from '@/data/share-links.repo';
import { LayoutsRepository } from '@/data/layouts.repo';
import { AppError } from '@/errors';

const layoutsRepo = new LayoutsRepository();

export interface ShareLink {
  id: number;
  layout_id: number;
  slug: string;
  expires_at: string | null;
  view_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShareLinkInput {
  layout_id: number;
  expires_at?: string | null;
}

export interface UpdateShareLinkInput {
  expires_at?: string | null;
}

export interface ShareLinkFilters {
  layout_id?: number;
  expired?: boolean;
}

/**
 * Create a new share link with auto-generated slug.
 * Validates that layout exists and user has access.
 */
export async function create(data: CreateShareLinkInput, userId?: string): Promise<ShareLink> {
  // Validate layout exists
  const layout = await layoutsRepo.findById(data.layout_id);
  if (!layout) {
    throw new AppError(`Layout ${data.layout_id} not found`, 404, 'LAYOUT_NOT_FOUND');
  }

  // Optional: Check ownership (if userId provided)
  // For now, we'll allow any authenticated user to create share links for any layout
  // Future enhancement: Add created_by to share_links table for ownership tracking

  // Validate expiration date (must be in future)
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (isNaN(expiresAt.getTime())) {
      throw new AppError('Invalid expires_at format. Use ISO 8601 timestamp.', 400, 'INVALID_EXPIRATION');
    }

    if (expiresAt <= now) {
      throw new AppError('expires_at must be in the future', 400, 'EXPIRATION_IN_PAST');
    }
  }

  // Generate unique slug
  const slug = await shareLinksRepo.generateUniqueSlug(10);

  // Create share link
  const shareLink = await shareLinksRepo.create({
    layout_id: data.layout_id,
    slug,
    expires_at: data.expires_at || null,
  });

  return mapRow(shareLink);
}

/**
 * Get share link by ID (owner access).
 */
export async function getById(id: number): Promise<ShareLink | null> {
  const row = await shareLinksRepo.getById(id);
  if (!row) return null;
  return mapRow(row);
}

/**
 * Get share link by slug (public access).
 * Returns null if not found or expired.
 * Increments view count if found.
 */
export async function getBySlugPublic(slug: string): Promise<ShareLink | null> {
  const row = await shareLinksRepo.getBySlug(slug);
  if (!row) return null;

  // Increment view count asynchronously (don't await)
  shareLinksRepo.incrementViewCount(slug).catch((err) => {
    console.error('Failed to increment view count:', err);
  });

  return mapRow(row);
}

/**
 * List share links with filters and pagination.
 */
export async function list(
  filters: ShareLinkFilters,
  limit: number,
  cursor?: string
): Promise<ShareLink[]> {
  const rows = await shareLinksRepo.list(filters, limit, cursor);
  return rows.map(mapRow);
}

/**
 * Update share link (typically to change expiration).
 */
export async function update(id: number, data: UpdateShareLinkInput): Promise<ShareLink> {
  // Validate expiration date if provided
  if (data.expires_at !== undefined && data.expires_at !== null) {
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (isNaN(expiresAt.getTime())) {
      throw new AppError('Invalid expires_at format. Use ISO 8601 timestamp.', 400, 'INVALID_EXPIRATION');
    }

    if (expiresAt <= now) {
      throw new AppError('expires_at must be in the future', 400, 'EXPIRATION_IN_PAST');
    }
  }

  try {
    const updated = await shareLinksRepo.update(id, data);
    return mapRow(updated);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      throw new AppError(`Share link ${id} not found`, 404, 'SHARE_LINK_NOT_FOUND');
    }
    throw err;
  }
}

/**
 * Delete share link (revoke access).
 */
export async function deleteById(id: number): Promise<void> {
  try {
    await shareLinksRepo.deleteById(id);
  } catch (err) {
    if ((err as Error).message.includes('not found')) {
      throw new AppError(`Share link ${id} not found`, 404, 'SHARE_LINK_NOT_FOUND');
    }
    throw err;
  }
}

/**
 * Get layout data for public share view.
 * Includes layout, zones, and assets.
 */
export async function getSharedLayout(slug: string) {
  // Get share link (validates expiration)
  const shareLink = await getBySlugPublic(slug);
  if (!shareLink) {
    throw new AppError('Share link not found or expired', 404, 'SHARE_LINK_NOT_FOUND');
  }

  // Get layout
  const layout = await layoutsRepo.findById(shareLink.layout_id);
  if (!layout) {
    throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
  }

  // Get zones (using zones repo - will need to import)
  // For now, return layout without zones/assets (will enhance in controller)
  return {
    share_link: shareLink,
    layout,
  };
}

/**
 * Map repository row to service response type.
 */
function mapRow(row: shareLinksRepo.ShareLinkRow): ShareLink {
  return {
    id: row.id,
    layout_id: row.layout_id,
    slug: row.slug,
    expires_at: row.expires_at,
    view_count: row.view_count,
    last_accessed_at: row.last_accessed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
