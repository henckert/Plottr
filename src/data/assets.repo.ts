/**
 * Assets Repository - CRUD operations for field assets
 * Supports POINT (e.g., goal posts, benches) and LINESTRING (e.g., fences, nets)
 */

import { Knex } from 'knex';
import { getKnex } from './knex';

export interface AssetRow {
  id: number;
  layout_id: number;
  zone_id?: number | null;
  name: string;
  asset_type: string;
  icon?: string | null;
  geometry?: any; // GeoJSON (POINT or LINESTRING)
  rotation_deg?: number | null;
  properties?: any; // JSONB
  version_token: string;
  created_at: string;
  updated_at: string;
}

export class AssetsRepository {
  private knex: Knex;

  constructor(knex?: Knex) {
    this.knex = knex || getKnex();
  }

  /**
   * List assets with optional filters and cursor-based pagination
   */
  async list(params: {
    layoutId?: number;
    zoneId?: number;
    assetType?: string;
    limit?: number;
    cursor?: { id: number; updatedAt: string };
  }): Promise<AssetRow[]> {
    let query = this.knex('assets')
      .select(
        'id',
        'layout_id',
        'zone_id',
        'name',
        'asset_type',
        'icon',
        this.knex.raw('ST_AsGeoJSON(geometry)::json as geometry'),
        'rotation_deg',
        'properties',
        'version_token',
        'created_at',
        'updated_at'
      )
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc');

    if (params.layoutId) {
      query = query.where('layout_id', params.layoutId);
    }

    if (params.zoneId) {
      query = query.where('zone_id', params.zoneId);
    }

    if (params.assetType) {
      query = query.where('asset_type', params.assetType);
    }

    // Cursor-based pagination
    if (params.cursor) {
      query = query.where((q: any) => {
        q.where('updated_at', '<', params.cursor!.updatedAt).orWhere((q2: any) => {
          q2.where('updated_at', '=', params.cursor!.updatedAt)
            .where('id', '<', params.cursor!.id);
        });
      });
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  /**
   * Get single asset by ID
   */
  async getById(id: number): Promise<AssetRow | null> {
    const row = await this.knex('assets')
      .select(
        'id',
        'layout_id',
        'zone_id',
        'name',
        'asset_type',
        'icon',
        this.knex.raw('ST_AsGeoJSON(geometry)::json as geometry'),
        'rotation_deg',
        'properties',
        'version_token',
        'created_at',
        'updated_at'
      )
      .where({ id })
      .first();

    return row || null;
  }

  /**
   * Create new asset
   */
  async create(data: {
    layoutId: number;
    zoneId?: number | null;
    name: string;
    assetType: string;
    icon?: string | null;
    geometry?: any; // GeoJSON
    rotationDeg?: number | null;
    properties?: any;
  }): Promise<AssetRow> {
    const versionToken = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const geometrySQL = data.geometry
      ? this.knex.raw(`ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)`, [JSON.stringify(data.geometry)])
      : null;

    const [row] = await this.knex('assets')
      .insert({
        layout_id: data.layoutId,
        zone_id: data.zoneId || null,
        name: data.name,
        asset_type: data.assetType,
        icon: data.icon || null,
        geometry: geometrySQL,
        rotation_deg: data.rotationDeg || null,
        properties: data.properties ? JSON.stringify(data.properties) : null,
        version_token: versionToken,
      })
      .returning('*');

    return await this.getById(row.id) as AssetRow;
  }

  /**
   * Update existing asset
   */
  async update(
    id: number,
    versionToken: string,
    data: Partial<{
      zoneId: number | null;
      name: string;
      assetType: string;
      icon: string | null;
      geometry: any;
      rotationDeg: number | null;
      properties: any;
    }>
  ): Promise<AssetRow | null> {
    const newVersionToken = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const updateData: any = {
      version_token: newVersionToken,
      updated_at: this.knex.fn.now(),
    };

    if (data.zoneId !== undefined) updateData.zone_id = data.zoneId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.assetType !== undefined) updateData.asset_type = data.assetType;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.rotationDeg !== undefined) updateData.rotation_deg = data.rotationDeg;
    if (data.properties !== undefined) updateData.properties = JSON.stringify(data.properties);

    if (data.geometry !== undefined) {
      updateData.geometry = this.knex.raw(
        `ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)`,
        [JSON.stringify(data.geometry)]
      );
    }

    const updated = await this.knex('assets')
      .where({ id, version_token: versionToken })
      .update(updateData)
      .returning('*');

    if (updated.length === 0) return null;

    return await this.getById(id);
  }

  /**
   * Delete asset
   */
  async delete(id: number, versionToken: string): Promise<boolean> {
    const deleted = await this.knex('assets')
      .where({ id, version_token: versionToken })
      .del();

    return deleted > 0;
  }
}
