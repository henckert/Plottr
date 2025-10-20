/**
 * Layouts Service
 * 
 * Business logic layer for layout management.
 * Enforces ownership validation (layouts belong to sites owned by user's club).
 * 
 * Key Features:
 * - Site ownership validation (layouts can only be created/modified for club's sites)
 * - Version token validation for optimistic concurrency
 * - Cursor-based pagination
 * - Creator tracking
 */

import { LayoutsRepository, Layout, LayoutCreateInput, LayoutUpdateInput } from '../data/layouts.repo';
import { SitesRepository } from '../data/sites.repo';
import { AppError } from '../errors';

export class LayoutsService {
  private repo: LayoutsRepository;
  private sitesRepo: SitesRepository;

  constructor() {
    this.repo = new LayoutsRepository();
    this.sitesRepo = new SitesRepository();
  }

  /**
   * Create a new layout
   * Validates that the site exists and belongs to the user's club
   */
  async create(data: LayoutCreateInput, clubId: number): Promise<Layout> {
    // Validate site exists
    const siteExists = await this.repo.siteExists(data.site_id);
    if (!siteExists) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }

    // Validate site belongs to the user's club
    const site = await this.sitesRepo.findById(data.site_id);
    if (!site || site.club_id !== clubId) {
      throw new AppError('Site does not belong to your club', 403, 'FORBIDDEN');
    }

    // Create the layout
    return this.repo.create(data);
  }

  /**
   * Get layout by ID
   * Validates that the layout's site belongs to the user's club
   */
  async get(id: number, clubId: number): Promise<Layout> {
    const layout = await this.repo.findById(id);
    if (!layout) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // Validate ownership via site's club_id
    const site = await this.sitesRepo.findById(layout.site_id);
    if (!site || site.club_id !== clubId) {
      throw new AppError('Layout does not belong to your club', 403, 'FORBIDDEN');
    }

    return layout;
  }

  /**
   * List layouts for a specific site (with cursor pagination)
   * Validates that the site belongs to the user's club
   */
  async listBySite(siteId: number, clubId: number, limit: number, cursor?: string): Promise<Layout[]> {
    // Validate site exists and belongs to club
    const site = await this.sitesRepo.findById(siteId);
    if (!site) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }
    if (site.club_id !== clubId) {
      throw new AppError('Site does not belong to your club', 403, 'FORBIDDEN');
    }

    // Fetch layouts with pagination
    return this.repo.findBySiteId(siteId, limit, cursor);
  }

  /**
   * Update layout by ID
   * Validates ownership and version token
   */
  async update(id: number, versionToken: string, data: LayoutUpdateInput, clubId: number): Promise<Layout> {
    // Check if layout exists first (return 404 before checking version)
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // Validate ownership via site's club_id
    const site = await this.sitesRepo.findById(existing.site_id);
    if (!site || site.club_id !== clubId) {
      throw new AppError('Layout does not belong to your club', 403, 'FORBIDDEN');
    }

    // Check version token (optimistic concurrency control)
    const isValid = await this.repo.checkVersionToken(id, versionToken);
    if (!isValid) {
      throw new AppError(
        'Version conflict: layout has been modified by another request',
        409,
        'VERSION_CONFLICT'
      );
    }

    // Perform update
    const updated = await this.repo.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update layout', 500, 'UPDATE_FAILED');
    }

    return updated;
  }

  /**
   * Delete layout by ID
   * Validates ownership and version token
   * Hard delete (cascades to zones, assets, etc.)
   */
  async delete(id: number, versionToken: string, clubId: number): Promise<void> {
    // Check if layout exists first (return 404 before checking version)
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // Validate ownership via site's club_id
    const site = await this.sitesRepo.findById(existing.site_id);
    if (!site || site.club_id !== clubId) {
      throw new AppError('Layout does not belong to your club', 403, 'FORBIDDEN');
    }

    // Check version token (optimistic concurrency control)
    const isValid = await this.repo.checkVersionToken(id, versionToken);
    if (!isValid) {
      throw new AppError(
        'Version conflict: layout has been modified by another request',
        409,
        'VERSION_CONFLICT'
      );
    }

    // Perform delete (hard delete, cascades to child tables)
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete layout', 500, 'DELETE_FAILED');
    }
  }

  /**
   * Get layouts count for a site
   * Validates site ownership
   */
  async countBySite(siteId: number, clubId: number): Promise<number> {
    // Validate site exists and belongs to club
    const site = await this.sitesRepo.findById(siteId);
    if (!site) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }
    if (site.club_id !== clubId) {
      throw new AppError('Site does not belong to your club', 403, 'FORBIDDEN');
    }

    return this.repo.countBySiteId(siteId);
  }
}
