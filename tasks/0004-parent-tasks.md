# Parent Tasks - Field Layout Designer Implementation

**Task:** Field Layout Designer & Sharing Platform  
**Document:** High-Level Implementation Tasks  
**Created:** 2025-10-20  
**Status:** Planning Phase (Step 4 of 5)

## Overview

This document defines the 6 parent tasks required to pivot Plottr from a sports booking platform to a Field Layout Designer tool. Each parent task represents a major workstream with estimated subtasks, dependencies, and completion criteria. Parent tasks are designed to be executed sequentially with minimal blocking dependencies.

---

## Task Dependency Graph

```
[TASK 1: Database Schema] 
    ↓
[TASK 2: Backend API - Sites & Layouts]
    ↓
[TASK 3: Backend API - Zones & Assets]
    ↓  ↘
[TASK 4: Frontend - Layout Editor]  [TASK 5: Share Links & Export]
    ↓                                      ↓
    └──────────────→ [TASK 6: Documentation & Deployment] ←──┘
```

**Execution Strategy:**
- Tasks 1-3 must be sequential (DB → Backend CRUD → Backend Geospatial)
- Tasks 4-5 can be parallel after Task 3 completes
- Task 6 runs concurrent with 4-5, finalizes after both complete

---

## TASK 1: Database Schema & Migrations

**Goal:** Create new tables for Sites, Layouts, Zones, Assets, Templates, ShareLinks and migrate existing Venues data.

**Estimated Subtasks:** 8-12

**Dependencies:** None (can start immediately)

**Completion Criteria:**
- ✅ 6 new tables created with proper indexes, constraints, foreign keys
- ✅ PostGIS `geography(POLYGON, 4326)` columns for Site.bbox, Zone.boundary
- ✅ PostGIS `geography(POINT, 4326)` for Site.location
- ✅ PostGIS `geography(GEOMETRY, 4326)` for Asset.geometry (POINT or LINESTRING)
- ✅ Migration script to convert Venues → Sites (data preservation)
- ✅ Seed data: 3 example Sites with 5 Layouts, 20 Zones, 50 Assets
- ✅ All migrations reversible (down migrations implemented)
- ✅ `npm run db:migrate` runs without errors
- ✅ `npm run db:rollback` reverts cleanly

**Key Files:**
```
src/db/migrations/
├── 0007_create_sites_table.ts           # Sites with location, bbox
├── 0008_create_layouts_table.ts         # Layouts linked to Sites
├── 0009_create_zones_table.ts           # Zones with boundary (POLYGON)
├── 0010_create_assets_table.ts          # Assets with geometry (POINT/LINESTRING)
├── 0011_create_templates_table.ts       # Templates with preview_geometry JSON
├── 0012_create_share_links_table.ts     # ShareLinks with slug, expiry
└── 0013_migrate_venues_to_sites.ts      # Data migration script
```

**Schema Highlights:**

### Sites Table
```sql
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'USA',
  postal_code VARCHAR(20),
  location geography(POINT, 4326),           -- Geocoded lat/lon
  bbox geography(POLYGON, 4326),             -- Bounding box for all pitches
  version_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sites_club_id ON sites(club_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_location ON sites USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_updated_at ON sites(updated_at DESC) WHERE deleted_at IS NULL;
```

### Layouts Table
```sql
CREATE TABLE layouts (
  id SERIAL PRIMARY KEY,
  site_id INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  version_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_by VARCHAR(100) NOT NULL,          -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_layouts_site_id ON layouts(site_id);
CREATE INDEX idx_layouts_created_by ON layouts(created_by);
CREATE INDEX idx_layouts_updated_at ON layouts(updated_at DESC);
```

### Zones Table
```sql
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  layout_id INT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  zone_type VARCHAR(50) NOT NULL,            -- 'pitch', 'goal_area', 'penalty_box', etc.
  surface VARCHAR(50),                       -- 'grass', 'turf', 'clay', etc.
  color VARCHAR(7),                          -- Hex color for rendering
  boundary geography(POLYGON, 4326) NOT NULL,
  area_sqm DOUBLE PRECISION,                 -- Computed from ST_Area(boundary)
  perimeter_m DOUBLE PRECISION,              -- Computed from ST_Perimeter(boundary)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_valid_boundary CHECK (ST_IsValid(boundary::geometry)),
  CONSTRAINT chk_max_area CHECK (area_sqm <= 10000000)  -- 10 km² max
);

CREATE INDEX idx_zones_layout_id ON zones(layout_id);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);
```

### Assets Table
```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  layout_id INT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,           -- 'goal', 'cone', 'line', 'marker', etc.
  geometry geography(GEOMETRY, 4326) NOT NULL, -- POINT or LINESTRING only
  properties JSONB,                          -- Flexible metadata (color, size, notes)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_geometry_type CHECK (
    ST_GeometryType(geometry::geometry) IN ('ST_Point', 'ST_LineString')
  )
);

CREATE INDEX idx_assets_layout_id ON assets(layout_id);
CREATE INDEX idx_assets_geometry ON assets USING GIST(geometry);
CREATE INDEX idx_assets_type ON assets(asset_type);
```

### Templates Table
```sql
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  tags TEXT[],                               -- Array of keywords for search
  preview_geometry JSONB NOT NULL,           -- Snapshot of zones/assets GeoJSON
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(100) NOT NULL,          -- Clerk user ID
  usage_count INT NOT NULL DEFAULT 0,        -- Popularity metric
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_is_public ON templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC);
```

### ShareLinks Table
```sql
CREATE TABLE share_links (
  id SERIAL PRIMARY KEY,
  layout_id INT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  slug VARCHAR(12) NOT NULL UNIQUE,          -- Random 8-char slug
  expires_at TIMESTAMPTZ,                    -- NULL = no expiry
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  access_count INT NOT NULL DEFAULT 0,       -- Track views
  created_by VARCHAR(100) NOT NULL,          -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_share_links_slug ON share_links(slug) WHERE is_revoked = FALSE;
CREATE INDEX idx_share_links_layout_id ON share_links(layout_id);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at) WHERE expires_at IS NOT NULL;
```

**Risks & Mitigations:**
- **Risk:** Venues → Sites migration loses data  
  **Mitigation:** Write migration tests, backup prod DB before deploy
- **Risk:** PostGIS functions fail on existing geometry  
  **Mitigation:** Use `ST_MakeValid()` wrapper, validate all geometries in migration

---

## TASK 2: Backend API - Sites & Layouts CRUD

**Goal:** Implement repositories, services, controllers, and API routes for Sites and Layouts.

**Estimated Subtasks:** 12-16

**Dependencies:** TASK 1 (database schema must exist)

**Completion Criteria:**
- ✅ Sites repository (`src/data/sites.repo.ts`) with CRUD + cursor pagination
- ✅ Layouts repository (`src/data/layouts.repo.ts`) with CRUD + duplication
- ✅ Sites service (`src/services/sites.service.ts`) with geocoding, bbox generation
- ✅ Layouts service (`src/services/layouts.service.ts`) with tier gates (max 50 free, 500 paid)
- ✅ Sites controller (`src/controllers/sites.controller.ts`) with version token checks
- ✅ Layouts controller (`src/controllers/layouts.controller.ts`)
- ✅ Zod schemas (`src/schemas/sites.schema.ts`, `src/schemas/layouts.schema.ts`)
- ✅ API routes registered in `src/app.ts`
- ✅ 80+ integration tests (Supertest)
- ✅ All tests pass with `npm test tests/integration/sites.test.ts`

**API Endpoints:**
```
POST   /api/sites                # Create site (geocode address)
GET    /api/sites/:id            # Get site by ID (with GeoJSON location/bbox)
GET    /api/sites                # List sites (paginated, filter by club_id)
PUT    /api/sites/:id            # Update site (If-Match header required)
DELETE /api/sites/:id            # Soft delete (set deleted_at)

POST   /api/layouts              # Create layout
GET    /api/layouts/:id          # Get layout (with zone/asset counts)
GET    /api/layouts              # List layouts (filter by site_id, is_published)
PUT    /api/layouts/:id          # Update layout
POST   /api/layouts/:id/duplicate # Clone layout + zones + assets
DELETE /api/layouts/:id          # Delete layout (cascade zones/assets)
```

**Key Implementation Details:**

### Sites Service - Geocoding Flow
```typescript
async create(data: SiteCreateInput): Promise<Site> {
  let location: GeoPoint | null = null;
  
  // Attempt geocoding via Mapbox
  if (data.address && geocoder) {
    try {
      const result = await geocoder.forwardGeocode({ query: data.address, limit: 1 }).send();
      if (result.body.features.length > 0) {
        const [lon, lat] = result.body.features[0].center;
        location = { longitude: lon, latitude: lat };
      }
    } catch (err) {
      logger.warn('Geocoding failed, using manual coordinates', { error: err });
    }
  }
  
  // Fallback to manual coordinates if provided
  if (!location && data.manual_location) {
    location = data.manual_location;
  }
  
  // Generate bbox from location (default 500m radius)
  const bbox = generateBbox(location, 500);
  
  const site = await sitesRepo.create({ ...data, location, bbox });
  return site;
}
```

### Layouts Service - Tier Gate
```typescript
async create(data: LayoutCreateInput, userId: string, tier: string): Promise<Layout> {
  // Check tier limits
  const existing = await layoutsRepo.countBySiteId(data.site_id);
  const maxLayouts = tier === 'free' ? 50 : 500;
  
  if (existing >= maxLayouts) {
    throw new AppError(
      `Maximum ${maxLayouts} layouts per site for ${tier} tier`,
      403,
      'TIER_LIMIT_EXCEEDED'
    );
  }
  
  const layout = await layoutsRepo.create({ ...data, created_by: userId });
  return layout;
}
```

**Risks & Mitigations:**
- **Risk:** Mapbox API rate limits during geocoding  
  **Mitigation:** Implement geocoding cache (Redis or in-memory), fallback to manual coordinates
- **Risk:** Bbox generation produces invalid polygons  
  **Mitigation:** Use Turf.js `buffer()` with validation, test with edge cases (poles, antimeridian)

---

## TASK 3: Backend API - Zones & Assets CRUD

**Goal:** Implement repositories, services, controllers for Zones and Assets with PostGIS validation.

**Estimated Subtasks:** 14-18

**Dependencies:** TASK 2 (Sites/Layouts must exist for foreign keys)

**Completion Criteria:**
- ✅ Zones repository (`src/data/zones.repo.ts`) with PostGIS `ST_Area()`, `ST_Perimeter()` queries
- ✅ Assets repository (`src/data/assets.repo.ts`) with geometry type validation
- ✅ Zones service (`src/services/zones.service.ts`) with `validatePitchPolygon()` integration
- ✅ Assets service (`src/services/assets.service.ts`) with tier gates (max 500 free, 5000 paid)
- ✅ Zones controller (`src/controllers/zones.controller.ts`)
- ✅ Assets controller (`src/controllers/assets.controller.ts`)
- ✅ Zod schemas (`src/schemas/zones.schema.ts`, `src/schemas/assets.schema.ts`)
- ✅ Enhanced `src/lib/geospatial.ts` with `validateZoneFitsInSite()` function
- ✅ 100+ integration tests (Supertest)
- ✅ All tests pass with `npm test tests/integration/zones.test.ts`

**API Endpoints:**
```
POST   /api/zones                # Create zone (validate boundary)
GET    /api/zones/:id            # Get zone (with computed area_sqm, perimeter_m)
GET    /api/zones                # List zones (filter by layout_id)
PUT    /api/zones/:id            # Update zone boundary
DELETE /api/zones/:id            # Delete zone

POST   /api/assets               # Create asset (POINT or LINESTRING)
GET    /api/assets/:id           # Get asset (with GeoJSON geometry)
GET    /api/assets               # List assets (filter by layout_id, asset_type)
PUT    /api/assets/:id           # Update asset geometry
DELETE /api/assets/:id           # Delete asset
```

**Key Implementation Details:**

### Zones Repository - PostGIS Queries
```typescript
async create(data: ZoneCreateInput): Promise<Zone> {
  const result = await db('zones')
    .insert({
      layout_id: data.layout_id,
      name: data.name,
      zone_type: data.zone_type,
      surface: data.surface,
      color: data.color,
      boundary: db.raw(`ST_GeomFromGeoJSON(?)::geography`, [JSON.stringify(data.boundary)]),
    })
    .returning([
      '*',
      db.raw('ST_Area(boundary) as area_sqm'),
      db.raw('ST_Perimeter(boundary::geometry) as perimeter_m'),
      db.raw('ST_AsGeoJSON(boundary)::json as boundary_geojson'),
    ]);
  
  return this.mapRow(result[0]);
}
```

### Zones Service - Validation Flow
```typescript
async create(data: ZoneCreateInput): Promise<Zone> {
  // 1. Validate polygon structure, WGS84 bounds, winding order, self-intersection
  const validationError = validatePitchPolygon(data.boundary);
  if (validationError) {
    throw new AppError(validationError.message, 400, validationError.code);
  }
  
  // 2. Fetch parent Site's bbox
  const layout = await layoutsRepo.getById(data.layout_id);
  const site = await sitesRepo.getById(layout.site_id);
  
  // 3. Check Zone fits within Site bbox
  const fitsError = validateZoneFitsInSite(data.boundary, site.bbox);
  if (fitsError) {
    throw new AppError(fitsError.message, 400, fitsError.code);
  }
  
  // 4. Compute area, reject if >10 km²
  const area = turf.area(data.boundary) / 1_000_000; // Convert m² to km²
  if (area > 10) {
    throw new AppError(`Zone area (${area.toFixed(2)} km²) exceeds max 10 km²`, 400, 'ZONE_TOO_LARGE');
  }
  
  // 5. Create zone
  const zone = await zonesRepo.create(data);
  return zone;
}
```

### Assets Service - Geometry Type Validation
```typescript
async create(data: AssetCreateInput): Promise<Asset> {
  // Validate geometry type (POINT or LINESTRING only)
  const geomType = data.geometry.type;
  if (geomType !== 'Point' && geomType !== 'LineString') {
    throw new AppError(
      `Invalid geometry type: ${geomType}. Only Point and LineString allowed.`,
      400,
      'INVALID_GEOMETRY_TYPE'
    );
  }
  
  // Check tier limits
  const existing = await assetsRepo.countByLayoutId(data.layout_id);
  const maxAssets = tier === 'free' ? 500 : 5000;
  if (existing >= maxAssets) {
    throw new AppError(`Max ${maxAssets} assets for ${tier} tier`, 403, 'TIER_LIMIT_EXCEEDED');
  }
  
  const asset = await assetsRepo.create(data);
  return asset;
}
```

**Risks & Mitigations:**
- **Risk:** PostGIS `ST_Area()` returns meters² but UI expects km²  
  **Mitigation:** Document unit conversions, add computed field `area_km2 = area_sqm / 1_000_000`
- **Risk:** Zone boundary outside Site bbox causes confusing error  
  **Mitigation:** Return descriptive error: "Zone extends beyond site bounds at coordinates (lon, lat)"

---

## TASK 4: Frontend - Layout Editor

**Goal:** Build interactive layout editor with MapLibre GL, draw controls, zone/asset management.

**Estimated Subtasks:** 16-22

**Dependencies:** TASK 3 (backend API must exist)

**Completion Criteria:**
- ✅ Layout Editor page (`web/src/app/layouts/[id]/edit/page.tsx`)
- ✅ MapLibre GL canvas with Site bbox initial bounds
- ✅ Draw controls (polygon draw mode for Zones, point/line draw modes for Assets)
- ✅ Property panel (edit zone name, color, surface; edit asset name, type)
- ✅ Layer manager (toggle visibility of zones/assets by type)
- ✅ Zustand store for editor state (`useLayoutEditorStore`)
- ✅ Real-time area/perimeter display (Turf.js calculations)
- ✅ Undo/redo stack (max 50 actions)
- ✅ Auto-save (debounced 3 seconds after last edit)
- ✅ 60+ React Testing Library tests
- ✅ Manual testing checklist (10 scenarios, all pass)

**UI Components:**
```
web/src/components/LayoutEditor/
├── MapCanvas.tsx                   # MapLibre GL container
├── DrawControls.tsx                # Toolbar (draw zone, draw asset, select, delete)
├── PropertyPanel.tsx               # Right sidebar (edit selected zone/asset)
├── LayerManager.tsx                # Left sidebar (show/hide layers)
├── StatsDisplay.tsx                # Top bar (total zones, assets, selected area)
├── ToolbarActions.tsx              # Save, undo, redo, export buttons
└── index.tsx                       # Main editor layout
```

**Key Features:**

### Draw Mode State Machine
```typescript
type DrawMode = 'select' | 'draw_zone' | 'draw_point' | 'draw_line';

const useLayoutEditorStore = create<EditorState>((set, get) => ({
  mode: 'select',
  zones: [],
  assets: [],
  selectedId: null,
  history: [],
  historyIndex: 0,
  
  setMode: (mode: DrawMode) => set({ mode }),
  
  addZone: (zone: Zone) => set((state) => ({
    zones: [...state.zones, zone],
    history: [...state.history.slice(0, state.historyIndex + 1), { type: 'add_zone', zone }],
    historyIndex: state.historyIndex + 1,
  })),
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    
    const action = history[historyIndex];
    // Apply reverse action (remove zone, restore old zone, etc.)
    set({ historyIndex: historyIndex - 1 });
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const action = history[historyIndex + 1];
    // Apply forward action
    set({ historyIndex: historyIndex + 1 });
  },
}));
```

### Auto-Save Debouncing
```typescript
const debouncedSave = useMemo(
  () => debounce(async (zones: Zone[], assets: Asset[]) => {
    await apiClient.put(`/api/layouts/${layoutId}`, { zones, assets });
    toast.success('Layout saved');
  }, 3000),
  [layoutId]
);

useEffect(() => {
  debouncedSave(zones, assets);
}, [zones, assets, debouncedSave]);
```

### MapLibre Zone Layer
```typescript
map.addLayer({
  id: 'zones-fill',
  type: 'fill',
  source: 'zones',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.4,
  },
});

map.addLayer({
  id: 'zones-outline',
  type: 'line',
  source: 'zones',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2,
  },
});
```

**Risks & Mitigations:**
- **Risk:** MapLibre draw mode conflicts with pan/zoom gestures  
  **Mitigation:** Use MapLibre Draw plugin, add mode toggle button
- **Risk:** Large layouts (100+ zones) cause performance issues  
  **Mitigation:** Virtualize layer rendering, lazy-load assets outside viewport

---

## TASK 5: Share Links & Export

**Goal:** Implement share link generation, public viewer, and export endpoints (GeoJSON, PNG).

**Estimated Subtasks:** 10-14

**Dependencies:** TASK 3 (backend API), TASK 4 (frontend editor)

**Completion Criteria:**
- ✅ ShareLinks repository, service, controller, routes
- ✅ Slug generation utility (8-char random, collision retry)
- ✅ Public share viewer page (`web/src/app/share/[slug]/page.tsx`)
- ✅ Export endpoint: `GET /api/layouts/:id/export?format=geojson` (GeoJSON download)
- ✅ Export endpoint: `GET /api/layouts/:id/export?format=png` (Sharp image generation)
- ✅ Export modal in Layout Editor (select format, resolution, watermark)
- ✅ Access logging (track view count per share link)
- ✅ Expiry check (cron job to clean up expired links)
- ✅ 40+ integration tests (Supertest + React Testing Library)
- ✅ Manual testing: Generate link, share with non-logged-in user, verify read-only mode

**API Endpoints:**
```
POST   /api/share-links           # Generate share link for layout
GET    /api/share-links           # List all links for a layout (owner only)
DELETE /api/share-links/:id       # Revoke share link

GET    /api/share/:slug           # Public viewer (no auth required)
GET    /api/layouts/:id/export    # Export layout (format: geojson|png|pdf)
```

**Key Implementation Details:**

### Slug Generation
```typescript
function generateSlug(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Avoid ambiguous chars (0/O, 1/l)
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

async function createShareLink(layoutId: number, expiryDate?: Date): Promise<ShareLink> {
  let slug = generateSlug();
  let attempts = 0;
  
  while (attempts < 5) {
    try {
      const link = await shareLinksRepo.create({ layout_id: layoutId, slug, expires_at: expiryDate });
      return link;
    } catch (err) {
      if (err.code === '23505') { // Postgres unique constraint violation
        slug = generateSlug();
        attempts++;
      } else {
        throw err;
      }
    }
  }
  
  throw new AppError('Failed to generate unique share link slug', 500, 'SLUG_GENERATION_FAILED');
}
```

### GeoJSON Export
```typescript
async function exportGeoJSON(layoutId: number): Promise<FeatureCollection> {
  const zones = await zonesRepo.listByLayoutId(layoutId);
  const assets = await assetsRepo.listByLayoutId(layoutId);
  
  const features: Feature[] = [
    ...zones.map((z) => ({
      type: 'Feature',
      geometry: z.boundary,
      properties: { name: z.name, zone_type: z.zone_type, surface: z.surface, color: z.color },
    })),
    ...assets.map((a) => ({
      type: 'Feature',
      geometry: a.geometry,
      properties: { name: a.name, asset_type: a.asset_type, ...a.properties },
    })),
  ];
  
  return {
    type: 'FeatureCollection',
    features,
  };
}
```

### PNG Export (Sharp)
```typescript
async function exportPNG(layoutId: number, width: number, height: number): Promise<Buffer> {
  // 1. Fetch layout data
  const geojson = await exportGeoJSON(layoutId);
  
  // 2. Render to SVG (simplified, actual implementation uses canvas-to-image library)
  const svg = renderGeoJSONToSVG(geojson, width, height);
  
  // 3. Convert SVG to PNG via Sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 80 })
    .toBuffer();
  
  return pngBuffer;
}
```

**Risks & Mitigations:**
- **Risk:** Sharp installation fails on Windows (native bindings)  
  **Mitigation:** Use html2canvas client-side as fallback, document Sharp install requirements
- **Risk:** Slug collisions in high-traffic scenario  
  **Mitigation:** Use longer slugs (12 chars) or UUID-based slugs, add retry logic

---

## TASK 6: Documentation & Deployment

**Goal:** Update documentation, README, deployment guides, and finalize CI/CD pipeline.

**Estimated Subtasks:** 8-12

**Dependencies:** TASK 4 (frontend complete), TASK 5 (backend complete)

**Completion Criteria:**
- ✅ Updated `README.md` with Field Layout Designer description, screenshots
- ✅ Updated `DEVELOPER_GUIDE.md` with new API endpoints, schemas, architecture
- ✅ Updated `LOCAL_SETUP.md` with migration instructions, seed data commands
- ✅ Created `DEPLOYMENT_GUIDE.md` (production env vars, database migration strategy)
- ✅ Updated `ROADMAP.md` with post-MVP features (PDF export, templates, offline mode)
- ✅ API documentation (OpenAPI 3.0 spec or Postman collection)
- ✅ CI/CD pipeline updated for new tests, type checks
- ✅ Production deployment dry-run (staging environment)
- ✅ User acceptance testing (5 alpha testers, feedback collected)
- ✅ Final code review and merge to `main`

**Documentation Updates:**

### README.md
```markdown
# Plottr - Field Layout Designer & Sharing Platform

Plottr is a geospatial tool for designing, editing, and sharing sports field layouts. Create detailed site maps with zones (pitches, goal areas) and assets (cones, goals, markers), then share them via public links or export as GeoJSON/PNG.

## Features
- 🗺️ Interactive layout editor with MapLibre GL
- 📐 PostGIS-powered area/perimeter calculations
- 🎨 Customizable zone colors, surfaces, types
- 🔗 Public share links with expiry dates
- 📥 Export to GeoJSON and PNG (PDF coming soon)
- 🏷️ Template library (public + private)
- 🔐 Clerk authentication with tier-based limits

## Quick Start
1. `docker compose up -d` (start PostgreSQL/PostGIS)
2. `npm install && npm run db:migrate && npm run db:seed`
3. `npm run dev` (backend on :3001)
4. `cd web && npm install && npm run dev` (frontend on :3000)
5. Open http://localhost:3000

## Architecture
- **Backend:** Express.js, PostgreSQL/PostGIS, TypeScript (CommonJS)
- **Frontend:** Next.js 14, React 18, MapLibre GL, TypeScript (ESM)
- **Testing:** Jest, Supertest, React Testing Library
- **Auth:** Clerk JWT validation

See `DEVELOPER_GUIDE.md` for detailed architecture.
```

### DEPLOYMENT_GUIDE.md
```markdown
# Deployment Guide

## Environment Variables (Production)

### Backend (.env)
```bash
DATABASE_URL=postgres://user:pass@prod-db.example.com:5432/plottr
PORT=3001
AUTH_REQUIRED=true
CLERK_SECRET_KEY=sk_live_...
MAPBOX_TOKEN=pk.ey...
NODE_ENV=production
LOG_LEVEL=INFO
```

### Frontend (web/.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.plottr.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

## Migration Strategy
1. Backup production database: `pg_dump plottr > backup_$(date +%Y%m%d).sql`
2. Run new migrations: `npm run db:migrate`
3. Verify migration: `psql -d plottr -c "\d sites"` (check schema)
4. Run Venues → Sites migration: `npm run migrate:venues-to-sites`
5. Validate data integrity: `SELECT COUNT(*) FROM sites; SELECT COUNT(*) FROM venues;`
6. Deploy backend: `npm run build && pm2 restart plottr-api`
7. Deploy frontend: `cd web && npm run build && pm2 restart plottr-web`

## Rollback Plan
If deployment fails:
1. Restore database: `psql plottr < backup_YYYYMMDD.sql`
2. Rollback migrations: `npm run db:rollback`
3. Revert code: `git revert <commit-hash>`
4. Redeploy previous version: `pm2 restart all`
```

**Risks & Mitigations:**
- **Risk:** Production migration loses data  
  **Mitigation:** Run migration in staging first, backup prod DB, test rollback procedure
- **Risk:** Documentation becomes outdated  
  **Mitigation:** Add CI check: fail build if DEVELOPER_GUIDE.md is >30 days old without updates

---

## Summary

### Task Breakdown
| Task | Subtasks | Est. Time | Dependencies |
|------|----------|-----------|--------------|
| **TASK 1: Database Schema** | 8-12 | 2-3 days | None |
| **TASK 2: Sites & Layouts API** | 12-16 | 3-4 days | TASK 1 |
| **TASK 3: Zones & Assets API** | 14-18 | 4-5 days | TASK 2 |
| **TASK 4: Layout Editor** | 16-22 | 5-7 days | TASK 3 |
| **TASK 5: Share Links & Export** | 10-14 | 3-4 days | TASK 3, TASK 4 |
| **TASK 6: Documentation & Deployment** | 8-12 | 2-3 days | TASK 4, TASK 5 |
| **Total** | **68-94 subtasks** | **19-26 days** | Sequential + Parallel |

### Critical Path
```
TASK 1 (3d) → TASK 2 (4d) → TASK 3 (5d) → TASK 4 (7d) → TASK 6 (3d) = 22 days
                                      ↘ TASK 5 (4d) ↗
```

**Parallel execution:** TASK 4 and TASK 5 can run concurrently after TASK 3 completes, saving ~4 days.  
**Optimized timeline:** 18-22 days with parallelization.

### Next Steps
1. **PAUSE HERE** - Awaiting "Go" signal from user
2. Upon "Go", generate detailed subtasks for TASK 1 (Database Schema)
3. Execute subtasks with tests, commits, and progress tracking
4. Repeat for TASK 2-6 with approval cadence

---

**Document Status:** Complete ✅  
**Action Required:** Approve parent tasks and provide "Go" signal to begin TASK 1 subtask generation
