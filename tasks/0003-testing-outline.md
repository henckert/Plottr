# Testing Strategy & Coverage Outline

**Task:** Field Layout Designer & Sharing Platform  
**Document:** Comprehensive Testing Architecture  
**Created:** 2025-10-20  
**Status:** Planning Phase (Step 3 of 5)

## Overview

This document defines the testing strategy for the Field Layout Designer pivot, organized into 6 layers: Unit Tests, Repository Tests, Service Tests, API Integration Tests, Frontend Component Tests, and CI/CD Validation. Each layer has specific coverage targets, tooling, and quality gates.

---

## Testing Layers

| Layer | Scope | Tool | Run Command | Coverage Target | Time Limit |
|-------|-------|------|-------------|-----------------|------------|
| **1. Unit Tests** | Pure logic, utilities, helpers | Jest | `npm run test:unit` | 95%+ | <2s total |
| **2. Repository Tests** | Knex queries, DB interactions | Jest + Supertest | `npm test tests/unit/data/**` | 90%+ | <5s total |
| **3. Service Tests** | Business logic, DTOs, validation | Jest | `npm test tests/unit/services/**` | 90%+ | <3s total |
| **4. API Integration Tests** | Full HTTP request/response | Jest + Supertest | `npm test tests/integration/**` | 85%+ | <10s total |
| **5. Frontend Component Tests** | React components, hooks | Jest + RTL | `cd web && npm test` | 80%+ | <5s total |
| **6. CI/CD Validation** | Type checks, lint, build | GitHub Actions | On push/PR | 100% pass | <2min total |

---

## Layer 1: Unit Tests

### Scope
- **What:** Pure functions with no external dependencies (no DB, no HTTP, no file I/O)
- **Examples:** Pagination utilities, geospatial validation, cursor encoding/decoding, DTO transformations

### Test Files Structure
```
tests/unit/
├── pagination.test.ts          # Cursor pagination helpers
├── geospatial.test.ts          # PostGIS polygon validation
├── lib/
│   ├── logger.test.ts          # Structured logging (mocked console)
│   └── rateLimitHeaders.test.ts # Rate limit header formatting
└── middleware/
    ├── auth.test.ts            # JWT parsing logic (mocked Clerk)
    └── tier.test.ts            # Feature gate checks
```

### Coverage Checklist

#### Pagination (`tests/unit/pagination.test.ts`)
- ✅ `encodeCursor()` - Encodes {id, sortValue} to base64
- ✅ `decodeCursor()` - Decodes base64 to {id, sortValue}
- ✅ `validatePaginationParams()` - Validates cursor format and limit bounds
- ✅ `paginateResults()` - Slices data, generates next_cursor, detects has_more
- ✅ Edge cases: Invalid base64, missing separator, non-numeric ID, limit out of range

#### Geospatial (`tests/unit/geospatial.test.ts`)
- ✅ `validatePolygonStructure()` - Checks GeoJSON type, coordinates array, closed rings
- ✅ `validateWGS84Bounds()` - Rejects lon/lat outside [-180,180] / [-90,90]
- ✅ `checkSelfIntersection()` - Detects crossing edges (Bentley-Ottmann)
- ✅ `validateWindingOrder()` - Enforces CCW winding (RFC 7946)
- ✅ `validatePitchPolygon()` - Master validator (runs all checks)
- 🔲 `validatePitchFitsInVenue()` - Checks Zone is within Site bbox (NEW for Field Layout Designer)

#### Logger (`tests/unit/lib/logger.test.ts`)
- ✅ `info()`, `warn()`, `error()` - Log at appropriate levels
- ✅ `child()` - Creates logger with additional context
- ✅ Request correlation IDs included in output
- ✅ JSON output in production mode, pretty-print in dev

### Quality Gates
- **Coverage:** 95%+ lines, branches, functions
- **Time:** <2 seconds total execution
- **Isolation:** No network, no DB, no file system
- **Determinism:** Same input = same output (no flakiness)

---

## Layer 2: Repository Tests

### Scope
- **What:** Knex query builders, raw SQL, DB schema validation
- **Examples:** CRUD operations, PostGIS queries, cursor-based pagination at DB layer

### Test Files Structure
```
tests/unit/data/
├── sites.repo.test.ts          # Sites CRUD (NEW)
├── layouts.repo.test.ts        # Layouts CRUD (NEW)
├── zones.repo.test.ts          # Zones CRUD + PostGIS area/perimeter (NEW)
├── assets.repo.test.ts         # Assets CRUD + geometry types (NEW)
├── templates.repo.test.ts      # Templates CRUD + search (NEW)
├── shareLinks.repo.test.ts     # Share links + expiry checks (NEW)
└── users.repo.test.ts          # User CRUD (existing, may need updates)
```

### Coverage Checklist (NEW Repositories)

#### Sites Repository
- 🔲 `create()` - Insert Site with location (POINT), bbox (POLYGON), return with version_token
- 🔲 `getById()` - Fetch by ID, include PostGIS ST_AsGeoJSON() for location/bbox
- 🔲 `listByClubId()` - Paginated list with cursor, filter by club_id
- 🔲 `update()` - Optimistic concurrency via version_token
- 🔲 `delete()` - Soft delete (set deleted_at timestamp)
- 🔲 Edge cases: Non-existent ID, stale version_token

#### Layouts Repository
- 🔲 `create()` - Insert Layout linked to Site (foreign key constraint)
- 🔲 `getById()` - Fetch with computed Zone count, Asset count
- 🔲 `listBySiteId()` - Paginated list, filter by site_id
- 🔲 `update()` - Name, description, is_published
- 🔲 `duplicate()` - Clone Layout + all Zones/Assets (transaction)
- 🔲 Edge cases: Orphaned layout (site_id references deleted Site)

#### Zones Repository
- 🔲 `create()` - Insert Zone with boundary (POLYGON), validate via PostGIS ST_IsValid()
- 🔲 `getById()` - Fetch with ST_Area(boundary) as `area_sqm`, ST_Perimeter() as `perimeter_m`
- 🔲 `listByLayoutId()` - All zones for a layout (not paginated, max 100 zones per layout)
- 🔲 `update()` - Update boundary, recompute area/perimeter
- 🔲 `delete()` - Hard delete (cascades to dependent entities)
- 🔲 Validation: Reject self-intersecting polygons, enforce max area (10 km²)
- 🔲 Edge cases: Overlapping zones (warning, not error), boundary outside Site bbox

#### Assets Repository
- 🔲 `create()` - Insert Asset with geometry (POINT or LINESTRING)
- 🔲 `getById()` - Fetch with ST_AsGeoJSON(geometry)
- 🔲 `listByLayoutId()` - All assets for a layout, grouped by type
- 🔲 `update()` - Move asset (update geometry coordinates)
- 🔲 `delete()` - Hard delete
- 🔲 Validation: Reject invalid geometry types (only POINT/LINESTRING allowed)
- 🔲 Edge cases: Asset outside all zones (allowed), duplicate coordinates

#### Templates Repository
- 🔲 `create()` - Insert Template with preview_geometry (JSON), set created_by
- 🔲 `getById()` - Fetch with user info (join users table)
- 🔲 `listPublic()` - Paginated list of is_public=true templates, order by popularity
- 🔲 `listByUserId()` - User's private templates
- 🔲 `search()` - Full-text search on name, description, tags (tsvector)
- 🔲 Edge cases: Malformed preview_geometry JSON, missing tags array

#### ShareLinks Repository
- 🔲 `create()` - Insert ShareLink with generated slug, optional expiry
- 🔲 `getBySlug()` - Fetch active link (not expired, not revoked)
- 🔲 `listByLayoutId()` - All share links for a layout
- 🔲 `revoke()` - Set is_revoked=true
- 🔲 `cleanup()` - Delete expired links older than 90 days (cron job)
- 🔲 Edge cases: Slug collision (retry with new slug), expired link access

### Quality Gates
- **Coverage:** 90%+ (allows for edge case SQL branches)
- **Time:** <5 seconds total execution
- **Isolation:** Uses `plottr_test` database (set `DATABASE_URL_TEST` before imports)
- **Cleanup:** `beforeAll`: migrate, `afterEach`: truncate tables, `afterAll`: rollback migrations

---

## Layer 3: Service Tests

### Scope
- **What:** Business logic, DTO mapping, Zod validation, error handling
- **Examples:** Service methods that call repositories, transform DB rows to typed DTOs, enforce business rules

### Test Files Structure
```
tests/unit/services/
├── sites.service.test.ts       # Site CRUD + geocoding (NEW)
├── layouts.service.test.ts     # Layout CRUD + duplication (NEW)
├── zones.service.test.ts       # Zone CRUD + area validation (NEW)
├── assets.service.test.ts      # Asset CRUD + geometry checks (NEW)
├── templates.service.test.ts   # Template search + application (NEW)
├── shareLinks.service.test.ts  # Share link generation + access control (NEW)
└── geocoding.service.test.ts   # Mapbox forward geocoding (existing)
```

### Coverage Checklist (NEW Services)

#### Sites Service
- 🔲 `create()` - Calls repo.create(), geocodes address via Mapbox, generates bbox from location
- 🔲 `get()` - Calls repo.getById(), throws 404 if not found
- 🔲 `listPaginated()` - Calls repo.listByClubId(), maps rows to SiteDTO
- 🔲 `update()` - Validates version_token, updates address → re-geocode if changed
- 🔲 `delete()` - Soft delete, checks no active Layouts
- 🔲 Validation: Reject Sites with invalid WGS84 coordinates
- 🔲 Error handling: Mapbox API failure → graceful degradation (use manual coordinates)

#### Layouts Service
- 🔲 `create()` - Calls repo.create(), initializes empty Zones/Assets arrays
- 🔲 `get()` - Calls repo.getById(), includes computed stats (zone count, asset count)
- 🔲 `listBySiteId()` - Paginated list, filters by is_published if non-owner
- 🔲 `update()` - Validates is_published toggle (can't unpublish if shared)
- 🔲 `duplicate()` - Calls repo.duplicate() in transaction, generates new version_token
- 🔲 Validation: Max 50 Layouts per Site (free tier), 500 (paid tier)
- 🔲 Error handling: Duplicate fails → rollback transaction

#### Zones Service
- 🔲 `create()` - Validates boundary via `validatePitchPolygon()`, checks Zone fits in Site bbox
- 🔲 `get()` - Calls repo.getById(), includes computed area_sqm, perimeter_m
- 🔲 `listByLayoutId()` - All zones, sorted by created_at
- 🔲 `update()` - Revalidates boundary, checks overlaps (warning only)
- 🔲 `delete()` - Checks no dependent Assets (or cascade delete)
- 🔲 Validation: Max 100 Zones per Layout, max area 10 km², no self-intersection
- 🔲 Error handling: PostGIS ST_MakeValid() if boundary has minor issues

#### Assets Service
- 🔲 `create()` - Validates geometry type (POINT or LINESTRING), checks within Layout bounds
- 🔲 `get()` - Calls repo.getById(), returns GeoJSON geometry
- 🔲 `listByLayoutId()` - All assets, grouped by asset_type (goal, cone, etc.)
- 🔲 `update()` - Move asset, validate new geometry
- 🔲 `delete()` - Hard delete
- 🔲 Validation: Max 500 Assets per Layout (free), 5000 (paid)
- 🔲 Error handling: Reject POLYGON geometry (not supported for Assets)

#### Templates Service
- 🔲 `create()` - Serializes preview_geometry from active Zones/Assets, sets created_by
- 🔲 `get()` - Calls repo.getById(), checks is_public or ownership
- 🔲 `listPublic()` - Paginated public templates, order by usage count
- 🔲 `search()` - Full-text search, filters by tags
- 🔲 `apply()` - Instantiate template Zones/Assets into target Layout (transaction)
- 🔲 Validation: Template must have >0 zones, preview_geometry must be valid JSON
- 🔲 Error handling: Apply fails → rollback, leave target Layout unchanged

#### ShareLinks Service
- 🔲 `create()` - Generates random slug (8 chars), validates expiry date
- 🔲 `getBySlug()` - Fetches link, checks not expired/revoked, logs access
- 🔲 `listByLayoutId()` - All links for owner, includes expiry status
- 🔲 `revoke()` - Sets is_revoked=true, returns updated link
- 🔲 Validation: Slug must be unique (retry up to 5 times), expiry must be future date
- 🔲 Error handling: Slug collision → generate new slug

### Quality Gates
- **Coverage:** 90%+ (allows for error path branches)
- **Time:** <3 seconds total execution
- **Mocking:** Mock repository calls (no actual DB), mock Mapbox API
- **Isolation:** Each test suite uses fresh service instance with mocked dependencies

---

## Layer 4: API Integration Tests

### Scope
- **What:** Full HTTP request/response cycle using Supertest
- **Examples:** POST /api/sites, GET /api/layouts/:id, PUT /api/zones/:id

### Test Files Structure
```
tests/integration/
├── sites.test.ts               # Sites CRUD endpoints (NEW)
├── layouts.test.ts             # Layouts CRUD + duplication (NEW)
├── zones.test.ts               # Zones CRUD + validation (NEW)
├── assets.test.ts              # Assets CRUD (NEW)
├── templates.test.ts           # Templates search + apply (NEW)
├── shareLinks.test.ts          # Share link generation + access (NEW)
├── export.test.ts              # Export endpoint (GeoJSON, PNG, PDF) (NEW)
└── auth.test.ts                # Auth middleware, tier gates (existing)
```

### Coverage Checklist (NEW Endpoints)

#### Sites API
- 🔲 `POST /api/sites` - Create site, validate 201 response, check location geocoded
- 🔲 `GET /api/sites/:id` - Fetch site by ID, validate GeoJSON shape
- 🔲 `GET /api/sites?club_id=X&cursor=Y` - Paginated list, validate next_cursor
- 🔲 `PUT /api/sites/:id` - Update site, enforce If-Match header, validate 200 or 409
- 🔲 `DELETE /api/sites/:id` - Soft delete, validate 204, check can't fetch deleted
- 🔲 Auth: Reject unauthenticated requests (401), enforce club_id ownership
- 🔲 Validation: Reject invalid coordinates (400), invalid bbox polygon (400)

#### Layouts API
- 🔲 `POST /api/layouts` - Create layout, link to site_id, validate 201
- 🔲 `GET /api/layouts/:id` - Fetch with zone/asset counts, validate computed fields
- 🔲 `GET /api/layouts?site_id=X` - Paginated list, filter by is_published for non-owners
- 🔲 `PUT /api/layouts/:id` - Update name/description, validate version_token
- 🔲 `POST /api/layouts/:id/duplicate` - Clone layout, validate new ID returned
- 🔲 `DELETE /api/layouts/:id` - Delete layout + zones/assets (cascade)
- 🔲 Auth: Enforce ownership or club membership
- 🔲 Tier gates: Max 50 layouts (free), 500 (paid)

#### Zones API
- 🔲 `POST /api/zones` - Create zone with boundary, validate area/perimeter computed
- 🔲 `GET /api/zones/:id` - Fetch zone, validate GeoJSON boundary
- 🔲 `GET /api/zones?layout_id=X` - All zones for layout (not paginated)
- 🔲 `PUT /api/zones/:id` - Update boundary, revalidate polygon
- 🔲 `DELETE /api/zones/:id` - Delete zone
- 🔲 Validation: Reject self-intersecting polygons (400), areas >10 km² (400), boundary outside site bbox (400)
- 🔲 Auth: Enforce layout ownership

#### Assets API
- 🔲 `POST /api/assets` - Create asset (POINT or LINESTRING)
- 🔲 `GET /api/assets/:id` - Fetch asset with GeoJSON geometry
- 🔲 `GET /api/assets?layout_id=X` - All assets, grouped by type
- 🔲 `PUT /api/assets/:id` - Move asset (update coordinates)
- 🔲 `DELETE /api/assets/:id` - Delete asset
- 🔲 Validation: Reject POLYGON geometry (400), invalid asset_type (400)
- 🔲 Tier gates: Max 500 assets (free), 5000 (paid)

#### Templates API
- 🔲 `POST /api/templates` - Create template from layout, serialize preview_geometry
- 🔲 `GET /api/templates/:id` - Fetch template, validate preview_geometry JSON
- 🔲 `GET /api/templates?q=soccer` - Search templates, validate pagination
- 🔲 `POST /api/templates/:id/apply` - Apply template to layout, validate zones/assets created
- 🔲 Auth: Public templates = no auth required, private templates = owner only
- 🔲 Validation: Template must have >0 zones (400)

#### ShareLinks API
- 🔲 `POST /api/share-links` - Generate share link, validate slug returned
- 🔲 `GET /api/share/:slug` - Access shared layout (read-only), no auth required
- 🔲 `GET /api/share-links?layout_id=X` - List all links for layout
- 🔲 `DELETE /api/share-links/:id` - Revoke link
- 🔲 Validation: Reject expired links (404), revoked links (404)
- 🔲 Auth: Create/list/revoke requires ownership, GET /api/share/:slug is public

#### Export API
- 🔲 `GET /api/layouts/:id/export?format=geojson` - Download GeoJSON FeatureCollection
- 🔲 `GET /api/layouts/:id/export?format=png` - Generate PNG snapshot (Sharp)
- 🔲 `GET /api/layouts/:id/export?format=pdf` - Generate PDF (future, return 501 for now)
- 🔲 Validation: Reject unknown formats (400), enforce max resolution (free vs paid)
- 🔲 Auth: Require ownership or valid share link

### Quality Gates
- **Coverage:** 85%+ (allows for edge case HTTP paths)
- **Time:** <10 seconds total execution
- **Database:** Uses `plottr_test`, truncates tables between tests
- **Isolation:** Each test suite runs in sequence (`--runInBand`) to avoid DB race conditions
- **Assertions:** Validate status codes, response schema (Zod parse), side effects (DB state)

---

## Layer 5: Frontend Component Tests

### Scope
- **What:** React components, hooks, user interactions
- **Examples:** Layout editor controls, site list, map layers, share link viewer

### Test Files Structure
```
web/tests/unit/
├── components/
│   ├── LayoutEditor/
│   │   ├── DrawControls.test.tsx       # Draw mode toggles (NEW)
│   │   ├── PropertyPanel.test.tsx      # Zone/Asset property editor (NEW)
│   │   └── LayerManager.test.tsx       # Show/hide zones/assets (NEW)
│   ├── SiteList/
│   │   ├── SiteCard.test.tsx           # Site preview card (NEW)
│   │   └── SiteMap.test.tsx            # MapLibre cluster map (NEW)
│   └── ShareViewer/
│       └── ReadOnlyLayout.test.tsx     # Public share link view (NEW)
├── hooks/
│   ├── useLayoutEditor.test.ts         # Editor state management (NEW)
│   ├── useSiteSearch.test.ts           # Site search/filter (NEW)
│   └── useMap.test.ts                  # MapLibre initialization (existing)
└── features/
    └── layoutExport.test.ts            # Export modal logic (NEW)
```

### Coverage Checklist (NEW Components)

#### Layout Editor Components
- 🔲 `DrawControls` - Toggle draw mode (zone/asset), validate button states
- 🔲 `PropertyPanel` - Edit zone name/color/surface, validate onChange callbacks
- 🔲 `LayerManager` - Show/hide zones/assets, validate MapLibre layer visibility
- 🔲 Integration: Click draw button → canvas switches to draw mode → click PropertyPanel field → value updates

#### Site Management Components
- 🔲 `SiteCard` - Render site name, address, layout count, validate onClick navigation
- 🔲 `SiteMap` - Render MapLibre map, validate cluster markers, validate click → navigate to site
- 🔲 `SiteForm` - Create/edit site, validate form submission, validate geocoding autocomplete

#### Share Viewer Components
- 🔲 `ReadOnlyLayout` - Render shared layout, validate no edit controls visible
- 🔲 `ExportButton` - Download GeoJSON, validate API call with correct slug
- 🔲 `ExpiredMessage` - Show expiry notice if link expired

#### Hooks
- 🔲 `useLayoutEditor` - Manage editor state (zones, assets, selectedId), validate actions
- 🔲 `useSiteSearch` - Debounce search input, call API, validate results
- 🔲 `useMap` - Initialize MapLibre, validate bounds set from site.bbox

### Quality Gates
- **Coverage:** 80%+ (allows for presentation-heavy components)
- **Time:** <5 seconds total execution
- **Mocking:** Mock MapLibre (jsdom doesn't support WebGL), mock API calls (axios)
- **Assertions:** Validate DOM structure (`getByRole`), user interactions (`userEvent.click`), async updates (`waitFor`)

---

## Layer 6: CI/CD Validation

### Scope
- **What:** Automated checks on every push/PR
- **Examples:** TypeScript type checks, linting, build, test suite

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: plottr_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run check:types
      - run: npm run lint
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3  # Upload coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd web && npm ci
      - run: cd web && npm run type-check
      - run: cd web && npm run lint
      - run: cd web && npm test -- --coverage
      - run: cd web && npm run build  # Next.js production build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npx playwright install --with-deps
      - run: npm run test:e2e  # Deferred to post-MVP
```

### Quality Gates
- **Type Check:** 100% pass (no TypeScript errors)
- **Lint:** 100% pass (ESLint rules enforced)
- **Tests:** All test suites pass (>85% coverage)
- **Build:** Next.js production build succeeds (no build errors)
- **Time:** <2 minutes total pipeline execution

---

## Testing Workflow

### Local Development
1. **Before commit:**
   - Run `npm run check:types` (backend)
   - Run `cd web && npm run type-check` (frontend)
   - Run `npm run test:unit` (fast feedback, <5s)
   - Husky pre-commit hook runs checks automatically

2. **Before push:**
   - Run `npm test` (full suite, ~15s)
   - Husky pre-push hook runs full tests

3. **Manual testing:**
   - Start dev servers: `npm run dev` (backend), `cd web && npm run dev` (frontend)
   - Test in browser: `http://localhost:3000`

### CI/CD Pipeline
1. **On push to main:**
   - Run full test suite (all 6 layers)
   - Upload coverage to Codecov
   - Deploy to staging (future)

2. **On pull request:**
   - Run full test suite
   - Require >85% coverage
   - Require all checks pass before merge

---

## Summary

### Coverage Targets by Layer
| Layer | Target | Current (Booking Platform) | Gap |
|-------|--------|---------------------------|-----|
| Unit Tests | 95% | ~90% | +5% (add geospatial edge cases) |
| Repository Tests | 90% | ~85% | +5% (add NEW repos: Sites, Layouts, Zones, Assets, Templates, ShareLinks) |
| Service Tests | 90% | ~85% | +5% (add NEW services) |
| API Integration Tests | 85% | ~80% | +5% (add NEW endpoints) |
| Frontend Component Tests | 80% | ~70% | +10% (add Layout Editor, Site Manager, Share Viewer) |
| CI/CD Validation | 100% | 100% | 0% (already passing) |

### Test Count Estimate
- **Current (Booking Platform):** ~500 tests across all layers
- **After Field Layout Designer Pivot:** ~800-1000 tests (60% increase)
- **Breakdown:**
  - Unit: 150 → 200 (+50)
  - Repository: 100 → 200 (+100, 6 new repos x ~15 tests each)
  - Service: 120 → 220 (+100, 6 new services x ~15 tests each)
  - API Integration: 80 → 180 (+100, 6 new endpoint suites x ~15 tests each)
  - Frontend Component: 50 → 200 (+150, Layout Editor + Site Manager + Share Viewer)

### Next Steps
1. **Step 4:** Generate Parent Tasks (DB migrations, Backend API, Frontend editor, Share links, Docs)
2. **Step 5:** Wait for "Go" signal before subtask generation

---

**Document Status:** Complete ✅  
**Action Required:** Review and approve before proceeding to Step 4
