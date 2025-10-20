# Plottr AI Coding Agent Instructions

## Overview & Architecture

Plottr is a full-stack sports field booking platform split into two independent codebases:
- **Backend** (`src/`): Express.js REST API, PostgreSQL/PostGIS, TypeScript (CommonJS), 4-layer pattern (Controller → Service → Repository → DB)
- **Frontend** (`web/`): Next.js 14 App Router, React 18, TypeScript (ESM), MapLibre geospatial rendering

**Why this structure?** Strict layering enforces separation: Controllers handle HTTP, Services contain business logic, Repositories execute raw Knex queries (no ORM models). Services map untyped DB rows to Zod-validated DTOs. This prevents business logic leaking into HTTP layer or SQL queries living in controllers.

**Data flow:** Client → Express middleware (auth, rate limit, logging with correlation IDs) → Controller (parse/validate) → Service (business logic) → Repository (Knex SQL) → PostgreSQL/PostGIS. Responses use cursor-based pagination (never offset) via `src/lib/pagination.ts`.

## Key Paths & Files

- **[`src/controllers/`](../src/controllers/)** – HTTP handlers, parse req/res, call services
- **[`src/services/`](../src/services/)** – Business logic, map DB rows to typed responses  
- **[`src/data/*.repo.ts`](../src/data/)** – Raw Knex queries only (no Objection.js)
- **[`src/schemas/`](../src/schemas/)** – Zod schemas define validation + TypeScript types via `z.infer`
- **[`src/lib/pagination.ts`](../src/lib/pagination.ts)** – Cursor pagination utilities (base64 `{id}:{sortValue}`)
- **[`src/lib/geospatial.ts`](../src/lib/geospatial.ts)** – PostGIS polygon validation (winding order, self-intersection, WGS84 bounds)
- **[`src/lib/mapbox.ts`](../src/lib/mapbox.ts)** – Mapbox geocoding client (graceful degradation if token missing)
- **[`src/lib/logger.ts`](../src/lib/logger.ts)** – Structured logging with request correlation IDs
- **[`src/middleware/auth.ts`](../src/middleware/auth.ts)** – Clerk JWT validation (dev mode: `AUTH_REQUIRED=false` uses mock user)
- **[`src/db/migrations/`](../src/db/migrations/)** – Knex migrations (naming: `<seq>_<desc>.ts`, use `async function up/down`)
- **[`tests/integration/`](../tests/integration/)** – Supertest HTTP tests (set `DATABASE_URL_TEST` before imports, see [`venues.test.ts:1-2`](../tests/integration/venues.test.ts#L1-L2))


## Build, Run, Test

```bash
# Backend (requires Docker PostgreSQL)
docker compose up -d                  # Start postgis/postgis:16-3.4
npm install
npm run db:reset                      # Rollback + migrate + seed
npm run dev                           # ts-node -r tsconfig-paths/register src/index.ts → localhost:3001
npm test                              # Jest with --runInBand (avoids DB race conditions)
npm run test:unit                     # Exclude integration/migration tests
npm run check:types                   # TypeScript validation (tsc --noEmit)

# Frontend
cd web
npm install
npm run dev                           # Next.js dev server → localhost:3000
npm run type-check                    # tsc --noEmit
```

**Env vars required:** `DATABASE_URL`, `DATABASE_URL_TEST`, `PORT`, `AUTH_REQUIRED` (backend); `NEXT_PUBLIC_API_BASE_URL` (frontend). Mapbox token optional—if missing, [`src/lib/mapbox.ts`](../src/lib/mapbox.ts) logs warning and disables geocoding (graceful degradation).


## Conventions

**Types:** All schemas in [`src/schemas/*.schema.ts`](../src/schemas/) use Zod. Export inferred types: `export type Venue = z.infer<typeof VenueSchema>`. Parse in services, not controllers.

**Naming:** Controllers: `*.controller.ts`, Services: `*.service.ts`, Repos: `*.repo.ts`. Test files: `*.test.ts` next to integration or unit folders.

**Error handling:** Throw [`AppError`](../src/errors/index.ts) with status code. Middleware catches and formats response. Never expose raw DB errors.

**Logging:** Use [`Logger`](../src/lib/logger.ts) class with request context. Middleware injects `x-request-id` header for tracing (see [`src/middleware/logging.ts:27`](../src/middleware/logging.ts#L27)).

**Testing:** Integration tests use Supertest + real DB. Set `DATABASE_URL_TEST` *before* importing `getKnex()` to avoid module-load race (pattern: [`tests/integration/venues.test.ts:2`](../tests/integration/venues.test.ts#L2)). Run migrations in `beforeAll` via `knex.migrate.latest()`.

**Pagination:** Always cursor-based (never `LIMIT/OFFSET`). Fetch `limit+1` records, use [`paginateResults()`](../src/lib/pagination.ts) to build `{data, next_cursor, has_more}` response. Cursor format: base64 `{id}:{sortValue}`.

**Version tokens:** All mutable resources (venues/pitches/sessions) use `version_token` for optimistic concurrency. Clients send `If-Match` header; backend returns 409 if stale (see [`src/controllers/venues.controller.ts`](../src/controllers/venues.controller.ts) PUT handlers).

**Path aliases:** Backend uses `@/*` → `src/*` (configured in [`tsconfig.json`](../tsconfig.json) + `tsconfig-paths`). Frontend uses `@/*` → `web/src/*` (Next.js built-in).

## Integrations & Contracts

**Mapbox geocoding:** [`src/lib/mapbox.ts`](../src/lib/mapbox.ts) initializes client with `MAPBOX_TOKEN`. If token missing or invalid, logs warning and sets `geocoder = null`. Calling [`services/geocode.service.ts`](../src/services/geocode.service.ts) throws error if null. Tests/CI must handle graceful degradation.

**PostGIS:** All pitch geometry stored as `geography(POLYGON, 4326)`. Validate via [`src/lib/geospatial.ts:validatePitchPolygon()`](../src/lib/geospatial.ts) (checks: structure, WGS84 bounds, self-intersection, counter-clockwise winding). Apply both client-side and server-side.

**Clerk auth:** JWT validation in [`src/middleware/auth.ts`](../src/middleware/auth.ts). Extracts `clerkId`, `email`, `tier` from custom claims. If `AUTH_REQUIRED=false` (dev mode), injects mock user `dev-user-123`.

**Frontend ↔ Backend:** Frontend calls backend via axios instance ([`web/src/lib/api.ts`](../web/src/lib/api.ts)) with base URL `NEXT_PUBLIC_API_BASE_URL`. Responses follow `{data, next_cursor?, has_more}` shape for paginated endpoints.

**Database:** Knex config in [`src/db/knexfile.ts`](../src/db/knexfile.ts) reads `DATABASE_URL` (dev) or `DATABASE_URL_TEST` (tests). Migrations in [`src/db/migrations/`](../src/db/migrations/), seeds in [`src/db/seeds/`](../src/db/seeds/).

## Do/Don't for AI Agents

✅ **Do:** Follow 4-layer pattern (Controller → Service → Repo → DB). Never skip layers.  
✅ **Do:** Use [`src/lib/pagination.ts`](../src/lib/pagination.ts) utilities for all list endpoints (cursor-based only).  
✅ **Do:** Validate input with Zod schemas in [`src/schemas/`](../src/schemas/) and export types via `z.infer`.  
✅ **Do:** Throw [`AppError`](../src/errors/index.ts) with explicit status codes for controlled error responses.  
✅ **Do:** Validate geospatial data with [`src/lib/geospatial.ts`](../src/lib/geospatial.ts) (both frontend and backend).  
✅ **Do:** Enforce `If-Match` version token checks on all PUT endpoints (optimistic concurrency).  
✅ **Do:** Use `@/*` path alias for imports (backend: `src/*`, frontend: `web/src/*`).  
✅ **Do:** Set `DATABASE_URL_TEST` before importing Knex in tests ([`tests/integration/*.test.ts:2`](../tests/integration/venues.test.ts#L2)).  
❌ **Don't:** Call repositories directly from controllers—always go through services.  
❌ **Don't:** Use offset pagination (`LIMIT/OFFSET`)—repos must implement cursor filtering.  
❌ **Don't:** Use Objection.js models—this project uses raw Knex queries in repositories.  
❌ **Don't:** Return raw database errors—wrap in `AppError` with sanitized messages.  
❌ **Don't:** Assume Mapbox token exists—check [`geocoder`](../src/lib/mapbox.ts) is not null before calling.

## Examples

**Cursor pagination flow** ([`src/controllers/venues.controller.ts:9-37`](../src/controllers/venues.controller.ts#L9-L37)):
```typescript
const params = validatePaginationParams(cursor, limit);
const data = await service.listPaginated(params.limit! + 1, params.cursor);
const paginated = paginateResults(data, params, (i) => i.id, (i) => i.updated_at);
return res.json(paginated);
```

**Service mapping untyped DB rows** ([`src/services/venues.service.ts:20-33`](../src/services/venues.service.ts#L20-L33)):
```typescript
private mapRow(r: any): Venue {
  return { id: r.id, club_id: r.club_id, name: r.name, /* ... */ } as Venue;
}
```

**Knex migration pattern** ([`src/db/migrations/0001_initial_schema.ts:3-13`](../src/db/migrations/0001_initial_schema.ts#L3-L13)):
```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venues', (table) => {
    table.increments('id').primary();
    table.timestamps(true, true);
  });
}
```

**Integration test with test DB** ([`tests/integration/venues.test.ts:1-13`](../tests/integration/venues.test.ts#L1-L13)):
```typescript
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || '...';
import request from 'supertest';
beforeAll(async () => { await getKnex().migrate.latest(); });
```

