# TASK 4.13: Asset Placement Tools - Planning Document

**Created:** October 27, 2025  
**Status:** Planning  
**Priority:** High (Completes CRUD flow for layouts)  
**Estimated LOC:** ~800-1000 lines (Backend 400-500 + Frontend 400-500)

---

## Overview

Implement complete asset management system allowing users to place and manage point/line assets (goals, benches, lights, etc.) within zones on their field layouts.

**Scope:**
1. **Backend API** (TASK 3.8-3.14) - Assets CRUD endpoints
2. **Frontend Hooks** - React Query hooks for asset operations
3. **Asset Placement UI** - Drawing tools + icon picker + properties panel
4. **Editor Integration** - Assets layer in layout editor

---

## Backend Implementation (TASK 3.8-3.14)

### 3.8: Assets Repository (`src/data/assets.repo.ts`)

**File:** `src/data/assets.repo.ts`  
**Estimated LOC:** ~200 lines

```typescript
/**
 * Assets Repository - CRUD operations for field assets
 * Supports POINT (e.g., goal posts, benches) and LINESTRING (e.g., fences, nets)
 */

import { Knex } from 'knex';
import { getKnex } from '../db/knex';

export interface AssetRow {
  id: number;
  zone_id: number;
  layout_id: number;
  name: string;
  asset_type: string; // 'goal', 'bench', 'light', 'fence', etc.
  icon?: string | null; // FontAwesome icon name (e.g., 'fa-futbol')
  geometry?: any; // PostGIS POINT or LINESTRING
  rotation_deg?: number | null; // For oriented icons
  properties?: any; // JSONB for custom metadata
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
   * List assets with optional filters
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
        'zone_id',
        'layout_id',
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
        'zone_id',
        'layout_id',
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
    zoneId: number;
    layoutId: number;
    name: string;
    assetType: string;
    icon?: string;
    geometry?: any; // GeoJSON
    rotationDeg?: number;
    properties?: any;
  }): Promise<AssetRow> {
    const versionToken = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const geometrySQL = data.geometry
      ? this.knex.raw(`ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)`, [JSON.stringify(data.geometry)])
      : null;

    const [row] = await this.knex('assets')
      .insert({
        zone_id: data.zoneId,
        layout_id: data.layoutId,
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
      zoneId: number;
      name: string;
      assetType: string;
      icon: string;
      geometry: any;
      rotationDeg: number;
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
```

### 3.9: Assets Service (`src/services/assets.service.ts`)

**File:** `src/services/assets.service.ts`  
**Estimated LOC:** ~150 lines

```typescript
/**
 * Assets Service - Business logic for asset operations
 * Validates ownership, geometry constraints, and icon presets
 */

import { AssetsRepository, AssetRow } from '../data/assets.repo';
import { LayoutsRepository } from '../data/layouts.repo';
import { ZonesRepository } from '../data/zones.repo';
import { AppError } from '../errors';
import { validateAssetGeometry } from '../lib/geospatial';

export class AssetsService {
  private assetsRepo: AssetsRepository;
  private layoutsRepo: LayoutsRepository;
  private zonesRepo: ZonesRepository;

  constructor() {
    this.assetsRepo = new AssetsRepository();
    this.layoutsRepo = new LayoutsRepository();
    this.zonesRepo = new ZonesRepository();
  }

  /**
   * List assets with pagination
   */
  async listPaginated(
    limit: number,
    cursor?: string,
    layoutId?: number,
    zoneId?: number,
    assetType?: string
  ) {
    const cursorParams = cursor
      ? this.decodeCursor(cursor)
      : undefined;

    return await this.assetsRepo.list({
      layoutId,
      zoneId,
      assetType,
      limit,
      cursor: cursorParams,
    });
  }

  /**
   * Get single asset
   */
  async get(id: number) {
    const asset = await this.assetsRepo.getById(id);
    if (!asset) {
      throw new AppError('Asset not found', 404, 'NOT_FOUND');
    }
    return asset;
  }

  /**
   * Create new asset
   */
  async create(data: {
    zoneId: number;
    layoutId: number;
    name: string;
    assetType: string;
    icon?: string;
    geometry?: any;
    rotationDeg?: number;
    properties?: any;
  }) {
    // Validate zone exists and belongs to layout
    const zone = await this.zonesRepo.getById(data.zoneId);
    if (!zone) {
      throw new AppError('Zone not found', 404, 'ZONE_NOT_FOUND');
    }

    if (zone.layout_id !== data.layoutId) {
      throw new AppError('Zone does not belong to this layout', 400, 'ZONE_LAYOUT_MISMATCH');
    }

    // Validate geometry (POINT or LINESTRING only)
    if (data.geometry) {
      const geometryError = validateAssetGeometry(data.geometry);
      if (geometryError) {
        throw new AppError(geometryError.message, 400, geometryError.code);
      }
    }

    // Validate icon is in allowed list (if provided)
    if (data.icon && !this.isValidIcon(data.icon)) {
      throw new AppError(
        `Invalid icon. Must be one of: ${this.getAllowedIcons().join(', ')}`,
        400,
        'INVALID_ICON'
      );
    }

    return await this.assetsRepo.create(data);
  }

  /**
   * Update asset
   */
  async update(id: number, versionToken: string, data: any) {
    // Validate geometry if provided
    if (data.geometry) {
      const geometryError = validateAssetGeometry(data.geometry);
      if (geometryError) {
        throw new AppError(geometryError.message, 400, geometryError.code);
      }
    }

    // Validate icon if provided
    if (data.icon && !this.isValidIcon(data.icon)) {
      throw new AppError(
        `Invalid icon. Must be one of: ${this.getAllowedIcons().join(', ')}`,
        400,
        'INVALID_ICON'
      );
    }

    const updated = await this.assetsRepo.update(id, versionToken, data);
    if (!updated) {
      throw new AppError(
        'Asset not found or version conflict',
        409,
        'VERSION_CONFLICT'
      );
    }

    return updated;
  }

  /**
   * Delete asset
   */
  async delete(id: number, versionToken: string) {
    const deleted = await this.assetsRepo.delete(id, versionToken);
    if (!deleted) {
      throw new AppError(
        'Asset not found or version conflict',
        409,
        'VERSION_CONFLICT'
      );
    }
  }

  /**
   * Validate icon is in allowed preset list
   */
  private isValidIcon(icon: string): boolean {
    return this.getAllowedIcons().includes(icon);
  }

  /**
   * Get list of allowed FontAwesome icons for assets
   */
  private getAllowedIcons(): string[] {
    return [
      'fa-futbol',       // Soccer ball
      'fa-basketball',   // Basketball
      'fa-volleyball',   // Volleyball
      'fa-baseball',     // Baseball
      'fa-flag',         // Flag/marker
      'fa-bullseye',     // Target
      'fa-chair',        // Bench
      'fa-lightbulb',    // Light
      'fa-tree',         // Tree
      'fa-cone-striped', // Cone
      'fa-water',        // Water fountain
      'fa-dumpster',     // Trash bin
      'fa-parking',      // Parking
      'fa-restroom',     // Restroom
      'fa-first-aid',    // Medical
      'fa-camera',       // Camera
      'fa-wifi',         // WiFi
      'fa-phone',        // Phone
      'fa-door-open',    // Entry/exit
      'fa-fence',        // Fence
    ];
  }

  private decodeCursor(cursor: string): { id: number; updatedAt: string } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [id, updatedAt] = decoded.split(':');
    return { id: parseInt(id, 10), updatedAt };
  }
}
```

### 3.10: Assets Schemas (`src/schemas/assets.schema.ts`)

**File:** `src/schemas/assets.schema.ts`  
**Estimated LOC:** ~100 lines

```typescript
import { z } from 'zod';

// GeoJSON schemas for POINT and LINESTRING
const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [lon, lat]
});

const GeoJSONLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

const AssetGeometrySchema = z.union([
  GeoJSONPointSchema,
  GeoJSONLineStringSchema,
]);

// Asset type enum
export const AssetTypeSchema = z.enum([
  'goal',
  'bench',
  'light',
  'cone',
  'flag',
  'marker',
  'tree',
  'fence',
  'net',
  'scoreboard',
  'water_fountain',
  'trash_bin',
  'camera',
  'other',
]);

// Full asset schema
export const AssetSchema = z.object({
  id: z.number(),
  zone_id: z.number(),
  layout_id: z.number(),
  name: z.string().min(1).max(100),
  asset_type: AssetTypeSchema,
  icon: z.string().optional().nullable(),
  geometry: AssetGeometrySchema.optional().nullable(),
  rotation_deg: z.number().min(0).max(360).optional().nullable(),
  properties: z.record(z.any()).optional().nullable(),
  version_token: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Create schema (no id, timestamps, version_token)
export const AssetCreateSchema = AssetSchema.omit({
  id: true,
  version_token: true,
  created_at: true,
  updated_at: true,
});

// Update schema (all fields optional except version control)
export const AssetUpdateSchema = AssetCreateSchema.partial();

// List response
export const AssetsListResponseSchema = z.object({
  data: z.array(AssetSchema),
  next_cursor: z.string().optional(),
  has_more: z.boolean(),
});

export type Asset = z.infer<typeof AssetSchema>;
export type AssetCreate = z.infer<typeof AssetCreateSchema>;
export type AssetUpdate = z.infer<typeof AssetUpdateSchema>;
```

### 3.11-3.12: Controller + Routes

Similar patterns to zones implementation. Will create during implementation.

---

## Frontend Implementation

### React Query Hooks (`web/src/hooks/useAssets.ts`)

**File:** `web/src/hooks/useAssets.ts`  
**Estimated LOC:** ~200 lines

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type PaginatedResponse } from '@/lib/api';
import type { components } from '@/types/api';

type Asset = components['schemas']['Asset'];
type AssetCreate = components['schemas']['AssetCreate'];
type AssetUpdate = components['schemas']['AssetUpdate'];

/**
 * List assets with filters
 */
export function useAssets(params?: {
  layoutId?: number;
  zoneId?: number;
  assetType?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', {
        params: {
          layout_id: params?.layoutId,
          zone_id: params?.zoneId,
          asset_type: params?.assetType,
          cursor: params?.cursor,
          limit: params?.limit || 100,
        },
      });
      return response.data;
    },
  });
}

/**
 * Get single asset
 */
export function useAsset(assetId: number | null) {
  return useQuery({
    queryKey: ['assets', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID required');
      const response = await apiClient.get<{ data: Asset }>(`/assets/${assetId}`);
      return response.data.data;
    },
    enabled: !!assetId,
  });
}

/**
 * Create asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssetCreate) => {
      const response = await apiClient.post<{ data: Asset }>('/assets', data);
      return response.data.data;
    },
    onSuccess: (newAsset) => {
      // Invalidate asset lists
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      // Invalidate specific layout/zone queries
      queryClient.invalidateQueries({ queryKey: ['layouts', newAsset.layout_id] });
      queryClient.invalidateQueries({ queryKey: ['zones', newAsset.zone_id] });
    },
  });
}

/**
 * Update asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      versionToken,
      data,
    }: {
      assetId: number;
      versionToken: string;
      data: AssetUpdate;
    }) => {
      const response = await apiClient.put<{ data: Asset }>(
        `/assets/${assetId}`,
        data,
        {
          headers: { 'If-Match': versionToken },
        }
      );
      return response.data.data;
    },
    onSuccess: (updatedAsset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.setQueryData(['assets', updatedAsset.id], updatedAsset);
    },
  });
}

/**
 * Delete asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      versionToken,
    }: {
      assetId: number;
      versionToken: string;
    }) => {
      await apiClient.delete(`/assets/${assetId}`, {
        headers: { 'If-Match': versionToken },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.removeQueries({ queryKey: ['assets', variables.assetId] });
    },
  });
}
```

### Asset Placement Component

Will integrate into existing layout editor (`web/src/app/layouts/[id]/editor/page.tsx`).

**Features to Add:**
1. **Asset drawing mode** - Point/Line tools in toolbar
2. **Icon picker** - Dropdown with FontAwesome icons
3. **Asset properties panel** - Edit name, type, rotation, custom properties
4. **Asset list sidebar** - View/filter/delete assets
5. **MapLibre rendering** - Display assets as markers/lines on map

---

## Success Criteria

### Backend (TASK 3.8-3.14)
- ✅ Assets repository with CRUD operations
- ✅ Assets service with geometry validation
- ✅ Zod schemas for asset types and geometry
- ✅ Controller + routes integrated
- ✅ 15+ integration tests passing
- ✅ OpenAPI documentation updated

### Frontend (TASK 4.13)
- ✅ useAssets hooks working with backend
- ✅ Asset drawing tools (point/line) functional
- ✅ Icon picker with 20 preset icons
- ✅ Asset properties panel for editing
- ✅ Assets render correctly on map
- ✅ Delete asset with confirmation
- ✅ Version conflict handling

### Integration
- ✅ Assets persist to database
- ✅ Assets load on editor refresh
- ✅ Assets update in real-time (React Query cache)
- ✅ TypeScript compiles without errors
- ✅ Git commits: backend + frontend

---

## Implementation Plan

### Phase 1: Backend API (3-4 hours)
1. Create assets repository (200 lines)
2. Create assets service (150 lines)
3. Create Zod schemas (100 lines)
4. Create controller + routes (150 lines)
5. Write integration tests (300 lines)
6. Update OpenAPI docs (100 lines)

### Phase 2: Frontend Hooks (1 hour)
1. Create useAssets.ts (200 lines)
2. Test hooks with Postman/curl

### Phase 3: UI Components (2-3 hours)
1. Add asset drawing tools to editor toolbar
2. Build icon picker dropdown
3. Build asset properties panel
4. Add assets layer to map
5. Add asset list sidebar

### Phase 4: Testing & Polish (1 hour)
1. Test full asset lifecycle
2. Handle edge cases (conflicts, errors)
3. Git commits
4. Update TASK_TRACKER

**Total Estimated Time:** 7-9 hours  
**Total Estimated LOC:** 800-1000 lines

---

## Next Steps

1. Start with backend (TASK 3.8-3.14)
2. Test API with Postman
3. Build frontend hooks
4. Integrate into layout editor
5. Commit and update tracker
