import { TemplatesRepository, TemplateRow } from '../data/templates.repo';
import { ZonesRepository, ZoneRow } from '../data/zones.repo';
import { AssetsRepository, AssetRow } from '../data/assets.repo';
import { LayoutsRepository } from '../data/layouts.repo';
import { AppError } from '../errors';
import { z } from 'zod';

/**
 * Template zone definition (without geometry - will be auto-generated or user-drawn)
 */
const TemplateZoneSchema = z.object({
  name: z.string(),
  zone_type: z.string(),
  color: z.string().optional(),
  surface: z.string().optional(),
});

/**
 * Template asset definition (without geometry - will be placed by user)
 */
const TemplateAssetSchema = z.object({
  name: z.string(),
  asset_type: z.string(),
  icon: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

export type TemplateZone = z.infer<typeof TemplateZoneSchema>;
export type TemplateAsset = z.infer<typeof TemplateAssetSchema>;

/**
 * Full template with parsed zones/assets
 */
export interface Template {
  id: number;
  created_by: string | null;
  name: string;
  sport_type: string | null;
  description: string | null;
  zones: TemplateZone[];
  assets: TemplateAsset[];
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Templates Service
 * Manages field layout templates and zone presets
 */
export class TemplatesService {
  private templatesRepo = new TemplatesRepository();
  private zonesRepo = new ZonesRepository();
  private assetsRepo = new AssetsRepository();
  private layoutsRepo = new LayoutsRepository();

  /**
   * List templates with filters and pagination
   */
  async list(filters: {
    sport_type?: string;
    is_public?: boolean;
    created_by?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ templates: Template[]; next_cursor?: string; has_more: boolean }> {
    const limit = Math.min(filters.limit || 50, 100);
    const rows = await this.templatesRepo.list(
      {
        sport_type: filters.sport_type,
        is_public: filters.is_public,
        created_by: filters.created_by,
      },
      limit + 1, // Fetch one extra to determine if there are more
      filters.cursor
    );

    const hasMore = rows.length > limit;
    const templates = rows.slice(0, limit).map((row) => this.mapRowToTemplate(row));

    let nextCursor: string | undefined;
    if (hasMore && templates.length > 0) {
      const lastItem = templates[templates.length - 1];
      nextCursor = Buffer.from(`${lastItem.id}:${lastItem.updated_at}`).toString('base64');
    }

    return {
      templates,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  /**
   * Get a single template by ID
   */
  async getById(id: number): Promise<Template | null> {
    const row = await this.templatesRepo.getById(id);
    if (!row) return null;
    return this.mapRowToTemplate(row);
  }

  /**
   * Create a new template from a layout's current zones/assets
   */
  async createFromLayout(
    layoutId: number,
    data: {
      created_by?: string;
      name: string;
      sport_type?: string;
      description?: string;
      thumbnail_url?: string;
      is_public?: boolean;
    }
  ): Promise<Template> {
    // Fetch layout to ensure it exists
    const layout = await this.layoutsRepo.findById(layoutId);
    if (!layout) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    // Fetch all zones for this layout using list() method
    const allZones = await this.zonesRepo.list(1000, undefined, layoutId);

    // Fetch all assets for this layout
    const allAssets = await this.assetsRepo.list({ layoutId, limit: 1000 });

    // Create template zones (without geometry)
    const templateZones: TemplateZone[] = allZones.map((zone: ZoneRow) => ({
      name: zone.name,
      zone_type: zone.zone_type,
      color: zone.color || undefined,
      surface: zone.surface || undefined,
    }));

    // Create template assets (without geometry)
    const templateAssets: TemplateAsset[] = allAssets.map((asset: AssetRow) => ({
      name: asset.name,
      asset_type: asset.asset_type,
      icon: asset.icon || undefined,
      properties: asset.properties || undefined,
    }));

    // Create template
    const row = await this.templatesRepo.create({
      created_by: data.created_by,
      name: data.name,
      sport_type: data.sport_type,
      description: data.description,
      zones_json: templateZones,
      assets_json: templateAssets,
      thumbnail_url: data.thumbnail_url,
      is_public: data.is_public ?? false,
    });

    return this.mapRowToTemplate(row);
  }

  /**
   * Apply a template to a layout
   * Creates placeholder zones/assets WITHOUT geometry (user will draw them later)
   */
  async applyToLayout(
    templateId: number,
    layoutId: number,
    options: {
      clearExisting?: boolean; // Default true - clear existing zones/assets
      userId?: string; // For audit trail
    } = {}
  ): Promise<{ zones_created: string[]; assets_created: string[] }> {
    const template = await this.getById(templateId);
    if (!template) {
      throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
    }

    // Verify layout exists
    const layout = await this.layoutsRepo.findById(layoutId);
    if (!layout) {
      throw new AppError('Layout not found', 404, 'LAYOUT_NOT_FOUND');
    }

    const clearExisting = options.clearExisting ?? true;

    // Step 1: Clear existing zones/assets if requested
    if (clearExisting) {
      // Fetch all zones and delete them (will cascade delete assets)
      const existingZones = await this.zonesRepo.list(1000, undefined, layoutId);
      for (const zone of existingZones) {
        await this.zonesRepo.delete(zone.id, zone.version_token);
      }
    }

    // Step 2: Create zones from template WITHOUT geometry
    // NOTE: We create zones with a minimal dummy polygon since boundary is required
    // The frontend will replace this with user-drawn geometry
    const dummyPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 0.0001], [0.0001, 0.0001], [0.0001, 0], [0, 0]]]
    };

    const zonesCreated: string[] = [];
    for (const templateZone of template.zones) {
      try {
        const zone = await this.zonesRepo.create({
          layout_id: layoutId,
          name: templateZone.name,
          zone_type: templateZone.zone_type,
          color: templateZone.color || null,
          surface: templateZone.surface || null,
          boundary: dummyPolygon, // Minimal placeholder - user will draw real geometry
        });
        zonesCreated.push(zone.name);
      } catch (err) {
        // Log error but continue with other zones
        console.error(`Failed to create zone ${templateZone.name}:`, err);
      }
    }

    // Step 3: Create assets from template WITHOUT geometry (optional - assets can be null)
    const assetsCreated: string[] = [];
    for (const templateAsset of template.assets) {
      try {
        const asset = await this.assetsRepo.create({
          layoutId,
          name: templateAsset.name,
          assetType: templateAsset.asset_type,
          icon: templateAsset.icon || null,
          properties: templateAsset.properties || null,
          // No geometry - will be placed by user later
        });
        assetsCreated.push(asset.name);
      } catch (err) {
        console.error(`Failed to create asset ${templateAsset.name}:`, err);
      }
    }

    return {
      zones_created: zonesCreated,
      assets_created: assetsCreated,
    };
  }

  /**
   * Delete a template (only owner or admin can delete)
   */
  async delete(id: number, userId?: string): Promise<void> {
    const template = await this.getById(id);
    if (!template) {
      throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
    }

    // Only owner can delete (or admin - add role check here)
    if (userId && template.created_by && template.created_by !== userId) {
      throw new AppError('Unauthorized to delete this template', 403, 'FORBIDDEN');
    }

    await this.templatesRepo.delete(id);
  }

  /**
   * Map database row to service model
   */
  private mapRowToTemplate(row: TemplateRow): Template {
    // Knex returns JSONB columns as objects, not strings (no need to parse)
    const zones = typeof row.zones_json === 'string' ? JSON.parse(row.zones_json) : row.zones_json || [];
    const assets = typeof row.assets_json === 'string' ? JSON.parse(row.assets_json) : row.assets_json || [];

    return {
      id: row.id,
      created_by: row.created_by,
      name: row.name,
      sport_type: row.sport_type,
      description: row.description,
      zones: Array.isArray(zones) ? zones : [],
      assets: Array.isArray(assets) ? assets : [],
      thumbnail_url: row.thumbnail_url,
      is_public: row.is_public,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

