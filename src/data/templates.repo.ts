import { getKnex } from './knex';
import type { Knex } from 'knex';

export interface TemplateRow {
  id: number;
  created_by: string | null;
  name: string;
  sport_type: string | null;
  description: string | null;
  zones_json: any; // JSONB column (Knex returns as object)
  assets_json: any; // JSONB column (Knex returns as object)
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateFilters {
  sport_type?: string;
  is_public?: boolean;
  created_by?: string;
}

/**
 * Templates Repository
 * Handles database operations for field layout templates
 */
export class TemplatesRepository {
  private knex = getKnex();

  /**
   * List templates with optional filters and pagination
   */
  async list(filters: TemplateFilters = {}, limit = 50, cursor?: string): Promise<TemplateRow[]> {
    let query = this.knex('templates').select('*').orderBy('updated_at', 'desc').orderBy('id', 'desc');

    // Apply filters
    if (filters.sport_type) {
      query = query.where('sport_type', filters.sport_type);
    }
    if (filters.is_public !== undefined) {
      query = query.where('is_public', filters.is_public);
    }
    if (filters.created_by) {
      query = query.where('created_by', filters.created_by);
    }

    // Apply cursor pagination if provided
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const [idStr, sortValue] = decoded.split(':');
        const id = parseInt(idStr, 10);
        if (!isNaN(id)) {
          query = query.where((q: Knex.QueryBuilder) => {
            q.where('id', '<', id).orWhere((q2: Knex.QueryBuilder) => {
              q2.where('id', '=', id).where('updated_at', '<', sortValue);
            });
          });
        }
      } catch (err) {
        // Invalid cursor - ignore and continue without cursor
      }
    }

    return query.limit(limit);
  }

  /**
   * Get a single template by ID
   */
  async getById(id: number): Promise<TemplateRow | null> {
    const row = await this.knex('templates').where({ id }).first();
    return row || null;
  }

  /**
   * Create a new template
   */
  async create(data: {
    created_by?: string;
    name: string;
    sport_type?: string;
    description?: string;
    zones_json: any; // Will be stringified
    assets_json?: any; // Will be stringified
    thumbnail_url?: string;
    is_public?: boolean;
  }): Promise<TemplateRow> {
    const [row] = await this.knex('templates')
      .insert({
        created_by: data.created_by || null,
        name: data.name,
        sport_type: data.sport_type || null,
        description: data.description || null,
        zones_json: JSON.stringify(data.zones_json),
        assets_json: data.assets_json ? JSON.stringify(data.assets_json) : null,
        thumbnail_url: data.thumbnail_url || null,
        is_public: data.is_public ?? false,
      })
      .returning('*');

    return row;
  }

  /**
   * Update an existing template
   */
  async update(
    id: number,
    data: {
      name?: string;
      sport_type?: string;
      description?: string;
      zones_json?: any;
      assets_json?: any;
      thumbnail_url?: string;
      is_public?: boolean;
    }
  ): Promise<TemplateRow | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sport_type !== undefined) updateData.sport_type = data.sport_type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.zones_json !== undefined) updateData.zones_json = JSON.stringify(data.zones_json);
    if (data.assets_json !== undefined) updateData.assets_json = data.assets_json ? JSON.stringify(data.assets_json) : null;
    if (data.thumbnail_url !== undefined) updateData.thumbnail_url = data.thumbnail_url;
    if (data.is_public !== undefined) updateData.is_public = data.is_public;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const [row] = await this.knex('templates').where({ id }).update(updateData).returning('*');

    return row || null;
  }

  /**
   * Delete a template
   */
  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('templates').where({ id }).del();
    return deleted > 0;
  }

  /**
   * Get templates by IDs (for batch operations)
   */
  async getByIds(ids: number[]): Promise<TemplateRow[]> {
    return this.knex('templates').whereIn('id', ids);
  }
}
