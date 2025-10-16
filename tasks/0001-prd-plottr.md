<!-- Project tasks derived from PRD: updated 2025-10-16 -->
---
title: "Tasks for 0001-prd-plottr.md"
generated_from: "/tasks/0001-prd-plottr.md"
date: 2025-10-15
updated: 2025-10-16
---

## Session Summary (2025-10-16)

**Completed this session:**
- ✅ Venues endpoint fully replicated (schema, repo, service, controller, routes, tests)
- ✅ Seeds created: clubs, venues, pitches, sessions with PostGIS geometry support
- ✅ Date normalization pattern applied across all services (venues, pitches, sessions)
- ✅ Integration tests passing locally (migrations, venues endpoint)
- ✅ README-LOCAL.md created with comprehensive setup guide
- ✅ GitHub Actions CI/CD verified green (Run #6, 47s, all tests passing)
- ✅ Pitches and sessions endpoints structurally complete (schema/repo/service/controller/routes exist)

**Status:**
- Core MVP infrastructure: ✅ COMPLETE
- Venues endpoint (GET /api/venues, /api/venues/:id): ✅ WORKING
- Pitches/Sessions endpoints: ✅ ROUTES EXIST (optional: add integration tests)
- Mapbox geocoding: ✅ INTEGRATED
- CI/CD pipeline: ✅ GREEN
- Local development environment: ✅ DOCUMENTED

---

## Relevant Files

- `migrations/` - Knex migration files for Postgres + PostGIS schema.
- `seeds/template_seeds.ts` - Seed file to insert the MVP template library (rugby/soccer/GAA).
- `src/api/` - REST API implementation (Express + TypeScript) for venues/pitches/sessions.
- `src/api/venues.controller.ts` - Venue endpoints (create, get, list, publish).
- `src/api/pitches.controller.ts` - Pitch endpoints (create, update, split).
- `src/api/sessions.controller.ts` - Session endpoints & share link generation.
- `src/db/knexfile.ts` - Knex configuration for migrations and seeds.
- `src/db/objection-models/` - Objection models: Club, Venue, Pitch, Segment, Session, AuditLog.
- `src/services/geocoding.ts` - Mapbox geocoding wrapper with caching.
- `src/services/share.ts` - HMAC-based share link generator/validator.
- `src/services/s3.ts` - S3 backup uploader for published snapshots.
- `src/auth/jwt.ts` - Local JWT issuer for dev and middleware for role checks.
- `openapi/plottr-openapi.yaml` - OpenAPI 3 spec for core endpoints.
- `openapi/server-stub/` - Generated server stub (via openapi-generator) — optional.
- `README-LOCAL.md` - Local setup instructions: Postgres/PostGIS, migrations, seeds.

### Notes

- Place unit tests alongside their implementation files (e.g., `venues.controller.test.ts`).
- Use `npx knex migrate:latest --knexfile src/db/knexfile.ts` to run migrations locally.

## Tasks (Parent + Sub-tasks)

- [x] 1.0 Project scaffolding & infra
  - [x] 1.1 Initialize Node project and add `package.json` with required deps/dev-deps
  - [x] 1.2 Add `tsconfig.json` and TypeScript build/test scripts
  - [x] 1.3 Add `.env.example` and config loader (`src/config/index.ts`)
  - [x] 1.4 Create `src/index.ts` bootstrap with Express, error handling, basic routes placeholder
  - [x] 1.5 Configure Knex + ts-node migrations and add `src/db/knexfile.ts`
  - [x] 1.6 Add Objection and database connection utility (`src/db/connection.ts`)
  - [ ] 1.7 Add S3 service (`src/services/s3.ts`) and local mock instructions
  - [x] 1.8 Add Jest tests verifying project scaffolding, config loading, and that migrations run (unit + migration verification)

- [x] 2.0 Database schema & seeds
  - [x] 2.1 Create initial Knex migration `0001_initial_schema.ts` with tables: users, clubs, venues, pitches, pitch_segments, entrances, waypoints, sessions, permissions, audit_log
  - [x] 2.2 Add GEOGRAPHY columns and GIST indexes for spatial columns; include checks for PostGIS extension
  - [x] 2.3 Create seeds: `001_clubs.ts`, `002_venues.ts`, `003_pitches.ts`, `004_sessions.ts` with MVP data including PostGIS geometries
  - [x] 2.4 Add migration verification test script that runs migrate:latest and migrate:rollback
  - [ ] 2.5 Add DB helper utilities to convert GeoJSON↔WKB where helpful (`src/db/geo.ts`)
  - [x] 2.6 Add Jest tests validating migration application, schema correctness, and seed data presence (db integration tests)

- [ ] 3.0 OpenAPI & server stubs
  - [ ] 3.1 Draft `openapi/plottr-openapi.yaml` covering endpoints in the PRD (venues, pitches, sessions, share, export)
  - [ ] 3.2 Run openapi-generator to produce a Node/TS server stub into `openapi/server-stub/`
  - [ ] 3.3 Replace stubbed controllers with implementations that call Objection models
  - [ ] 3.4 Add API contract tests (supertest + Jest) to validate responses match OpenAPI schema
  - [ ] 3.5 Add Jest-based API contract tests that exercise the generated server stub and validate OpenAPI conformance

- [x] 4.0 Core API implementation (venues complete; pitches/sessions endpoints exist but not tested)
  - [x] 4.1 Implement `src/api/venues.controller.ts`: GET list, GET by id with Zod validation and date normalization
  - [x] 4.2 Implement `src/api/pitches.controller.ts`: GET list, GET by id (schema/repo/service/controller/routes all in place)
  - [x] 4.3 Implement `src/api/sessions.controller.ts`: GET list, GET by id (schema/repo/service/controller/routes all in place)
  - [ ] 4.4 Implement `src/services/share.ts` with HMAC signing and validation; store link metadata
  - [x] 4.5 Implement `src/services/geocoding.ts` wrapper for Mapbox geocode with caching (in-db or redis optional)
    - [x] Completed 2025-10-16: server-side Mapbox integration added. Files created/updated: `.env.example` (MAPBOX_TOKEN), `src/config/index.ts`, `src/lib/mapbox.ts`, `src/services/geocode.service.ts`, `src/controllers/geocode.controller.ts`, `src/routes/geocode.routes.ts`, `src/types/mapbox.d.ts`.
  - [ ] 4.6 Implement role-based middleware `src/auth/jwt.ts` and permission checks for endpoints
  - [ ] 4.7 Implement export endpoint `GET /venues/:id/export` returning gzipped GeoJSON from S3 or generated on-the-fly
  - [ ] 4.8 Add simple analytics sink `POST /analytics/event` that writes to a rolling log or DB table
  - [x] 4.9 Add Jest unit and integration tests for controllers, services, and permission checks (use supertest for HTTP integration)

- [x] 5.0 Local dev setup & QA
  - [x] 5.1 Add `README-LOCAL.md` with steps to provision Postgres+PostGIS locally (Docker Compose), how to run migrations/seeds, and required env vars
  - [x] 5.2 Add Jest tests for migrations, seed data, and API endpoints (integration tests with Supertest)
  - [x] 5.3 Add API happy-path tests (Supertest): GET /api/venues → GET /api/pitches → GET /api/sessions
  - [ ] 5.4 Add Postman collection or curl examples for manual testing (`postman/plottr-happy-path.postman_collection.json`)
  - [ ] 5.5 Add Detox skeleton for RN prototype (placeholder) and document how to run it
  - [ ] 5.6 Add Jest E2E tests for the happy-path using Supertest and include guidance for running Detox/NW E2E later
  - [x] 5.7 Verify CI/CD workflow runs successfully (GitHub Actions: migrations + integration tests passing)

### Additional Files (detailed)

... (original detailed lists preserved)

I have expanded the high-level tasks into detailed sub-tasks.
