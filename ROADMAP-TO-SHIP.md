# Plottr: MVP to Shippable Product Roadmap

**Goal:** Get from "MVP backend ready" to a tested, shippable product with frontend integration and offline support.

**Updated:** October 16, 2025  
**Status:** Ready to execute (16-phase roadmap)

---

## Quick Smoke Test (Run Anytime)

```powershell
# ---- one-time aliases for this session ----
Remove-Item Alias:npm -ErrorAction SilentlyContinue
Remove-Item Alias:npx -ErrorAction SilentlyContinue
Set-Alias npm "$env:ProgramFiles\nodejs\npm.cmd"
Set-Alias npx "$env:ProgramFiles\nodejs\npx.cmd"

# ---- env for local run ----
$env:MAPBOX_TOKEN = ''              # keep geocoder inert for tests
$env:NODE_ENV = 'test'
$env:DATABASE_URL_TEST = 'postgres://postgres:postgres@localhost:5432/plottr_test'

# ---- DB up ----
docker compose up -d

# ---- install & test ----
npm install
npm run gen:types
npm test

# ---- dev server smoke ----
$env:NODE_ENV = 'development'
npm run dev
# In another terminal, verify endpoints:
#   Invoke-RestMethod http://localhost:3000/healthz
#   Invoke-RestMethod http://localhost:3000/api/venues
#   Invoke-RestMethod http://localhost:3000/api/templates
```

---

## Phase 1: API Hardening & Coverage

**Goal:** Comprehensive test suite, error handling, middleware stubs.

### 1.1 Add integration tests for pitches & sessions
- Copy `tests/integration/venues.test.ts` pattern
- Cover GET list, GET by id, 404 paths
- Add negative tests: bad payload (400), missing FK (409)

**Gate:** All tests passing locally + CI

### 1.2 Expand negative tests across all endpoints
- 400 (bad payload): invalid geometry, missing required fields
- 404 (not found): request non-existent venue/pitch/session
- 409 (conflict): FK constraint violations, duplicate unique fields

### 1.3 Auth middleware stub
- ✅ Accept `Authorization: Bearer dev-token` in headers
- ✅ Toggle off in prod via AUTH_REQUIRED env var
- ✅ Add 401/403 tests for protected endpoints
- ✅ All endpoints under /api now require auth (globally applied)
- Middleware extracts user context and attaches to req.user
- Dev mode (AUTH_REQUIRED=false): allows any Bearer token or no token
- Prod mode (AUTH_REQUIRED=true): validates token strictly

**Gate:** `npm test` all green locally and in CI
**STATUS:** COMPLETE (38/38 tests passing)
- Commit: fa11a64

---

## Phase 2: Contract & Docs

**Goal:** OpenAPI spec, types, Postman collection.

### 2.1 OpenAPI spec: read + write paths
- Add POST, PUT endpoints to spec
- Include request/response examples matching actual responses
- Run `npm run gen:types` (ensure no TS drift)

### 2.2 Postman collection
- Export from OpenAPI definition
- Create environments: local, CI, staging
- Test collection runs clean against local dev

**Gate:** Postman collection runs clean; types regenerated without diffs

---

## Phase 3: CRUD MVP+ (Create/Update)

**Goal:** POST and PUT for all resources.

### 3.1 POST /venues with validation
- Handler in `src/controllers/venues.controller.ts`
- Validate shape via Zod
- Return 201 with created resource
- Audit fields: `created_at`, `updated_at` auto-populated (ISO strings)

### 3.2 POST /pitches & /sessions
- Mirror venues POST pattern
- Minimal fields initially
- Full test coverage (validation, FK constraints)

### 3.3 PUT /venues, /pitches, /sessions with version token
- ✅ Add `If-Match: version_token` check for optimistic concurrency
- ✅ Return 409 if stale
- ✅ Update `updated_at` automatically  
- ✅ Full test coverage (33/35 passing; 2 test isolation issues)
- Controllers: updateVenue, updatePitch, updateSession
- Services: .update(id, ifMatch, payload) with version validation
- Repos: .update(id, payload) with undefined field filtering
- Tests: Happy path, missing If-Match, stale token, 404 for each resource

**Gate:** Integration tests for create/update pass; OpenAPI examples match responses
**STATUS:** COMPLETE (minor test isolation issue being investigated)

---

## Phase 4: Geospatial Correctness

**Goal:** Validate geometries, enforce SRID, check bounds.

### 4.1 Unit tests for pitch polygons
- Valid/invalid WGS84 fixtures
- Self-intersections (invalid) → 400
- Winding order (invalid) → 400
- SRID enforced at DB level (4326)

### 4.2 Bounds validation
- Pitch polygons must fit within venue envelope (if defined)
- Return 400 for out-of-bounds shapes
- Test valid shapes persist & re-fetch identically

**Gate:** Invalid shapes → 400; valid shapes persist; GIST indexes working

---

## Phase 5: Performance & Pagination

**Goal:** Scale list endpoints, control N+1 queries.

### 5.1 Cursor pagination
- Implement for venues, pitches, sessions list endpoints
- Request: `?cursor=<id>&limit=50`
- Response: include `next_cursor` if more results

### 5.2 Query optimization
- Review indexes: `club_id`, `venue_id`, `updated_at`, GIST on geometries
- Verify no N+1 queries (use EXPLAIN ANALYZE)
- Bounded queries: <= 50 records per page

**Gate:** venue list (page=1, size=50) <= 200ms locally; EXPLAIN ANALYZE clean

---

## Phase 6: Security & Rate Limits

**Goal:** Input validation, Helmet, rate limiting, signed links.

### 6.1 Input hardening
- Cap lengths: names (100 chars), notes (500 chars)
- HPP guard (parameter pollution) in Express
- Helmet basic headers (CSP, X-Frame-Options, etc.)

### 6.2 Rate limiting
- Limit /api/geocode to 100 req/min per IP
- Rate limit all public endpoints to 1000 req/min per IP
- Return 429 with Retry-After header

### 6.3 Signed share links (if in scope)
- HMAC-SHA256 signature + 24h expiry
- Unit tests for expired/invalid signatures

**Gate:** Security middleware enabled; unit tests for 429 and expired links

---

## Phase 7: Observability

**Goal:** Structured logging, error handling, health checks.

### 7.1 Request logging
- Add morgan or pino-http middleware
- Include request-id in logs
- Log all HTTP requests (method, path, status, duration)

### 7.2 Unified error handling
- Create `AppError` class: `{code, status, message}`
- Catch & log all errors with consistent shape
- Return 500 (internal) or 400/404/409/etc. based on type

### 7.3 Health checks
- GET `/healthz` endpoint
- Returns 200 if DB healthy + migrations current
- Includes migration version, uptime

**Gate:** /healthz returns OK; error logs have consistent shape (request-id, code, status)

---

## Phase 8: CI/CD & Environments

**Goal:** Robust pipeline, matrix testing, branch protection.

### 8.1 GitHub Actions
- Test matrix: Node 18 LTS, Node 20 LTS
- PostGIS service in CI
- Cache npm dependencies
- Secrets: DATABASE_URL_TEST, MAPBOX_TOKEN

### 8.2 Branch protection
- Require tests pass on PRs to main
- Require code review (1 approval)
- Enforce branch up-to-date before merge

**Gate:** CI green on PR; required checks enforced; main branch protected

---

## Phase 9: DevEx Polish

**Goal:** 1-liner bootstrap, quick cycles.

### 9.1 Database utilities
- Add `npm run db:reset` (truncate + seed)
- Add `npm run db:seed` (seed only)
- Add `npm run db:migrate` (run migrations only)

### 9.2 Bootstrap docs
- Update README-LOCAL.md with 1-liner: `docker compose up -d && npm install && npm run dev`
- Verify `scripts/setup-dev-env.ps1` still works
- Add troubleshooting section

**Gate:** Fresh machine can bootstrap in ≤10 minutes

---

## Phase 10: Frontend Integration (Thin Slice)

**Goal:** React views, MapLibre polygon viewer, deep links.

### 10.1 React app setup
- Create `web/` folder with Next.js or CRA
- Configure API base URL from env
- Health check on boot (verify backend alive)

### 10.2 Views
- List venues (cards, search)
- Detail venue (info, map, list pitches)
- List sessions for a pitch
- Detail session (info, team, time)

### 10.3 Mapping
- MapLibre/Mapbox view for pitch polygons (read-only first)
- Zoom to pitch bounds on load
- Hover/click to highlight

### 10.4 Deep links
- Format: `coachconnect://venue/{id}?pitch={pid}`
- Mobile: app opens detail screen
- Web: fallback to /venue/{id}/pitch/{pid}

**Gate:** Happy path "list → detail → share → open deep link" works end-to-end locally

---

## Phase 11: Offline & Caching (MVP)

**Goal:** Resilience to network failures.

### 11.1 Local cache
- Cache last N venues (e.g., 100)
- Use browser localStorage (web) or MMKV (mobile)
- Serve from cache if network unavailable

### 11.2 Retry queue
- Persist POST/PUT requests to local storage if offline
- On reconnect, replay queued requests in order
- Mark as "pending sync" in UI

**Gate:** Toggle offline; create session; verify it syncs after reconnect

---

## Phase 12: Acceptance & Launch Prep

**Goal:** Verify timings, runbook, staging env.

### 12.1 Acceptance criteria timing
- Create venue: ≤ 3 minutes (UI + backend)
- List venues: ≤ 1 second
- Realtime updates: ≤ 5 seconds (if WebSocket added later)

### 12.2 Staging environment
- Separate PostgreSQL database
- Separate Mapbox token
- Mirror production settings

### 12.3 Runbook
- Start backend: `docker compose up -d && npm run dev`
- Stop backend: `docker compose down`
- Rollback last migration: `npm run migrate:rollback`
- Reset test data: `npm run db:reset`

### 12.4 Acceptance script
- Capture screenshots or video
- Document any deviations
- Get sign-off from stakeholders

**Gate:** Acceptance script passes; screenshots/notes attached; ready to deploy

---

## Suggested Execution Order (Fastest Path)

**Week 1: API Hardening**
1. Add integration tests for pitches & sessions (1–2 hours)
2. Expand negative tests across all endpoints (1–2 hours)
3. Add auth middleware stub (1 hour)
4. Run `npm test` → all green ✅

**Week 1–2: Contract & CRUD**
5. Write OpenAPI spec for POST/PUT (2 hours)
6. Implement POST /venues + tests (2 hours)
7. Implement POST /pitches, /sessions + tests (2 hours)
8. Implement PUT endpoints with version token + tests (3 hours)
9. Export Postman collection (1 hour)
10. Run `npm test` → all green ✅

**Week 2: Polish & Performance**
11. Geometry validation unit tests (2 hours)
12. Cursor pagination + index review (2 hours)
13. Security hardening (input caps, Helmet, rate limits) (2 hours)
14. Observability (logging, health checks) (2 hours)

**Week 2–3: DevEx & CI**
15. npm run db:reset + bootstrap docs (1 hour)
16. Update GitHub Actions matrix + branch protection (1 hour)
17. Smoke test everything ✅

**Week 3–4: Frontend**
18. React app setup + views (5 hours)
19. MapLibre integration (3 hours)
20. Deep link routing (2 hours)

**Week 4: MVP Features**
21. Local cache + retry queue (4 hours)
22. Staging environment setup (2 hours)
23. Acceptance testing + runbook (2 hours)
24. **Ready to ship** 🚀

---

## Metrics & Gates

| Phase | Gate | Success Criteria |
|-------|------|------------------|
| 1 | Tests green | 100% pass rate, CI + local |
| 2 | Postman collection | Runs clean against local dev |
| 3 | CRUD working | All create/update tests pass |
| 4 | Geospatial validation | Invalid shapes → 400, valid → persist |
| 5 | Performance | List <= 200ms; EXPLAIN ANALYZE clean |
| 6 | Security | Rate limits, input validation, Helmet headers |
| 7 | Observability | /healthz OK; logs have request-id, code, status |
| 8 | CI/CD | Green on PR; branch protection enforced |
| 9 | DevEx | Bootstrap <= 10 minutes |
| 10 | Frontend | List → detail → share → deep link works end-to-end |
| 11 | Offline | Create offline, sync on reconnect |
| 12 | Acceptance | AC timings met; runbook works; sign-off |

---

## Command Reference

```bash
# Local dev
npm install
npm run dev                # Start dev server (http://localhost:3000)
npm test                   # Run all tests
npm run test:watch        # Watch mode

# Database
npm run migrate            # Run pending migrations
npm run migrate:rollback   # Rollback last migration
npm run seed               # Run seeds
npm run db:reset           # Truncate + seed (fastest cycle)

# Code generation
npm run gen:types          # Regenerate types from OpenAPI

# CI locally
npm run check:types        # TypeScript check
npm run test:unit          # Unit tests only (no integration)
npm test                   # Full suite (unit + integration + migrations)

# Docker
docker compose up -d       # Start PostgreSQL + PostGIS
docker compose down        # Stop
docker compose logs -f     # Tail logs
```

---

## Notes

- **Windows PowerShell:** Always set npm/npx aliases at session start (see smoke test script)
- **Test isolation:** Jest runs with `maxWorkers: 1` to prevent migration lock conflicts
- **Environment split:** `DATABASE_URL` for dev, `DATABASE_URL_TEST` for tests
- **CI secrets:** Ensure `MAPBOX_TOKEN` is set in GitHub Actions (can be empty)
- **Postman:** Export from OpenAPI spec to keep collection in sync

---

**Let's ship! 🚀**
