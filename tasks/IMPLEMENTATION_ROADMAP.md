# Plottr Field Planner v1: Detailed Implementation Roadmap

**Document:** Detailed task breakdown for development execution  
**Base PRD:** `0001-prd-plottr-fieldplanner-v1.md`  
**Quick Reference:** `0001-plottr-fieldplanner-tasklist.md`  
**Date:** October 18, 2025  
**Status:** Ready for Sprint 1 kickoff

---

## 📋 How to Use This Document

Each **Task (T-###)** includes:
- **Goal:** One-sentence outcome
- **Scope:** What's in/out of scope
- **Dependencies:** Prior tasks and prerequisites
- **External Tools Needed:** API keys, vendor accounts required (Tool Gate before starting)
- **Acceptance Criteria:** Numbered, testable statements
- **Testing Plan:** Unit, Integration, E2E, Component, Performance specs
- **Artifacts:** Code files, migrations, test specs to create/update
- **Done When:** Restate AC + green tests in CI (Node 18/20 matrix)

**Cadence:** 
- After each Task draft, I pause for your confirmation before moving to the next
- Subtasks are listed inline (no revert per subtask)
- Only full Task completion triggers a revert

**Tool Gate:**
- Before starting each Task, I confirm you have required external tools/API keys
- If missing, I provide signup links and `.env` template snippets

---

## 🛠️ Relevant Files (By Feature Area)

### Authentication & Authorization
- `src/middleware/auth.ts` - Clerk JWT validation middleware
- `src/middleware/auth.test.ts` - Auth middleware tests
- `src/lib/auth-utils.ts` - Helper functions for role/tier checking
- `src/lib/auth-utils.test.ts` - Auth utility tests
- `web/src/lib/clerk-hooks.ts` - Frontend Clerk integration hooks
- `web/src/lib/clerk-hooks.test.ts` - Frontend Clerk tests

### Layout & Canvas (Backend API)
- `src/routes/layouts.ts` - Layout CRUD endpoints
- `src/routes/layouts.test.ts` - Layout endpoint tests
- `src/services/layout-service.ts` - Business logic for layouts
- `src/services/layout-service.test.ts` - Layout service tests
- `src/schemas/layout.schema.ts` - Zod validation schemas
- `src/schemas/layout.schema.test.ts` - Schema tests

### Geometry & Validation
- `src/services/geometry-service.ts` - PostGIS geometry operations
- `src/services/geometry-service.test.ts` - Geometry tests with Turf fixtures
- `src/utils/geometry-helpers.ts` - Helper functions (buffer, measure, validate)
- `src/utils/geometry-helpers.test.ts` - Geometry helper tests

### Canvas & Layers (Frontend UI)
- `web/src/components/Canvas/MapCanvas.tsx` - MapLibre canvas component
- `web/src/components/Canvas/MapCanvas.test.tsx` - Canvas component tests
- `web/src/components/LayersPanel/LayersPanel.tsx` - Layers panel UI
- `web/src/components/LayersPanel/LayersPanel.test.tsx` - Layers panel tests
- `web/src/hooks/useCanvas.ts` - Canvas state management hook
- `web/src/hooks/useCanvas.test.ts` - Canvas hook tests

### Drawing Tools
- `web/src/components/DrawingTools/IconTool.tsx` - Icon placement tool
- `web/src/components/DrawingTools/IconTool.test.tsx` - Icon tool tests
- `web/src/components/DrawingTools/PolygonTool.tsx` - Polygon drawing tool
- `web/src/components/DrawingTools/PolygonTool.test.tsx` - Polygon tool tests
- `web/src/components/DrawingTools/MeasurementTool.tsx` - Measurement tool
- `web/src/components/DrawingTools/MeasurementTool.test.tsx` - Measurement tests

### Location Search & Geocoding
- `src/routes/geocoding.ts` - Geocoding API endpoints
- `src/routes/geocoding.test.ts` - Geocoding endpoint tests
- `src/services/geocoding-service.ts` - MapTiler + OSM integration
- `src/services/geocoding-service.test.ts` - Geocoding service tests
- `web/src/components/LocationSearch/LocationSearch.tsx` - Frontend search UI
- `web/src/components/LocationSearch/LocationSearch.test.tsx` - Search UI tests

### Sharing & Public Links
- `src/routes/sharing.ts` - Share link endpoints
- `src/routes/sharing.test.ts` - Sharing endpoint tests
- `src/services/sharing-service.ts` - Share link generation & validation
- `src/services/sharing-service.test.ts` - Sharing service tests
- `web/src/pages/s/[slug].tsx` - Public share page
- `web/src/pages/s/[slug].test.tsx` - Public page tests

### Export Engine
- `src/routes/export.ts` - Export endpoint handlers
- `src/routes/export.test.ts` - Export endpoint tests
- `src/services/export-service.ts` - PNG/PDF generation logic
- `src/services/export-service.test.ts` - Export service tests (mock file output)
- `web/src/components/ExportModal/ExportModal.tsx` - Export UI
- `web/src/components/ExportModal/ExportModal.test.tsx` - Export UI tests

### Offline Support (PWA)
- `web/public/sw.js` - Service Worker implementation
- `web/src/lib/cache-manager.ts` - IndexedDB cache abstraction
- `web/src/lib/cache-manager.test.ts` - Cache manager tests
- `web/src/lib/offline-api.ts` - Offline API wrapper
- `web/src/lib/offline-api.test.ts` - Offline API tests
- `web/src/hooks/useOfflineStatus.ts` - Offline status hook
- `web/src/hooks/useOfflineStatus.test.ts` - Offline status tests

### Templates & Presets
- `src/routes/templates.ts` - Template CRUD endpoints
- `src/routes/templates.test.ts` - Template endpoint tests
- `src/services/template-service.ts` - Template business logic
- `src/services/template-service.test.ts` - Template service tests
- `web/src/components/TemplateGallery/TemplateGallery.tsx` - Template UI
- `web/src/components/TemplateGallery/TemplateGallery.test.tsx` - Template UI tests
- `src/seeds/templates.seed.ts` - Built-in template seed data

### Admin Dashboard
- `web/src/pages/admin/index.tsx` - Admin dashboard
- `web/src/pages/admin/index.test.tsx` - Admin page tests
- `web/src/components/Admin/UserTable.tsx` - User management UI
- `web/src/components/Admin/UserTable.test.tsx` - User table tests
- `web/src/components/Admin/TemplateQueue.tsx` - Template moderation UI
- `web/src/components/Admin/TemplateQueue.test.tsx` - Moderation tests

### Database & Migrations
- `src/migrations/001_create_users_schema.sql` - Users table
- `src/migrations/002_create_layouts_schema.sql` - Layouts table
- `src/migrations/003_create_items_layers_schema.sql` - Items & layers tables

### CI/CD & Infrastructure
- `.github/workflows/ci.yml` - GitHub Actions CI/CD pipeline
- `lighthouse.config.js` - Lighthouse CI configuration
- `playwright.config.ts` - Playwright E2E test configuration

---

## 📋 Tasks (Detailed Implementation Roadmap)

### PHASE 1: FOUNDATION (Sprint 1, Days 1-10)

---

## T-001: Clerk Authentication Integration & JWT Validation

**Goal:** Enable user authentication via Clerk with JWT token validation on all protected routes.

**Scope:**
- ✅ Set up Clerk app in dashboard
- ✅ Backend JWT middleware for Clerk tokens
- ✅ User record creation on Clerk signup
- ✅ Tier system (free/paid/club/admin) in JWT claims
- ❌ Password reset flows (handled by Clerk frontend)
- ❌ 2FA setup (Clerk handles this)

**Dependencies:**
- None (first auth task)

**External Tools Needed:**
- **Clerk API:** Account + API keys (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
- **Clerk Dashboard:** https://dashboard.clerk.com

**Acceptance Criteria:**
1. Clerk app created with email + Google + Apple sign-in configured
2. Backend validates Clerk JWT on POST /api/auth/me endpoint
3. User tier stored in JWT custom claims and persisted to database
4. Free users default to "free" tier on signup
5. Auth middleware blocks unauthenticated requests to protected routes (HTTP 401)
6. Rate limiting applied per tier (100 req/min authenticated, 50 req/min anonymous)

**Testing Plan:**

| Test Type | Coverage |
|-----------|----------|
| **Unit** | JWT parsing, tier extraction, token expiry check |
| **Integration** | POST /api/auth/me (valid token, expired token, missing header), tier enforcement on CRUD endpoints |
| **E2E** | Clerk sign-up → JWT received → access protected endpoint (Playwright) |
| **Security** | Invalid signature rejection, rate limiting enforcement |

**Commands:**
```bash
npm run test:unit -- src/middleware/auth.test.ts
npm run test:api -- src/routes/auth.test.ts
npm run test:e2e -- auth.spec.ts
npm run lint
```

**Artifacts:**
- `src/middleware/auth.ts` - JWT validation middleware
- `src/middleware/auth.test.ts` - Auth middleware tests
- `src/lib/auth-utils.ts` - Helper functions (extractTier, validateJWT)
- `src/lib/auth-utils.test.ts` - Auth utility tests
- Update `src/types.ts` - Add User type with tier
- Update `package.json` - Add @clerk/backend dependency

**Done When:**
- ✅ All acceptance criteria verified
- ✅ Unit tests pass (60+ assertions)
- ✅ Integration tests pass (8+ endpoints)
- ✅ E2E auth flow works end-to-end
- ✅ CI pipeline green on Node 18/20 matrix

---

**TOOL GATE CHECKPOINT:**

Before I continue, please confirm you have:

1. ✅ **Active Clerk Account** – https://clerk.com/sign-up
2. ✅ **API Keys Ready** – from Clerk Dashboard (Publishable Key + Secret Key)
3. ✅ **Environment Variables Set** – `.env` has CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY

**If you need setup guidance, here's a template `.env` snippet:**

```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

**Response options:**
- A) "Clerk setup confirmed, ready to proceed"
- B) "Need Clerk signup link and detailed setup instructions"
- C) "Have different auth provider in mind, discuss alternatives"

Once confirmed, I'll generate the remaining **4 parent tasks for Phase 1** (Database Schema, Layout CRUD, Geocoding, Canvas Basics), then pause for your "Go" before expanding all into subtasks.

What's your status?
