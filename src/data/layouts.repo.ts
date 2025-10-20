/**
 * Layouts Repository
 * 
 * Data access layer for layouts table with cursor pagination.
 * Layouts represent field configurations at specific sites.
 * 
 * Key Features:
 * - CRUD operations (no soft delete - hard delete cascades to zones/assets)
 * - Cursor-based pagination (ordered by updated_at DESC, id DESC)
 * - Version tokens for optimistic concurrency control
 * - Foreign key validation (site_id must exist)
 * - Creator tracking via Clerk user ID
 */

import { getKnex } from './knex';

// ===========================
// Type Definitions
// ===========================

export interface Layout {
  id: number;
  site_id: number;
  name: string;
  description: string | null;
  is_published: boolean;
  version_token: string;
  created_by: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface LayoutCreateInput {
  site_id: number;
  name: string;
  description?: string;
  is_published?: boolean;
  created_by: string;
}

export interface LayoutUpdateInput {
  name?: string;
  description?: string | null;
  is_published?: boolean;
}

// ===========================
// Layouts Repository
// ===========================

export class LayoutsRepository {
  /**
   * Create a new layout
   */
  async create(data: LayoutCreateInput): Promise<Layout> {
    const knex = getKnex();
    
    const insertData: any = {
      site_id: data.site_id,
      name: data.name,
      description: data.description || null,
      is_published: data.is_published ?? false,
      created_by: data.created_by,
      version_token: knex.raw('gen_random_uuid()'),
    };
    
    const [inserted] = await knex('layouts').insert(insertData).returning('id');
    
    // Fetch the complete row
    const created = await this.findById(inserted.id);
    if (!created) {
      throw new Error('Failed to retrieve created layout');
    }
    
    return created;
  }
  
  /**
   * Find layout by ID
   */
  async findById(id: number): Promise<Layout | null> {
    const knex = getKnex();
    
    const row = await knex('layouts')
      .select('*')
      .where({ id })
      .first();
    
    return row ? this.mapRow(row) : null;
  }
  
  /**
   * Find all layouts for a specific site (with cursor pagination)
   */
  async findBySiteId(siteId: number, limit: number, cursor?: string): Promise<Layout[]> {
    const knex = getKnex();
    
    let query = knex('layouts')
      .select('*')
      .where({ site_id: siteId })
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit);
    
    // Apply cursor filtering if provided
    if (cursor) {
      // Use the centralized decodeCursor helper which handles timestamps with colons
      try {
        const { decodeCursor } = require('../lib/pagination');
        const { id: cursorId, sortValue: cursorUpdatedAt } = decodeCursor(cursor);
        
        query = query.where((qb: any) => {
          qb.where('updated_at', '<', cursorUpdatedAt)
            .orWhere((qb2: any) => {
              qb2.where('updated_at', '=', cursorUpdatedAt)
                .where('id', '<', cursorId);
            });
        });
      } catch (err) {
        // Invalid cursor - ignore and return from start
        console.warn('Invalid cursor format:', cursor, (err as Error).message);
      }
    }
    
    const rows = await query;
    return rows.map((row: any) => this.mapRow(row));
  }
  
  /**
   * Update layout by ID
   */
  async update(id: number, data: LayoutUpdateInput): Promise<Layout | null> {
    const knex = getKnex();
    
    const updateData: any = {
      updated_at: knex.fn.now(),
      version_token: knex.raw('gen_random_uuid()'), // Generate new version token
    };
    
    // Only include fields that are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;
    
    const count = await knex('layouts')
      .where({ id })
      .update(updateData);
    
    if (count === 0) {
      return null;
    }
    
    // Fetch the updated row
    return this.findById(id);
  }
  
  /**
   * Delete layout by ID (hard delete - cascades to zones, assets, etc.)
   */
  async delete(id: number): Promise<boolean> {
    const knex = getKnex();
    
    const count = await knex('layouts')
      .where({ id })
      .delete();
    
    return count > 0;
  }
  
  /**
   * Check if version token matches (for optimistic concurrency control)
   */
  async checkVersionToken(id: number, versionToken: string): Promise<boolean> {
    const knex = getKnex();
    
    const row = await knex('layouts')
      .select('version_token')
      .where({ id })
      .first();
    
    return row?.version_token === versionToken;
  }
  
  /**
   * Check if a site exists (for foreign key validation)
   */
  async siteExists(siteId: number): Promise<boolean> {
    const knex = getKnex();
    
    const row = await knex('sites')
      .select('id')
      .where({ id: siteId })
      .whereNull('deleted_at')
      .first();
    
    return !!row;
  }
  
  /**
   * Get layouts count for a site
   */
  async countBySiteId(siteId: number): Promise<number> {
    const knex = getKnex();
    
    const result = await knex('layouts')
      .where({ site_id: siteId })
      .count('* as count')
      .first();
    
    return parseInt(result?.count as string || '0', 10);
  }
  
  // ===========================
  // Private Helpers
  // ===========================
  
  /**
   * Map database row to Layout interface
   */
  private mapRow(row: any): Layout {
    return {
      id: row.id,
      site_id: row.site_id,
      name: row.name,
      description: row.description || null,
      is_published: row.is_published,
      version_token: row.version_token,
      created_by: row.created_by,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
}
