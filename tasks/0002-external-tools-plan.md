# External Tools & Dependencies Plan

**Task:** Field Layout Designer & Sharing Platform  
**Document:** External Tools Inventory & Integration Strategy  
**Created:** 2025-10-20  
**Status:** Planning Phase (Step 2 of 5)

## Overview

This document inventories all external tools, libraries, services, and dependencies required to implement the Field Layout Designer pivot. Each tool is categorized by domain (database, geospatial, testing, etc.) with specific version requirements, integration points, and configuration needs.

---

## 1. Database & Storage

### PostgreSQL 16 with PostGIS 3.4
- **Current Version:** `postgis/postgis:16-3.4` (Docker)
- **Purpose:** Primary relational database with geospatial extensions
- **Integration Points:**
  - Sites table: `location` (POINT), `bbox` (POLYGON)
  - Zones table: `boundary` (POLYGON), computed area/perimeter
  - Assets table: `geometry` (POINT/LINESTRING)
  - Templates table: `preview_geometry` (JSON snapshot)
- **Configuration:**
  - SRID 4326 (WGS84) for all geography types
  - PostGIS functions: `ST_Area()`, `ST_Perimeter()`, `ST_Contains()`, `ST_Intersects()`, `ST_IsValid()`, `ST_MakeValid()`, `ST_GeomFromGeoJSON()`
  - Connection pooling via Knex (min: 2, max: 10)
- **Testing Requirements:**
  - Separate `plottr_test` database instance
  - Migrations must run before tests via `knex.migrate.latest()`
  - PostGIS extension must be enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- **Status:** ✅ Already configured (docker-compose.yml)

### Knex.js Query Builder
- **Current Version:** `^3.1.0`
- **Purpose:** Raw SQL query builder (no ORM)
- **Integration Points:**
  - All repositories in `src/data/*.repo.ts`
  - Migration management: `npm run db:migrate`, `npm run db:rollback`
  - Seed data: `npm run db:seed`
- **Configuration:**
  - CommonJS module: `src/db/knexfile.ts`
  - Environment-based connection strings: `DATABASE_URL` (dev), `DATABASE_URL_TEST` (tests)
  - Migration path: `src/db/migrations/*.ts`
  - Seeds path: `src/db/seeds/*.ts`
- **Critical Pattern:**
  - Set `DATABASE_URL_TEST` **before** importing `getKnex()` to avoid module-load race
  - Example: `tests/integration/*.test.ts:2`
- **Status:** ✅ Already configured

---

## 2. Geospatial Libraries

### MapLibre GL JS 3.6
- **Purpose:** Frontend map rendering (Mapbox GL fork)
- **Integration Points:**
  - Layout editor canvas (`web/src/components/LayoutEditor/`)
  - Site overview maps (`web/src/components/SiteViewer/`)
  - Interactive polygon drawing for Zones
  - Asset placement (markers, lines)
- **Key Features:**
  - Vector tile rendering
  - WebGL-based performance
  - Custom layer support for Zones/Assets
  - GeoJSON data source integration
- **Configuration:**
  - Style: Mapbox Streets (or custom Maptiler/OSM styles)
  - Initial bounds from Site.bbox
  - Controls: Zoom, rotation, fullscreen
- **Testing Requirements:**
  - Mock MapLibre instance in Jest (jsdom doesn't support WebGL)
  - Snapshot tests for layer configs
- **Status:** ✅ Already installed (`web/package.json`)

### Turf.js 7.x
- **Purpose:** Client-side geospatial calculations
- **Integration Points:**
  - Zone area/perimeter validation (matches PostGIS server-side)
  - Polygon simplification for exports
  - Bounding box calculations
  - Overlap detection (Zone vs Zone, Zone vs Asset)
  - Centroid calculation for labels
- **Key Functions:**
  - `area()` - Compute polygon area in km²
  - `length()` - Compute perimeter/line length
  - `booleanContains()` - Check if Asset is within Zone
  - `booleanIntersects()` - Detect Zone overlaps
  - `bbox()` - Calculate bounding box
  - `centroid()` - Find polygon center
  - `simplify()` - Reduce polygon complexity for exports
- **Configuration:**
  - Tree-shakeable imports: `import { area } from '@turf/area'`
  - Unit preferences: `{ units: 'kilometers' }`
- **Testing Requirements:**
  - Unit tests for validation logic parity with PostGIS
  - Edge cases: self-intersecting polygons, too-large geometries
- **Status:** 🔲 Needs installation (`npm install @turf/helpers @turf/area @turf/length @turf/boolean-contains @turf/bbox @turf/centroid @turf/simplify`)

### GeoJSON Specification (RFC 7946)
- **Purpose:** Standard geometry format for API responses and exports
- **Integration Points:**
  - All API responses serialize PostGIS geometries to GeoJSON
  - Export endpoint: `/api/layouts/:id/export?format=geojson`
  - Frontend GeoJSON layers in MapLibre
- **Validation:**
  - Server-side: `src/lib/geospatial.ts` (polygon structure, WGS84 bounds, winding order)
  - Client-side: Turf.js validation helpers
- **Status:** ✅ Already implemented

---

## 3. Backend Testing Tools

### Jest 29.x
- **Current Version:** `^29.7.0`
- **Purpose:** Unit and integration test runner
- **Configuration:** `jest.config.cjs`
  - Preset: `ts-jest`
  - Test environment: `node` (backend), `jsdom` (frontend)
  - Setup files: `tests/setup/env.ts` (env vars), `tests/setup/db.ts` (migrations)
  - Teardown: `tests/setup/teardown.ts` (close Knex pool)
  - Coverage: `src/**/*.ts` (exclude migrations, seeds)
- **Run Modes:**
  - `npm test` - All tests with `--runInBand` (avoids DB race conditions)
  - `npm run test:unit` - Exclude integration/migration tests
  - `npm run test:watch` - Watch mode for TDD
- **Known Issues:**
  - "Jest did not exit" warning - open Knex handles (needs global teardown)
  - Noisy test logs - logger should respect `NODE_ENV=test`
- **Status:** ✅ Configured (needs teardown fix per your earlier feedback)

### Supertest 6.x
- **Current Version:** `^6.3.3`
- **Purpose:** HTTP integration testing (superagent wrapper)
- **Integration Points:**
  - All `tests/integration/*.test.ts` files
  - Tests full request/response cycle without starting server
  - Example: `tests/integration/venues.test.ts`
- **Pattern:**
  ```typescript
  import request from 'supertest';
  import app from '@/app';
  
  it('should create a site', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', 'Bearer mock-token')
      .send({ name: 'Test Site', location: { ... } });
    expect(res.status).toBe(201);
  });
  ```
- **Status:** ✅ Already installed

### ts-jest
- **Current Version:** `^29.1.1`
- **Purpose:** TypeScript transformer for Jest
- **Configuration:**
  - Preset: `ts-jest/presets/default-esm` (frontend), `ts-jest` (backend)
  - Path aliases: `@/*` → `src/*` (backend), `@/*` → `web/src/*` (frontend)
  - Transformer: Compiles TS on-the-fly during tests
- **Status:** ✅ Already configured

---

## 4. Frontend Testing Tools

### React Testing Library 14.x
- **Purpose:** Component testing with accessibility focus
- **Integration Points:**
  - `web/tests/unit/components/**/*.test.tsx`
  - Layout editor controls (draw mode toggles, property panels)
  - Site list/detail views
  - Share link viewer (read-only mode)
- **Key Utilities:**
  - `render()` - Mount component in jsdom
  - `screen.getByRole()` - Query by ARIA role
  - `userEvent.click()` - Simulate user interactions
  - `waitFor()` - Async assertions
- **Status:** ✅ Already installed

### Playwright (Future - E2E Tests)
- **Purpose:** End-to-end browser automation
- **Integration Points:**
  - Full user flows: Create site → Draw zones → Add assets → Share link
  - Cross-browser testing (Chromium, Firefox, WebKit)
  - Visual regression tests (screenshots)
- **Configuration:**
  - Test directory: `tests/e2e/`
  - Browsers: Chromium (primary), Firefox (secondary)
  - Base URL: `http://localhost:3000` (Next.js dev server)
- **Status:** 🔲 Not yet installed (defer to post-MVP)

---

## 5. Authentication & Authorization

### Clerk SDK
- **Backend:** `@clerk/backend` (JWT verification)
- **Frontend:** `@clerk/nextjs` (React hooks, middleware)
- **Integration Points:**
  - Middleware: `src/middleware/auth.ts` (JWT validation)
  - Frontend: `web/src/app/layout.tsx` (ClerkProvider)
  - User context: `req.user.clerkId`, `req.user.tier`
- **Configuration:**
  - Environment variables: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Dev mode bypass: `AUTH_REQUIRED=false` (injects mock user `dev-user-123`)
- **Testing:**
  - Mock JWT tokens in integration tests
  - Mock `useUser()` hook in React Testing Library
- **Status:** ✅ Already configured

---

## 6. API & Validation

### Zod 3.x
- **Current Version:** `^3.22.4`
- **Purpose:** Schema validation and TypeScript type inference
- **Integration Points:**
  - All schemas in `src/schemas/*.schema.ts`
  - Parse request bodies in services (not controllers)
  - Export types: `export type Site = z.infer<typeof SiteSchema>`
- **Pattern:**
  ```typescript
  // src/schemas/sites.schema.ts
  export const SiteCreateSchema = z.object({
    club_id: z.number().int().positive(),
    name: z.string().min(1).max(200),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
  });
  ```
- **Status:** ✅ Already installed

### Express.js 4.x
- **Current Version:** `^4.18.2`
- **Purpose:** HTTP server framework
- **Middleware Stack:**
  1. `helmet` - Security headers
  2. `cors` - CORS configuration
  3. `express-rate-limit` - Rate limiting
  4. `morgan` (dev) / `logging middleware` (prod) - Request logging
  5. `express.json()` - JSON body parsing
  6. `authMiddleware` - JWT validation
  7. `tierMiddleware` - Feature gate by user tier
  8. Error handler - `AppError` formatting
- **Status:** ✅ Already configured

---

## 7. Export & File Processing

### Multer 1.x
- **Current Version:** `^1.4.5-lts.1`
- **Purpose:** Multipart/form-data file uploads (KML/GeoJSON import)
- **Configuration:**
  - Storage: Memory storage (buffer in RAM)
  - File filter: `.geojson`, `.json`, `.kml`, `.xml` only
  - Size limit: 10 MB per file
- **Integration Points:**
  - `POST /api/geometries/import` (current booking feature)
  - Future: `POST /api/layouts/:id/import` (import template)
- **Known Issue:**
  - File filter throws 500 instead of 400 (needs `AppError` fix)
- **Status:** ✅ Installed (needs error handling patch)

### Sharp (Image Processing)
- **Purpose:** Generate PNG exports from SVG canvas snapshots
- **Integration Points:**
  - `POST /api/layouts/:id/export` with `format=png`
  - Convert MapLibre canvas to raster image
  - Watermark for free tier users
- **Configuration:**
  - Max resolution: 4096x4096 (free), 8192x8192 (paid)
  - Quality: 80% JPEG compression
- **Status:** 🔲 Not yet installed (`npm install sharp`)

### html2canvas (Alternative to Sharp)
- **Purpose:** Client-side canvas-to-image export
- **Integration Points:**
  - Export button in Layout Editor
  - Capture MapLibre canvas + UI overlays
- **Pros:** No server dependency, faster for small layouts
- **Cons:** Limited control over resolution, browser-dependent
- **Status:** 🔲 Decision pending (Sharp vs html2canvas)

---

## 8. Development & Build Tools

### TypeScript 5.x
- **Current Version:** `^5.2.2`
- **Configuration:**
  - Backend: `tsconfig.json` (CommonJS, Node target)
  - Frontend: `web/tsconfig.json` (ESM, ES2020 target)
  - Path aliases: `@/*` → `src/*`
- **Build Commands:**
  - Backend: `tsc --build` (compile to `dist/`)
  - Frontend: `next build` (Next.js production build)
- **Type Checking:**
  - `npm run check:types` (backend)
  - `cd web && npm run type-check` (frontend)
- **Status:** ✅ Already configured

### ts-node
- **Current Version:** `^10.9.1`
- **Purpose:** Execute TypeScript files directly (dev mode)
- **Usage:**
  - `npm run dev` → `ts-node -r tsconfig-paths/register src/index.ts`
  - Migration scripts
- **Status:** ✅ Already configured

### tsconfig-paths
- **Current Version:** `^4.2.0`
- **Purpose:** Resolve `@/*` path aliases at runtime
- **Integration:**
  - `ts-node -r tsconfig-paths/register`
  - Jest transformer config
- **Status:** ✅ Already installed

### Husky + Lint-Staged
- **Purpose:** Git hooks for code quality
- **Configuration:**
  - Pre-commit: `npm run check:types && npm run test:unit`
  - Pre-push: `npm test` (full suite)
- **Status:** ✅ Already configured

---

## 9. Deployment & Infrastructure

### Docker & Docker Compose
- **Current Setup:**
  - PostgreSQL/PostGIS: `postgis/postgis:16-3.4`
  - Port: 5432 (mapped to host)
  - Volume: `plottr_postgres_data` (persistent)
- **Commands:**
  - `docker compose up -d` - Start database
  - `docker compose down` - Stop database
  - `docker compose logs -f` - View logs
- **Status:** ✅ Already configured

### Environment Variables
- **Backend (`.env`):**
  - `DATABASE_URL` - PostgreSQL connection string
  - `DATABASE_URL_TEST` - Test database connection
  - `PORT` - Server port (default: 3001)
  - `AUTH_REQUIRED` - Clerk auth bypass for dev (default: false)
  - `CLERK_SECRET_KEY` - Clerk API key
  - `MAPBOX_TOKEN` - Geocoding API (optional, graceful degradation)
- **Frontend (`web/.env.local`):**
  - `NEXT_PUBLIC_API_BASE_URL` - Backend API URL
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
  - `NEXT_PUBLIC_MAPBOX_TOKEN` - MapLibre style access
- **Status:** ✅ Documented in `LOCAL_SETUP.md`

---

## 10. Future Tools (Post-MVP)

### Redis (Rate Limiting & Caching)
- **Purpose:** Distributed rate limiting, geocoding cache
- **Integration Points:**
  - Replace in-memory rate limiter with Redis store
  - Cache Mapbox geocoding responses
- **Status:** 🔲 Deferred to v2

### S3-Compatible Storage (Template Previews)
- **Purpose:** Store template preview images
- **Providers:** AWS S3, Cloudflare R2, Backblaze B2
- **Integration Points:**
  - Template.preview_url → S3 object URL
- **Status:** 🔲 Deferred to v2

### PDF Generation (jsPDF + Canvas2PDF)
- **Purpose:** High-quality PDF exports with vector graphics
- **Integration Points:**
  - Export endpoint: `format=pdf`
  - Include site metadata, legend, scale bar
- **Status:** 🔲 Deferred to v2

---

## Summary

### Ready to Use (No Installation Required)
✅ PostgreSQL 16 + PostGIS 3.4 (Docker)  
✅ Knex.js query builder  
✅ MapLibre GL JS 3.6  
✅ Jest 29.x + Supertest  
✅ React Testing Library  
✅ Clerk SDK (backend + frontend)  
✅ Zod schema validation  
✅ Express.js framework  
✅ Multer file uploads  
✅ TypeScript 5.x + ts-node  
✅ Husky + Lint-Staged  
✅ Docker Compose  

### Requires Installation
🔲 **Turf.js** - `npm install @turf/helpers @turf/area @turf/length @turf/boolean-contains @turf/bbox @turf/centroid @turf/simplify`  
🔲 **Sharp** - `npm install sharp` (image processing for PNG exports)  

### Deferred to Post-MVP
🔲 Playwright (E2E tests)  
🔲 Redis (rate limiting, caching)  
🔲 S3 storage (template previews)  
🔲 jsPDF (vector PDF exports)  

---

## Next Steps

1. **Step 3:** Generate Testing Outline (unit/repo/service/API/frontend/CI layers)
2. **Step 4:** Generate Parent Tasks (DB migrations, backend API, frontend editor, share links, docs)
3. **Step 5:** Wait for "Go" signal before subtask generation

---

**Document Status:** Complete ✅  
**Action Required:** Review and approve before proceeding to Step 3
