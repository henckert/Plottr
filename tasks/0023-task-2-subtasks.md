# TASK 2: Backend API - Sites & Layouts CRUD - Subtasks

**Task:** Backend API Development - Sites & Layouts  
**Document:** Detailed Subtask Breakdown  
**Created:** 2025-10-20  
**Status:** Ready to Execute  
**Parent Task:** [tasks/0004-parent-tasks.md](./0004-parent-tasks.md)  
**Prerequisite:** TASK 1 (Database Schema) - ✅ COMPLETE

---

## Overview

TASK 2 implements RESTful CRUD APIs for Sites and Layouts, building on the database schema from TASK 1. This includes repositories (Knex raw SQL), services (business logic + PostGIS), controllers (HTTP handlers), Zod schemas, and integration tests. All endpoints follow cursor-based pagination and optimistic concurrency (version tokens).

**Estimated Subtasks:** 14  
**Estimated Time:** 3-4 days  
**Dependencies:** TASK 1 complete (migrations 0007-0013 applied)

---

## Subtask Execution Order

```
2.1: Sites Repository (Knex + PostGIS queries)
  ↓
2.2: Sites Service (geocoding, bbox generation, PostGIS validation)
  ↓
2.3: Sites Zod Schemas (validation for create/update/response)
  ↓
2.4: Sites Controller (HTTP handlers with version tokens)
  ↓
2.5: Sites Routes (Express router registration)
  ↓
2.6: Sites Integration Tests (Supertest - 15+ tests)
  ↓
2.7: Layouts Repository (Knex with duplication logic)
  ↓
2.8: Layouts Service (tier gates, version management)
  ↓
2.9: Layouts Zod Schemas (validation for create/update/response)
  ↓
2.10: Layouts Controller (version tokens, If-Match headers)
  ↓
2.11: Layouts Routes (Express router registration)
  ↓
2.12: Layouts Integration Tests (Supertest - 20+ tests)
  ↓
2.13: Share Link Expiration Middleware (Q-3 from PRD)
  ↓
2.14: TASK 2 Completion Summary (documentation)
```

**Parallel Opportunities:** None (sequential dependencies through repositories → services → controllers)

---

## Subtask 2.1: Sites Repository

**Goal:** Implement `SitesRepository` with CRUD operations using raw Knex queries + PostGIS functions.

### Acceptance Criteria
- [ ] File created: `src/data/sites.repo.ts`
- [ ] Implements interface:
  ```typescript
  interface SitesRepository {
    create(data: SiteCreateInput): Promise<Site>
    findById(id: number): Promise<Site | null>
    findByClubId(clubId: number, limit: number, cursor?: string): Promise<Site[]>
    update(id: number, data: SiteUpdateInput): Promise<Site | null>
    softDelete(id: number): Promise<boolean>
    checkVersionToken(id: number, token: string): Promise<boolean>
  }
  ```
- [ ] All queries use raw Knex (no Objection.js models)
- [ ] PostGIS queries:
  - `ST_GeogFromText()` for location/bbox insertion
  - `ST_AsText()` for location/bbox retrieval
  - `ST_X()`, `ST_Y()` for coordinate extraction
- [ ] Cursor pagination:
  - Fetch `limit+1` records
  - Filter by `(id > cursor_id OR (id = cursor_id AND updated_at > cursor_updated_at))`
- [ ] Soft delete: sets `deleted_at` timestamp (not hard delete)
- [ ] Version token check: returns boolean for optimistic concurrency

### Implementation Details
```typescript
// src/data/sites.repo.ts
import { getKnex } from './knex';
import type { Knex } from 'knex';

export interface SiteCreateInput {
  club_id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: { lon: number; lat: number }; // Will be converted to ST_GeogFromText
  bbox?: GeoJSON.Polygon; // Will be converted to ST_GeogFromText
}

export interface SiteUpdateInput {
  name?: string;
  address?: string;
  // ... other fields
}

export interface Site {
  id: number;
  club_id: number;
  name: string;
  address?: string;
  location?: GeoJSON.Point;
  bbox?: GeoJSON.Polygon;
  version_token: string;
  created_at: string;
  updated_at: string;
}

export class SitesRepository {
  async create(data: SiteCreateInput): Promise<Site> {
    const knex = getKnex();
    
    const insertData: any = {
      club_id: data.club_id,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postal_code: data.postal_code,
      version_token: knex.raw('gen_random_uuid()'),
    };
    
    // Convert location to PostGIS geography
    if (data.location) {
      insertData.location = knex.raw(
        `ST_GeogFromText('POINT(${data.location.lon} ${data.location.lat})')`
      );
    }
    
    // Convert bbox to PostGIS geography
    if (data.bbox) {
      const coords = data.bbox.coordinates[0]
        .map(([lon, lat]) => `${lon} ${lat}`)
        .join(',');
      insertData.bbox = knex.raw(
        `ST_GeogFromText('POLYGON((${coords}))')`
      );
    }
    
    const [row] = await knex('sites').insert(insertData).returning('*');
    return this.mapRow(row);
  }
  
  async findById(id: number): Promise<Site | null> {
    const knex = getKnex();
    const row = await knex('sites')
      .where({ id })
      .whereNull('deleted_at')
      .first();
    return row ? this.mapRow(row) : null;
  }
  
  private mapRow(row: any): Site {
    // Convert PostGIS geography to GeoJSON
    // Handle Buffer objects from PostGIS columns
    // Return typed Site object
  }
}
```

### Files Modified
- `src/data/sites.repo.ts` (NEW)

### Testing Strategy
- Unit tests: Mock Knex, test query building logic
- Integration tests: Validate against real PostgreSQL in Subtask 2.6

### Time Estimate
**2-3 hours**

---

## Subtask 2.2: Sites Service

**Goal:** Implement `SitesService` with business logic for geocoding, bbox generation, and PostGIS validation.

### Acceptance Criteria
- [ ] File created: `src/services/sites.service.ts`
- [ ] Implements interface:
  ```typescript
  interface SitesService {
    create(data: SiteCreateInput): Promise<Site>
    get(id: number): Promise<Site | null>
    listByClubId(clubId: number, limit: number, cursor?: string): Promise<Site[]>
    update(id: number, versionToken: string, data: SiteUpdateInput): Promise<Site>
    delete(id: number, versionToken: string): Promise<boolean>
  }
  ```
- [ ] Geocoding flow:
  - If `address` provided and Mapbox available: call `forwardGeocode()` to get location
  - If geocoding fails or Mapbox unavailable: proceed without location (nullable)
  - If `location` manually provided: use it (overrides geocoding)
- [ ] Bbox generation (optional for MVP):
  - If user draws bbox manually: use it
  - If no bbox provided: skip (nullable column)
- [ ] PostGIS validation:
  - Reuse `src/lib/geospatial.ts` validation functions
  - Validate bbox is valid polygon (ST_IsValid)
- [ ] Version token checks:
  - Call `repo.checkVersionToken(id, token)` before update/delete
  - Throw `AppError(409, 'VERSION_CONFLICT')` if mismatch
- [ ] Map repository untyped rows to typed `Site` objects

### Implementation Details
```typescript
// src/services/sites.service.ts
import { SitesRepository, SiteCreateInput, Site } from '../data/sites.repo';
import { forwardGeocode } from './geocode.service';
import { validatePitchPolygon } from '../lib/geospatial'; // Reuse for bbox
import { AppError } from '../errors';

export class SitesService {
  private repo = new SitesRepository();
  
  async create(data: SiteCreateInput): Promise<Site> {
    // Attempt geocoding if address provided
    if (data.address && !data.location) {
      try {
        const geocodeResult = await forwardGeocode(data.address, 1);
        if (geocodeResult.features?.length > 0) {
          const [lon, lat] = geocodeResult.features[0].center;
          data.location = { lon, lat };
        }
      } catch (err) {
        // Log warning but proceed (location is nullable)
        console.warn('Geocoding failed:', err);
      }
    }
    
    // Validate bbox if provided
    if (data.bbox) {
      const validationError = validatePitchPolygon(data.bbox);
      if (validationError) {
        throw new AppError(validationError.message, 400, validationError.code);
      }
    }
    
    return await this.repo.create(data);
  }
  
  async update(id: number, versionToken: string, data: SiteUpdateInput): Promise<Site> {
    // Check version token
    const isValid = await this.repo.checkVersionToken(id, versionToken);
    if (!isValid) {
      throw new AppError('Version conflict - site was modified by another user', 409, 'VERSION_CONFLICT');
    }
    
    const updated = await this.repo.update(id, data);
    if (!updated) {
      throw new AppError('Site not found', 404, 'NOT_FOUND');
    }
    return updated;
  }
}
```

### Files Modified
- `src/services/sites.service.ts` (NEW)

### Testing Strategy
- Unit tests: Mock repository, test geocoding flow, version token logic
- Integration tests: Validate end-to-end in Subtask 2.6

### Time Estimate
**3-4 hours**

---

## Subtask 2.3: Sites Zod Schemas

**Goal:** Create Zod validation schemas for Sites API requests/responses.

### Acceptance Criteria
- [ ] File created: `src/schemas/sites.schema.ts`
- [ ] Schemas defined:
  ```typescript
  export const SiteCreateSchema = z.object({
    club_id: z.number().int().positive(),
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    country: z.string().max(50).optional().default('USA'),
    postal_code: z.string().max(20).optional(),
    location: z.object({
      lon: z.number().min(-180).max(180),
      lat: z.number().min(-90).max(90),
    }).optional(),
    bbox: z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    }).optional(),
  });
  
  export const SiteUpdateSchema = SiteCreateSchema.partial().omit({ club_id: true });
  
  export const SiteResponseSchema = z.object({
    id: z.number(),
    club_id: z.number(),
    name: z.string(),
    // ... all fields
    version_token: z.string().uuid(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  });
  
  export const SitesListResponseSchema = z.object({
    data: z.array(SiteResponseSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean(),
  });
  ```
- [ ] Export inferred types:
  ```typescript
  export type SiteCreate = z.infer<typeof SiteCreateSchema>;
  export type SiteUpdate = z.infer<typeof SiteUpdateSchema>;
  export type Site = z.infer<typeof SiteResponseSchema>;
  ```
- [ ] GeoJSON validation: bbox coordinates must be valid polygon (closed ring)

### Files Modified
- `src/schemas/sites.schema.ts` (NEW)

### Testing Strategy
- Unit tests: Validate schema parsing with valid/invalid inputs
- Integration tests: Validate API responses match schema

### Time Estimate
**1-2 hours**

---

## Subtask 2.4: Sites Controller

**Goal:** Implement HTTP handlers for Sites CRUD endpoints with version token checks.

### Acceptance Criteria
- [ ] File created: `src/controllers/sites.controller.ts`
- [ ] Endpoints implemented:
  ```typescript
  export async function createSite(req, res, next) { /* POST /api/sites */ }
  export async function getSite(req, res, next) { /* GET /api/sites/:id */ }
  export async function listSites(req, res, next) { /* GET /api/sites */ }
  export async function updateSite(req, res, next) { /* PUT /api/sites/:id */ }
  export async function deleteSite(req, res, next) { /* DELETE /api/sites/:id */ }
  ```
- [ ] Request validation:
  - Parse body with Zod schemas
  - Return 400 with validation errors if schema fails
- [ ] Query params:
  - `cursor` (string, optional) - for pagination
  - `limit` (number, optional, default 50, max 100) - page size
  - `club_id` (number, optional) - filter by club
- [ ] Version token handling:
  - `PUT` and `DELETE` require `If-Match` header
  - Extract version token from header, pass to service
  - Return 400 if header missing
- [ ] Pagination:
  - Use `validatePaginationParams()` from `src/lib/pagination.ts`
  - Fetch `limit+1` records from service
  - Call `paginateResults()` to build response
- [ ] Response format:
  - Single resource: `{ data: Site }`
  - List: `{ data: Site[], next_cursor?: string, has_more: boolean }`
- [ ] Error handling:
  - Wrap in try/catch, call `next(err)` for middleware to handle

### Implementation Details
```typescript
// src/controllers/sites.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SitesService } from '../services/sites.service';
import { SiteCreateSchema, SiteUpdateSchema, SitesListResponseSchema } from '../schemas/sites.schema';
import { AppError } from '../errors';
import { validatePaginationParams, paginateResults } from '../lib/pagination';

const service = new SitesService();

export async function createSite(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SiteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }
    
    const created = await service.create(parsed.data);
    return res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateSite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const ifMatch = req.headers['if-match'];
    
    if (!ifMatch) {
      return res.status(400).json({
        error: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for PUT requests',
      });
    }
    
    const parsed = SiteUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parsed.error.errors,
      });
    }
    
    const updated = await service.update(id, ifMatch as string, parsed.data);
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
```

### Files Modified
- `src/controllers/sites.controller.ts` (NEW)

### Testing Strategy
- Integration tests: Supertest HTTP tests in Subtask 2.6

### Time Estimate
**2-3 hours**

---

## Subtask 2.5: Sites Routes

**Goal:** Register Sites API routes in Express app.

### Acceptance Criteria
- [ ] File created: `src/routes/sites.routes.ts`
- [ ] Routes registered:
  ```typescript
  POST   /api/sites
  GET    /api/sites/:id
  GET    /api/sites
  PUT    /api/sites/:id
  DELETE /api/sites/:id
  ```
- [ ] Middleware applied:
  - Auth middleware (Clerk JWT validation) on all routes
  - Rate limiting (if implemented)
- [ ] Router exported and imported in `src/app.ts`

### Implementation Details
```typescript
// src/routes/sites.routes.ts
import { Router } from 'express';
import * as sitesController from '../controllers/sites.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware); // Apply to all routes

router.post('/', sitesController.createSite);
router.get('/:id', sitesController.getSite);
router.get('/', sitesController.listSites);
router.put('/:id', sitesController.updateSite);
router.delete('/:id', sitesController.deleteSite);

export default router;
```

```typescript
// src/app.ts (update)
import sitesRoutes from './routes/sites.routes';
// ...
app.use('/api/sites', sitesRoutes);
```

### Files Modified
- `src/routes/sites.routes.ts` (NEW)
- `src/app.ts` (MODIFY - add route registration)

### Testing Strategy
- Integration tests: Verify routes are accessible via Supertest

### Time Estimate
**1 hour**

---

## Subtask 2.6: Sites Integration Tests

**Goal:** Write Supertest integration tests for all Sites endpoints.

### Acceptance Criteria
- [ ] File created: `tests/integration/sites.test.ts`
- [ ] Test suites (15+ tests):
  - **POST /api/sites** (5 tests):
    - [ ] Creates site with valid data (geocoding success)
    - [ ] Creates site without geocoding (address missing)
    - [ ] Creates site with manual location (bypasses geocoding)
    - [ ] Creates site with bbox polygon
    - [ ] Returns 400 for invalid data (missing name, invalid bbox)
  - **GET /api/sites/:id** (3 tests):
    - [ ] Returns site by ID
    - [ ] Returns 404 for non-existent ID
    - [ ] Returns GeoJSON for location/bbox fields
  - **GET /api/sites** (4 tests):
    - [ ] Lists all sites with pagination
    - [ ] Filters by club_id
    - [ ] Returns next_cursor when has_more=true
    - [ ] Respects limit parameter
  - **PUT /api/sites/:id** (4 tests):
    - [ ] Updates site with valid If-Match header
    - [ ] Returns 400 without If-Match header
    - [ ] Returns 409 with stale version token
    - [ ] Updates only provided fields (partial update)
  - **DELETE /api/sites/:id** (3 tests):
    - [ ] Soft deletes site (sets deleted_at)
    - [ ] Returns 400 without If-Match header
    - [ ] Returns 404 after soft delete (not visible in list)
- [ ] Test setup:
  - `beforeAll`: Create test club for foreign key
  - `afterEach`: Clean up test sites
  - Set `DATABASE_URL_TEST` before imports
- [ ] All tests pass: `npm test tests/integration/sites.test.ts`

### Implementation Example
```typescript
// tests/integration/sites.test.ts
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgres://...';
import request from 'supertest';
import { app } from '../../src/app';
import { getKnex } from '../../src/data/knex';

describe('Sites API', () => {
  let testClubId: number;
  
  beforeAll(async () => {
    const knex = getKnex();
    await knex.migrate.latest();
    
    const [club] = await knex('clubs').insert({
      name: 'Test Club',
      slug: 'test-club',
    }).returning('id');
    testClubId = club.id;
  });
  
  describe('POST /api/sites', () => {
    it('should create site with valid data', async () => {
      const res = await request(app)
        .post('/api/sites')
        .send({
          club_id: testClubId,
          name: 'Phoenix Park',
          address: '123 Main St, Dublin, Ireland',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Phoenix Park');
      // Geocoding may or may not succeed (Mapbox token optional)
    });
  });
});
```

### Files Modified
- `tests/integration/sites.test.ts` (NEW)

### Time Estimate
**4-5 hours**

---

## Subtask 2.7: Layouts Repository

**Goal:** Implement `LayoutsRepository` with CRUD + duplication logic.

### Acceptance Criteria
- [ ] File created: `src/data/layouts.repo.ts`
- [ ] Implements interface:
  ```typescript
  interface LayoutsRepository {
    create(data: LayoutCreateInput): Promise<Layout>
    findById(id: number): Promise<Layout | null>
    findBySiteId(siteId: number, limit: number, cursor?: string): Promise<Layout[]>
    update(id: number, data: LayoutUpdateInput): Promise<Layout | null>
    delete(id: number): Promise<boolean>
    duplicate(id: number, newName: string): Promise<Layout>
    checkVersionToken(id: number, token: string): Promise<boolean>
  }
  ```
- [ ] Duplication logic:
  - Copy layout row (new ID, new version_token, updated name)
  - Copy all zones linked to original layout (new IDs, same layout_id reference updated)
  - Copy all assets linked to original layout (new IDs, same layout_id reference updated)
  - Transaction: all 3 inserts must succeed or rollback
- [ ] Foreign key: `layouts.site_id → sites(id) ON DELETE CASCADE`
- [ ] Cursor pagination on `findBySiteId()`

### Implementation Details
```typescript
// src/data/layouts.repo.ts
export class LayoutsRepository {
  async duplicate(id: number, newName: string): Promise<Layout> {
    const knex = getKnex();
    
    return await knex.transaction(async (trx) => {
      // 1. Copy layout
      const original = await trx('layouts').where({ id }).first();
      if (!original) throw new Error('Layout not found');
      
      const [newLayout] = await trx('layouts').insert({
        site_id: original.site_id,
        name: newName,
        description: original.description,
        is_published: false, // New copy starts unpublished
        created_by: original.created_by,
        version_token: trx.raw('gen_random_uuid()'),
      }).returning('*');
      
      // 2. Copy zones
      const zones = await trx('zones').where({ layout_id: id });
      if (zones.length > 0) {
        const zoneCopies = zones.map((z) => ({
          layout_id: newLayout.id,
          name: z.name,
          zone_type: z.zone_type,
          surface: z.surface,
          color: z.color,
          boundary: z.boundary,
          area_sqm: z.area_sqm,
          perimeter_m: z.perimeter_m,
        }));
        await trx('zones').insert(zoneCopies);
      }
      
      // 3. Copy assets
      const assets = await trx('assets').where({ layout_id: id });
      if (assets.length > 0) {
        const assetCopies = assets.map((a) => ({
          layout_id: newLayout.id,
          name: a.name,
          asset_type: a.asset_type,
          geometry: a.geometry,
          properties: a.properties,
        }));
        await trx('assets').insert(assetCopies);
      }
      
      return this.mapRow(newLayout);
    });
  }
}
```

### Files Modified
- `src/data/layouts.repo.ts` (NEW)

### Time Estimate
**3-4 hours**

---

## Subtask 2.8: Layouts Service

**Goal:** Implement `LayoutsService` with tier gates and version management.

### Acceptance Criteria
- [ ] File created: `src/services/layouts.service.ts`
- [ ] Implements tier gates:
  - Free tier: max 50 layouts per club
  - Paid individual: max 500 layouts per club
  - Club admin: unlimited
- [ ] Tier check logic:
  - Query `SELECT tier FROM users WHERE clerk_id = ?` (extract from JWT claims)
  - Query `SELECT COUNT(*) FROM layouts WHERE site_id IN (SELECT id FROM sites WHERE club_id = ?)`
  - Throw `AppError(403, 'TIER_LIMIT_EXCEEDED')` if over limit
- [ ] Version management:
  - Each create/update generates new `version_token` (UUID)
  - Service validates token before update/delete
- [ ] Duplication:
  - Call `repo.duplicate(id, newName)` with generated name (e.g., "Layout Copy 1")
  - Return new layout with updated version token

### Implementation Details
```typescript
// src/services/layouts.service.ts
export class LayoutsService {
  private repo = new LayoutsRepository();
  
  async create(data: LayoutCreateInput, userId: string, userTier: string): Promise<Layout> {
    // Check tier limits
    const layoutCount = await this.repo.countByClubId(data.club_id);
    
    if (userTier === 'free' && layoutCount >= 50) {
      throw new AppError('Free tier limited to 50 layouts. Upgrade to create more.', 403, 'TIER_LIMIT_EXCEEDED');
    }
    if (userTier === 'paid_individual' && layoutCount >= 500) {
      throw new AppError('Paid individual tier limited to 500 layouts.', 403, 'TIER_LIMIT_EXCEEDED');
    }
    
    return await this.repo.create(data);
  }
  
  async duplicate(id: number, userId: string): Promise<Layout> {
    const original = await this.repo.findById(id);
    if (!original) {
      throw new AppError('Layout not found', 404, 'NOT_FOUND');
    }
    
    // Generate new name
    const newName = `${original.name} (Copy)`;
    return await this.repo.duplicate(id, newName);
  }
}
```

### Files Modified
- `src/services/layouts.service.ts` (NEW)

### Time Estimate
**3-4 hours**

---

## Subtask 2.9: Layouts Zod Schemas

**Goal:** Create Zod validation schemas for Layouts API.

### Acceptance Criteria
- [ ] File created: `src/schemas/layouts.schema.ts`
- [ ] Schemas defined:
  ```typescript
  export const LayoutCreateSchema = z.object({
    site_id: z.number().int().positive(),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    is_published: z.boolean().default(false),
  });
  
  export const LayoutUpdateSchema = LayoutCreateSchema.partial().omit({ site_id: true });
  
  export const LayoutResponseSchema = z.object({
    id: z.number(),
    site_id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    is_published: z.boolean(),
    version_token: z.string().uuid(),
    created_by: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    // Computed fields (from service)
    zone_count: z.number().int().optional(),
    asset_count: z.number().int().optional(),
  });
  
  export const LayoutsListResponseSchema = z.object({
    data: z.array(LayoutResponseSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean(),
  });
  ```
- [ ] Export types

### Files Modified
- `src/schemas/layouts.schema.ts` (NEW)

### Time Estimate
**1-2 hours**

---

## Subtask 2.10: Layouts Controller

**Goal:** Implement HTTP handlers for Layouts CRUD + duplication endpoint.

### Acceptance Criteria
- [ ] File created: `src/controllers/layouts.controller.ts`
- [ ] Endpoints implemented:
  ```typescript
  POST   /api/layouts
  GET    /api/layouts/:id
  GET    /api/layouts
  PUT    /api/layouts/:id
  DELETE /api/layouts/:id
  POST   /api/layouts/:id/duplicate
  ```
- [ ] Duplication endpoint:
  - Extract layout ID from params
  - Call `service.duplicate(id, userId)`
  - Return new layout with 201 status
- [ ] Query params for list:
  - `site_id` (number, optional) - filter by site
  - `is_published` (boolean, optional) - filter by published status
  - `cursor`, `limit` - pagination

### Implementation Details
```typescript
// src/controllers/layouts.controller.ts
export async function duplicateLayout(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const userId = (req as AuthenticatedRequest).user?.clerkId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const duplicated = await service.duplicate(id, userId);
    return res.status(201).json({ data: duplicated });
  } catch (err) {
    next(err);
  }
}
```

### Files Modified
- `src/controllers/layouts.controller.ts` (NEW)

### Time Estimate
**2-3 hours**

---

## Subtask 2.11: Layouts Routes

**Goal:** Register Layouts API routes in Express app.

### Acceptance Criteria
- [ ] File created: `src/routes/layouts.routes.ts`
- [ ] Routes registered with auth middleware
- [ ] Imported in `src/app.ts`: `app.use('/api/layouts', layoutsRoutes);`

### Files Modified
- `src/routes/layouts.routes.ts` (NEW)
- `src/app.ts` (MODIFY)

### Time Estimate
**1 hour**

---

## Subtask 2.12: Layouts Integration Tests

**Goal:** Write Supertest integration tests for Layouts endpoints.

### Acceptance Criteria
- [ ] File created: `tests/integration/layouts.test.ts`
- [ ] Test suites (20+ tests):
  - **POST /api/layouts** (6 tests):
    - [ ] Creates layout with valid data
    - [ ] Returns 400 for invalid data
    - [ ] Enforces tier limits (free: 50, paid: 500)
    - [ ] Sets is_published default to false
    - [ ] Returns 404 if site_id doesn't exist
    - [ ] Tracks created_by from JWT
  - **GET /api/layouts/:id** (3 tests):
    - [ ] Returns layout by ID
    - [ ] Returns 404 for non-existent ID
    - [ ] Includes zone_count and asset_count
  - **GET /api/layouts** (4 tests):
    - [ ] Lists all layouts with pagination
    - [ ] Filters by site_id
    - [ ] Filters by is_published
    - [ ] Returns next_cursor correctly
  - **PUT /api/layouts/:id** (4 tests):
    - [ ] Updates layout with If-Match header
    - [ ] Returns 400 without If-Match
    - [ ] Returns 409 with stale token
    - [ ] Partial updates work
  - **DELETE /api/layouts/:id** (2 tests):
    - [ ] Deletes layout (cascades to zones/assets)
    - [ ] Returns 404 after delete
  - **POST /api/layouts/:id/duplicate** (3 tests):
    - [ ] Duplicates layout with new name
    - [ ] Copies all zones
    - [ ] Copies all assets
- [ ] All tests pass: `npm test tests/integration/layouts.test.ts`

### Files Modified
- `tests/integration/layouts.test.ts` (NEW)

### Time Estimate
**5-6 hours**

---

## Subtask 2.13: Share Link Expiration Middleware

**Goal:** Implement middleware to check share link expiration (PRD Q-3).

### Acceptance Criteria
- [ ] File created: `src/middleware/shareLinks.ts`
- [ ] Middleware: `checkShareLinkExpiration(req, res, next)`
  - Extract slug from `req.params.slug`
  - Query `SELECT expires_at, is_revoked FROM share_links WHERE slug = ?`
  - If `is_revoked = true`: return 410 Gone
  - If `expires_at IS NOT NULL AND expires_at < NOW()`: return 410 Gone
  - If valid: increment `access_count`, update `last_accessed_at`, call `next()`
- [ ] Apply middleware to share link route: `GET /share/:slug`

### Implementation Details
```typescript
// src/middleware/shareLinks.ts
export async function checkShareLinkExpiration(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = req.params.slug;
    const knex = getKnex();
    
    const link = await knex('share_links')
      .where({ slug })
      .first();
    
    if (!link) {
      return res.status(404).json({ error: 'Share link not found' });
    }
    
    if (link.is_revoked) {
      return res.status(410).json({ error: 'Share link has been revoked' });
    }
    
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }
    
    // Increment view count (PRD Q-5)
    await knex('share_links')
      .where({ slug })
      .increment('access_count', 1)
      .update({ last_accessed_at: knex.fn.now() });
    
    // Attach layout_id to request for controller
    req.shareLink = link;
    next();
  } catch (err) {
    next(err);
  }
}
```

### Files Modified
- `src/middleware/shareLinks.ts` (NEW)
- `src/routes/share.routes.ts` (MODIFY - apply middleware)

### Time Estimate
**2 hours**

---

## Subtask 2.14: TASK 2 Completion Summary

**Goal:** Document TASK 2 completion with test results and acceptance criteria validation.

### Acceptance Criteria
- [ ] File created: `tasks/0023-task-2-complete.md`
- [ ] Documents:
  - All 14 subtasks completed
  - Test results (35+ integration tests passing)
  - API endpoints inventory (10 endpoints)
  - Acceptance criteria validation
  - Next steps (TASK 3: Zones & Assets API)

### Files Modified
- `tasks/0023-task-2-complete.md` (NEW)

### Time Estimate
**1 hour**

---

## Summary

### Total Subtasks: 14
| Subtask | Description | Time Estimate |
|---------|-------------|---------------|
| 2.1 | Sites Repository | 2-3 hours |
| 2.2 | Sites Service | 3-4 hours |
| 2.3 | Sites Zod Schemas | 1-2 hours |
| 2.4 | Sites Controller | 2-3 hours |
| 2.5 | Sites Routes | 1 hour |
| 2.6 | Sites Integration Tests | 4-5 hours |
| 2.7 | Layouts Repository | 3-4 hours |
| 2.8 | Layouts Service | 3-4 hours |
| 2.9 | Layouts Zod Schemas | 1-2 hours |
| 2.10 | Layouts Controller | 2-3 hours |
| 2.11 | Layouts Routes | 1 hour |
| 2.12 | Layouts Integration Tests | 5-6 hours |
| 2.13 | Share Link Expiration | 2 hours |
| 2.14 | Completion Summary | 1 hour |
| **Total** | | **32-43 hours (~3-4 days)** |

### API Endpoints Delivered (10 total)

**Sites (5 endpoints):**
- `POST /api/sites` - Create site with geocoding
- `GET /api/sites/:id` - Get site by ID
- `GET /api/sites` - List sites (paginated, filter by club_id)
- `PUT /api/sites/:id` - Update site (If-Match required)
- `DELETE /api/sites/:id` - Soft delete site

**Layouts (5 endpoints):**
- `POST /api/layouts` - Create layout (tier gates)
- `GET /api/layouts/:id` - Get layout with zone/asset counts
- `GET /api/layouts` - List layouts (filter by site_id, is_published)
- `PUT /api/layouts/:id` - Update layout (If-Match required)
- `DELETE /api/layouts/:id` - Delete layout (cascades)
- `POST /api/layouts/:id/duplicate` - Duplicate layout + zones + assets

### Test Coverage Target: 35+ integration tests
- Sites: 15 tests
- Layouts: 20 tests

### Dependencies for TASK 3
- ✅ Sites API (provides site_id for layouts)
- ✅ Layouts API (provides layout_id for zones/assets)
- ✅ Share link middleware (reusable for zones/assets share views)

---

## Approval & Next Steps

**Status:** Ready to Execute  
**Prerequisite:** TASK 1 complete ✅  
**Action Required:** Type "proceed" to begin Subtask 2.1 (Sites Repository)

**Related Documentation:**
- [Parent Tasks](./0004-parent-tasks.md)
- [TASK 1 Complete](./0021-task-1-complete.md)
- [PRD Open Questions](./0022-prd-open-questions-answered.md)
