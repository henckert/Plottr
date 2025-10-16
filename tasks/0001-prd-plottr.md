<!-- Project tasks derived from PRD: updated 2025-10-16 -->
---
title: "Tasks for 0001-prd-plottr.md"
generated_from: "/tasks/0001-prd-plottr.md"
date: 2025-10-15
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

- [ ] 1.0 Project scaffolding & infra
  - [x] 1.1 Initialize Node project and add `package.json` with required deps/dev-deps
  - [x] 1.2 Add `tsconfig.json` and TypeScript build/test scripts
  - [ ] 1.3 Add `.env.example` and config loader (`src/config/index.ts`)
  - [ ] 1.4 Create `src/index.ts` bootstrap with Express, error handling, basic routes placeholder
  - [ ] 1.5 Configure Knex + ts-node migrations and add `src/db/knexfile.ts`
  - [ ] 1.6 Add Objection and database connection utility (`src/db/connection.ts`)
  - [ ] 1.7 Add S3 service (`src/services/s3.ts`) and local mock instructions
  - [ ] 1.8 Add Jest tests verifying project scaffolding, config loading, and that migrations run (unit + migration verification)

- [ ] 2.0 Database schema & seeds
  - [x] 2.1 Create initial Knex migration `0001_initial_schema.ts` with tables: users, clubs, venues, pitches, pitch_segments, entrances, waypoints, sessions, permissions, audit_log
  - [x] 2.2 Add GEOGRAPHY columns and GIST indexes for spatial columns; include checks for PostGIS extension
  - [x] 2.3 Create seeds: `001_templates.ts` to insert template records for MVP templates
  - [x] 2.4 Add migration verification test script that runs migrate:latest and migrate:rollback
  - [ ] 2.5 Add DB helper utilities to convert GeoJSON↔WKB where helpful (`src/db/geo.ts`)
  - [ ] 2.6 Add Jest tests validating migration application, schema correctness, and seed data presence (db integration tests)

- [ ] 3.0 OpenAPI & server stubs
  - [ ] 3.1 Draft `openapi/plottr-openapi.yaml` covering endpoints in the PRD (venues, pitches, sessions, share, export)
  - [ ] 3.2 Run openapi-generator to produce a Node/TS server stub into `openapi/server-stub/`
  - [ ] 3.3 Replace stubbed controllers with implementations that call Objection models
  - [ ] 3.4 Add API contract tests (supertest + Jest) to validate responses match OpenAPI schema
  - [ ] 3.5 Add Jest-based API contract tests that exercise the generated server stub and validate OpenAPI conformance

- [ ] 4.0 Core API implementation
  - [ ] 4.1 Implement `src/api/venues.controller.ts`: create, read, list, update, publish (snapshot) with audit logging
  - [ ] 4.2 Implement `src/api/pitches.controller.ts`: create pitch, update geometry, rotate, split (halves/thirds), label generation
  - [ ] 4.3 Implement `src/api/sessions.controller.ts`: create session, attach share token (HMAC), GET /share/session/:id
  - [ ] 4.4 Implement `src/services/share.ts` with HMAC signing and validation; store link metadata
  - [x] 4.5 Implement `src/services/geocoding.ts` wrapper for Mapbox geocode with caching (in-db or redis optional)
    - [x] Completed 2025-10-16: server-side Mapbox integration added. Files created/updated: `.env.example` (MAPBOX_TOKEN), `src/config/index.ts`, `src/lib/mapbox.ts`, `src/services/geocode.service.ts`, `src/controllers/geocode.controller.ts`, `src/routes/geocode.routes.ts`, `src/types/mapbox.d.ts`.
  - [ ] 4.6 Implement role-based middleware `src/auth/jwt.ts` and permission checks for endpoints
  - [ ] 4.7 Implement export endpoint `GET /venues/:id/export` returning gzipped GeoJSON from S3 or generated on-the-fly
  - [ ] 4.8 Add simple analytics sink `POST /analytics/event` that writes to a rolling log or DB table
  - [ ] 4.9 Add Jest unit and integration tests for controllers, services, share signing, and permission checks (use supertest for HTTP integration)

- [ ] 5.0 Local dev setup & QA
  - [ ] 5.1 Add `README-LOCAL.md` with steps to provision Postgres+PostGIS locally (link to `scripts/local-postgis-setup.ps1`), how to run migrations/seeds, and required env vars
  - [ ] 5.2 Add Jest unit tests for controllers and services; include tests for share signing and geocoding wrapper
  - [ ] 5.3 Add API happy-path tests (supertest): create venue → create pitch → split → create session → share link resolves
  - [ ] 5.4 Add Postman collection or curl examples for manual testing (`postman/plottr-happy-path.postman_collection.json`)
  - [ ] 5.5 Add Detox skeleton for RN prototype (placeholder) and document how to run it
  - [ ] 5.6 Add Jest E2E tests for the happy-path using supertest (server-side) and include guidance for running Detox/NW E2E later

### Additional Files (detailed)

... (original detailed lists preserved)

I have expanded the high-level tasks into detailed sub-tasks.
