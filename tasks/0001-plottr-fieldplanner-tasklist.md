# TASK LIST: Plottr Field Planner v1

**Document Version:** 1.0  
**Date:** October 18, 2025  
**Total Tasks:** 42  
**Estimated Duration:** 30 working days (3 x 10-day sprints)  
**Team:** 3 developers (1 FE, 1 BE, 1 DevOps/AI)

---

## 🚀 CURRENT PROGRESS (October 19, 2025)

**Sprint 1: Foundation - IN PROGRESS**
- ✅ FEAT-001: Clerk Integration & JWT Setup - **7/7 subtasks COMPLETE (100%) 🎉**
  - Frontend: Clerk SDK installed, App Router migration done, ClerkProvider setup ✅
  - Backend: JWT middleware with Clerk verification working, /api/auth/me endpoint live ✅
  - Database: Migration created with UsersRepo + UserService implementation ✅
  - Testing: 36 new tests created, 194/194 tests passing ✅
  - Documentation: Complete implementation guides delivered ✅
- ⏳ FEAT-002 through FEAT-018: Pending (can now proceed with FEAT-001 complete)

**Key Milestones Achieved:**
- ✅ Clerk test environment configured with API keys
- ✅ Frontend migrated from Pages Router to App Router (required for Clerk integration)
- ✅ Backend JWT validation middleware using @clerk/backend
- ✅ Auth endpoint operational and returning user tier
- ✅ Database migration prepared with tier system columns
- ✅ User service with Clerk event handlers (user.created/updated/deleted)
- ✅ Webhook endpoint for Clerk events
- ✅ Comprehensive test suite (194 tests, 100% passing)
- ✅ Production-ready authentication system

---

## 📋 Task Organization

Tasks are grouped by sprint and feature area. Each task includes:
- **Task ID:** Format `FEAT-###`
- **Title:** Concise feature/module name
- **Effort:** S (2-3 days), M (4-5 days), L (6-8 days)
- **Owner:** FE (Frontend), BE (Backend), DevOps
- **Dependencies:** Blocking tasks (must complete first)
- **Acceptance Criteria:** Definition of done

---

## 🏃 SPRINT 1: Foundation (Days 1-10)

### Authentication & User Management

#### FEAT-001: Clerk Integration & JWT Token Setup
- **Effort:** M
- **Owner:** BE
- **Dependencies:** None (can work in parallel)
- **Status:** ✅ COMPLETE (7/7 Subtasks Complete - 100%)
- **Acceptance Criteria:**
  - [x] Clerk dashboard configured (test app created)
  - [x] Backend `/api/auth/me` endpoint implemented (JWT validation)
  - [x] JWT tokens extracted from Clerk SDK and validated on all protected routes
  - [x] User record created in PostgreSQL `users` table on Clerk signup (via webhook)
  - [x] Tier column (`free`, `paid_individual`, `club_admin`, `admin`) defaults to `free`
  - [x] Tests: 36 unit tests for auth middleware, routes, service, and repository
- **Subtasks Completed:**
  - [x] T-001.1: Install Clerk SDK (Frontend) - `@clerk/nextjs@6.33.7` installed
  - [x] T-001.2: Create middleware.ts with clerkMiddleware() - `web/middleware.ts` created
  - [x] T-001.3: Migrate to App Router + Setup ClerkProvider - Pages Router → App Router migration complete
  - [x] T-001.4: Install Clerk Backend + JWT Middleware - `@clerk/backend` installed, JWT validation in `src/middleware/auth.ts`
  - [x] T-001.5: Create /api/auth/me Endpoint - GET `/api/auth/me` endpoint working
  - [x] T-001.6: Database Schema + User Creation - Migration created, UsersRepo + UserService implemented, webhook handler ready
  - [x] T-001.7: Add Unit Tests - 36 new tests created, 194/194 tests passing (100%)
- **Documentation:**
  - T-001_FINAL_DELIVERY.md - Complete implementation guide
  - T-001_07_UNIT_TESTS_COMPLETE.md - Test documentation
  - T-001_QUICK_REFERENCE.md - Quick start guide
  - T-001_EXECUTION_COMPLETE.md - Final execution report

#### FEAT-002: Tier-Based Route Protection
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-001
- **Acceptance Criteria:**
  - [ ] Middleware checks user tier on all routes
  - [ ] Free user can create max 3 layouts (POST /api/layouts returns 402 on 4th)
  - [ ] Paid user bypass limit
  - [ ] Rate limiting per tier: authenticated 100 req/min, export 10 req/min, AI 5 req/min
  - [ ] Tests: 8 tests for tier enforcement and rate limiting

#### FEAT-003: Frontend Clerk Integration & Auth UI
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-001
- **Acceptance Criteria:**
  - [ ] Clerk `<SignedIn>` / `<SignedOut>` guards on protected pages
  - [ ] Sign-up page (redirect unauthenticated users)
  - [ ] Sign-out button on dashboard
  - [ ] Dashboard shows user email + tier badge (Free / Paid)
  - [ ] Upgrade modal appears when free user hits layout limit
  - [ ] Tests: 6 tests for auth flow (mock Clerk)

---

### Location Search & Field Selection

#### FEAT-004: Geocoding & Location Search Backend
- **Effort:** M
- **Owner:** BE
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] POST `/api/geocode/search?q=field-name` endpoint
  - [ ] Calls MapTiler Geocoding API (primary)
  - [ ] Falls back to OSM Nominatim if MapTiler fails
  - [ ] Returns: name, address, lat/lng, bounds (center + zoom)
  - [ ] Caches results in Redis for 24h (avoid duplicate calls)
  - [ ] Rate limited to 10 req/sec per user
  - [ ] Tests: 5 tests for both geocoding sources + fallback

#### FEAT-005: Location Search Frontend UI
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-004
- **Acceptance Criteria:**
  - [ ] Dashboard → "New Layout" → search input with autocomplete
  - [ ] Autocomplete shows 5 results, real-time as user types
  - [ ] Each result shows name, address, distance, thumbnail preview
  - [ ] Click result → loads map view, auto-zooms to bounds
  - [ ] Option to draw bounding box instead (map draw mode)
  - [ ] Tests: 4 tests for search UI component

#### FEAT-006: Boundary Import (GeoJSON/KML)
- **Effort:** M
- **Owner:** BE
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] POST `/api/geometries/import` accepts GeoJSON or KML file (multipart form)
  - [ ] Parses geometry using @turf/turf library
  - [ ] Validates polygon: ST_IsValid in PostGIS
  - [ ] Returns validated boundary + area in m²
  - [ ] Error handling: malformed file, invalid polygon, too large (>10km²)
  - [ ] Tests: 6 tests for GeoJSON/KML parsing + validation

#### FEAT-007: Geometry Validation Service
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-006
- **Acceptance Criteria:**
  - [ ] Validates polygon closure, winding order, self-intersection
  - [ ] Uses PostGIS `ST_IsValid()`, `ST_IsSimple()`, `ST_Area()`
  - [ ] Returns human-readable error messages (e.g., "Polygon must be closed")
  - [ ] Reusable service used by all geometry endpoints
  - [ ] Tests: 8 tests covering edge cases (holes, invalid winding, etc.)

---

### Layout Model & Database

#### FEAT-008: Database Schema (Users, Workspaces, Layouts)
- **Effort:** L
- **Owner:** BE / DevOps
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] Migration 001: Create `users`, `workspaces` tables
  - [ ] Migration 002: Create `layouts` table with PostGIS boundary
  - [ ] Migration 003: Create `items`, `layers`, `templates`, `share_links` tables
  - [ ] All indexes created (workspace_id, updated_at, slug, etc.)
  - [ ] Soft deletes implemented (deleted_at timestamp)
  - [ ] Clerk user ID stored in `users.clerk_id` (unique)
  - [ ] Migration scripts tested locally + against test database
  - [ ] Tests: 5 tests for schema integrity (foreign keys, constraints)

#### FEAT-009: Create Layout Endpoint & CRUD
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-008
- **Acceptance Criteria:**
  - [ ] POST `/api/layouts` → creates layout in database
  - [ ] GET `/api/layouts` → lists layouts for current workspace (paginated)
  - [ ] GET `/api/layouts/:id` → fetch single layout with full json_data
  - [ ] PUT `/api/layouts/:id` → update title, description, boundary
  - [ ] DELETE `/api/layouts/:id` → soft delete (set deleted_at)
  - [ ] All endpoints check tier (free user blocked on 4th layout)
  - [ ] Tests: 10 tests for CRUD operations, tier enforcement

#### FEAT-010: Layout Autosave Endpoint
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] POST `/api/layouts/:id/autosave` → saves json_data without full validation
  - [ ] Called every 5s from frontend (debounced)
  - [ ] Updates `updated_at` timestamp
  - [ ] Returns success + version timestamp for conflict detection
  - [ ] Queues sync to Redis cache for offline conflict resolution
  - [ ] Tests: 5 tests for autosave + conflict scenarios

---

### Canvas Basics (Frontend)

#### FEAT-011: MapLibre Canvas Setup & Pan/Zoom
- **Effort:** L
- **Owner:** FE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] MapLibre GL instance created in editor page
  - [ ] Zoom 1-22, smooth pan/scroll, pinch zoom on touch
  - [ ] Keyboard: arrow keys pan, +/- zoom
  - [ ] Double-click to zoom to layout boundary
  - [ ] Grid overlay (toggle 1m/5m/10m snap)
  - [ ] Tests: 4 tests for map interactions

#### FEAT-012: Icon Placement Tool
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-011
- **Acceptance Criteria:**
  - [ ] Toolbar with 20+ icons (cones, goals, tents, toilets, stalls, stages, hazards)
  - [ ] Click icon in toolbar → cursor changes to crosshair
  - [ ] Click on map → places icon at location with label
  - [ ] Right-click icon → context menu (edit label, change icon, delete)
  - [ ] Drag to move, small square handle for resize
  - [ ] Undo (Ctrl+Z) removes last placed icon
  - [ ] Tests: 5 tests for icon placement + manipulation

#### FEAT-013: Labels & Text Tool
- **Effort:** S
- **Owner:** FE
- **Dependencies:** FEAT-012
- **Acceptance Criteria:**
  - [ ] Toolbar text tool → click on map → edit popup
  - [ ] Text input + color picker + font size dropdown
  - [ ] Label rendered on map with chosen styling
  - [ ] Edit label: double-click text
  - [ ] Delete: right-click → delete
  - [ ] Tests: 3 tests for label creation + editing

#### FEAT-014: Undo/Redo System
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-012
- **Acceptance Criteria:**
  - [ ] Undo (Ctrl+Z) reverts last action (place icon, add label, move, etc.)
  - [ ] Redo (Ctrl+Y) reapplies undone action
  - [ ] History stored in memory (max 50 actions)
  - [ ] Undo button disabled if no history, redo button disabled if at current state
  - [ ] Tests: 6 tests for undo/redo sequences

#### FEAT-015: Layers Panel (Basic)
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-014
- **Acceptance Criteria:**
  - [ ] Right sidebar shows layers list
  - [ ] Each layer: name, visibility (eye icon), lock (lock icon)
  - [ ] Click eye → toggle visibility on canvas
  - [ ] Click lock → prevent editing (items stay locked)
  - [ ] Drag to reorder layers (affects render order on map)
  - [ ] Right-click layer → rename or delete
  - [ ] "Add Layer" button creates new layer
  - [ ] Tests: 5 tests for layer panel interactions

#### FEAT-016: Lines & Freehand Drawing
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-012
- **Acceptance Criteria:**
  - [ ] Toolbar line tool (straight) and freehand (pen) tool
  - [ ] Straight line: click two points, draws line with width/color
  - [ ] Freehand: click → drag to draw smooth line
  - [ ] Edit line: click to add points, right-click point to delete
  - [ ] Color + width picker in toolbar
  - [ ] Tests: 4 tests for line drawing

---

### Autosave & LocalStorage (Frontend)

#### FEAT-017: LocalStorage State Persistence
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-010, FEAT-012
- **Acceptance Criteria:**
  - [ ] Every action (place icon, move item, rename layer) auto-saves to LocalStorage
  - [ ] State structure: { layout_id, items[], layers[], timestamp }
  - [ ] On page reload, prompt user: "Resume editing?" with 2 options
  - [ ] Resume: restores canvas state exactly
  - [ ] Start fresh: clears local state, fetches from server
  - [ ] Storing plan for future IndexedDB migration (document structure)
  - [ ] Tests: 5 tests for LocalStorage read/write/recovery

#### FEAT-018: Autosave to Server (Hybrid Strategy)
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-010, FEAT-017
- **Acceptance Criteria:**
  - [ ] Every 5s → debounced POST `/api/layouts/:id/autosave` with current canvas state
  - [ ] Show "Saving..." indicator while request in flight
  - [ ] On success → indicator changes to "✓ Synced" (auto-hides in 2s)
  - [ ] On network error → queue sync, retry every 5s
  - [ ] On connection restored → immediate sync
  - [ ] Conflict resolution: server wins (last-write-wins), show notification
  - [ ] Tests: 6 tests for sync scenarios (success, failure, conflicts)

---

## 🏃 SPRINT 2: Canvas & Export (Days 11-20)

### Advanced Canvas Tools

#### FEAT-019: Polygon Drawing Tool
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-016
- **Acceptance Criteria:**
  - [ ] Toolbar polygon tool → click points to create polygon
  - [ ] Double-click to close polygon, or press Enter
  - [ ] Show fill color + stroke color pickers in toolbar
  - [ ] Edit polygon: click edges to add points, drag to move
  - [ ] Right-click point → delete point
  - [ ] Delete polygon: right-click interior → delete
  - [ ] Tests: 5 tests for polygon creation + editing

#### FEAT-020: Zones & Named Areas
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-019
- **Acceptance Criteria:**
  - [ ] Toolbar zone tool → click two corners to create rectangle
  - [ ] Or freehand mode: click multiple points → auto-close as polygon
  - [ ] Edit zone: click to add name label in center
  - [ ] Change color, opacity (visual indicator of zone type)
  - [ ] Preset zone types (dropdown): Goal Area, Spectator Zone, Parking, Entry, etc.
  - [ ] Tests: 4 tests for zone creation + naming

#### FEAT-021: Circles & Buffers
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-020
- **Acceptance Criteria:**
  - [ ] Toolbar circle tool → click center → drag to set radius
  - [ ] Show radius in meters as dragging
  - [ ] Color + opacity controls
  - [ ] Safety buffer buttons: 1m / 2m / 5m / 10m
  - [ ] Select item (cone, goal) → click buffer button → auto-generates concentric circle
  - [ ] Can adjust circle after creation (drag edge to resize)
  - [ ] Tests: 4 tests for circle + buffer creation

#### FEAT-022: Measurement Tools (Distance & Area)
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-021
- **Acceptance Criteria:**
  - [ ] Toolbar measurement tool
  - [ ] Click two points → shows line with distance in meters/feet
  - [ ] Click multiple points → shows area in m² or acres when closed
  - [ ] Perimeter also displayed for polygons
  - [ ] Unit toggle (metric ↔ imperial)
  - [ ] Measurements stay on canvas (can delete)
  - [ ] Tests: 5 tests for measurement calculations

---

### Sharing & Permissions

#### FEAT-023: Share Link Generation
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] POST `/api/layouts/:id/share` → generates unique slug + token
  - [ ] Returns share link: `https://plottr.app/s/:slug`
  - [ ] Stores in `share_links` table with permission (view/edit), expiry
  - [ ] GET `/api/layouts/:id/share` → list all active share links
  - [ ] PUT `/api/layouts/:id/share/:slug` → update permission, expiry, password
  - [ ] DELETE `/api/layouts/:id/share/:slug` → revoke link
  - [ ] Tests: 8 tests for CRUD share links

#### FEAT-024: Public Read-Only Share Page
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-023
- **Acceptance Criteria:**
  - [ ] GET `/s/:slug` → public page (no auth required)
  - [ ] Shows map with layout (read-only, no editing)
  - [ ] Shows title, description, last-updated timestamp
  - [ ] Download buttons: PNG, PDF
  - [ ] Share buttons: copy link, QR code, email, Twitter, Facebook
  - [ ] Share count badge (number of times shared)
  - [ ] Responsive (mobile-friendly)
  - [ ] Tests: 5 tests for public page rendering

#### FEAT-025: Private Share Link & Edit Permission
- **Effort:** M
- **Owner:** BE
- **Dependencies:** FEAT-023
- **Acceptance Criteria:**
  - [ ] PUT `/api/layouts/:id/share/:slug` with permission: `edit`
  - [ ] Generates token-based URL: `/s/:slug?token=xyz123`
  - [ ] Token validates user has edit permission
  - [ ] Editor loads in edit mode (not read-only)
  - [ ] Changes saved to shared layout (not copy)
  - [ ] Multiple users can edit simultaneously (future: real-time; for now: last-write-wins)
  - [ ] Tests: 5 tests for permission enforcement

---

### Export Engine

#### FEAT-026: PNG Export Backend (4K)
- **Effort:** L
- **Owner:** BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] GET `/api/layouts/:id/export/png` → async job
  - [ ] Renders layout map + items + layers → 4000x3000px image
  - [ ] Uses headless browser (Puppeteer) or canvas library (Jimp/Sharp)
  - [ ] Stores PNG in S3 with 24h expiry
  - [ ] Returns download link + expiry
  - [ ] Notifications: Email download link when ready (optional in v1)
  - [ ] Tests: 5 tests for PNG generation (mock S3)

#### FEAT-027: PNG Export Frontend
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-026
- **Acceptance Criteria:**
  - [ ] Editor → "Export" button → modal with format options
  - [ ] Select PNG, size (4K preset), include grid/legend/scale
  - [ ] Click "Download" → calls backend, shows progress
  - [ ] When ready, triggers download via browser
  - [ ] Show link to share exported image (copy to clipboard)
  - [ ] Tests: 3 tests for export UI

#### FEAT-028: PDF Export Backend (A4/A3, 300 DPI)
- **Effort:** L
- **Owner:** BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] GET `/api/layouts/:id/export/pdf` → async job
  - [ ] Accepts query params: size (A4/A3), orientation (portrait/landscape)
  - [ ] Renders layout → PDF using jsPDF or similar
  - [ ] Includes: title block, map, legend (layers + colors), scale bar
  - [ ] 300 DPI output (print-ready)
  - [ ] Stores in S3, returns download link
  - [ ] Batch: Multiple layouts → multiple PDFs zipped
  - [ ] Tests: 6 tests for PDF generation

#### FEAT-029: PDF Export Frontend
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-028
- **Acceptance Criteria:**
  - [ ] Editor → "Export" → modal with PDF options
  - [ ] Size selector: A4 or A3
  - [ ] Orientation: portrait or landscape
  - [ ] Preview (thumbnail) of PDF output
  - [ ] Click "Download" → calls backend, shows progress
  - [ ] Email option (for paid users): Sends PDF to email
  - [ ] Tests: 3 tests for PDF export UI

#### FEAT-030: Google Maps Deeplink Export
- **Effort:** S
- **Owner:** BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] GET `/api/layouts/:id/export/google-maps` → generates URL
  - [ ] If layout simple (few items): Include boundary polygon + markers
  - [ ] If complex: Boundary polygon only (URL length limits)
  - [ ] Returns `https://maps.google.com?q=...&markers=...`
  - [ ] Tests: 4 tests for URL generation

---

### Offline Support

#### FEAT-031: Service Worker & Static Asset Caching
- **Effort:** M
- **Owner:** FE / DevOps
- **Dependencies:** None (can work in parallel)
- **Acceptance Criteria:**
  - [ ] `/public/sw.js` implements Service Worker lifecycle
  - [ ] Install event: caches app shell (HTML, JS, CSS)
  - [ ] Fetch event: cache-first for static assets, network-first for API
  - [ ] Activate event: deletes old cache versions
  - [ ] Testing: DevTools → Application → Service Workers (verify registration)
  - [ ] Offline indicator in UI (icon + status text)
  - [ ] Tests: 5 tests for SW lifecycle

#### FEAT-032: IndexedDB Schema & Cache Manager
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-031
- **Acceptance Criteria:**
  - [ ] IndexedDB stores: layouts, items, layers, sync_queue
  - [ ] Cache manager library: open(), read(), write(), delete()
  - [ ] TTL implementation: store created_at + ttl_days, check on read
  - [ ] Automatic cleanup: delete expired entries on startup
  - [ ] Transaction support: multi-store writes atomic
  - [ ] Tests: 8 tests for IndexedDB operations

#### FEAT-033: Offline Layout Viewing & Editing
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-032
- **Acceptance Criteria:**
  - [ ] Open previously-viewed layout without network
  - [ ] Edit layout offline (add icons, move items, rename layers)
  - [ ] All edits saved to IndexedDB locally
  - [ ] Undo/redo works offline
  - [ ] Autosave still runs (queues to sync_queue table in IndexedDB)
  - [ ] Status shows "Offline Mode" with warning color
  - [ ] Tests: 5 tests for offline editing

#### FEAT-034: Offline Export (PNG/PDF Client-Side)
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-033
- **Acceptance Criteria:**
  - [ ] User can export PNG/PDF while offline
  - [ ] Uses html2canvas (client-side rendering, no server call)
  - [ ] PDF generation via jsPDF (local, no backend)
  - [ ] Files saved to browser downloads folder
  - [ ] Notification: "Offline export ready; will sync when online"
  - [ ] On reconnect, checks if cloud version newer, offers merge
  - [ ] Tests: 4 tests for offline export

#### FEAT-035: Sync Queue & Conflict Resolution
- **Effort:** M
- **Owner:** FE
- **Dependencies:** FEAT-034
- **Acceptance Criteria:**
  - [ ] When offline, all POST/PUT requests queued in sync_queue
  - [ ] On reconnect, execute queued requests in order
  - [ ] If conflict (server version newer): Show UI modal
  - [ ] Options: "Keep Local" (override), "Keep Server" (discard local), "Merge"
  - [ ] For now: last-write-wins (no manual merge)
  - [ ] Notification on successful sync
  - [ ] Tests: 6 tests for sync scenarios

---

## 🏃 SPRINT 3: Templates, Admin & Polish (Days 21-30)

### Templates & Presets

#### FEAT-036: Built-In Templates (5-10)
- **Effort:** M
- **Owner:** FE / BE
- **Dependencies:** FEAT-009
- **Acceptance Criteria:**
  - [ ] Create 5-10 templates (soccer, rugby, event, school setups)
  - [ ] Each template includes: layout, layers, sample items, description
  - [ ] Seed database with templates (migration)
  - [ ] Dashboard → "New Layout" shows template gallery (thumbnail + title)
  - [ ] Click "Use Template" → creates new layout from template (user can edit)
  - [ ] Tests: 3 tests for template loading + creation

#### FEAT-037: Save Layout as Template
- **Effort:** M
- **Owner:** FE / BE
- **Dependencies:** FEAT-036
- **Acceptance Criteria:**
  - [ ] Editor → "Save as Template" button
  - [ ] Modal: name, description, category (dropdown)
  - [ ] Only paid users can submit (free users see "Upgrade" prompt)
  - [ ] POST `/api/templates` → creates template in `pending_approval` status
  - [ ] Admin must approve before public (moderation queue)
  - [ ] Tests: 4 tests for template submission

#### FEAT-038: Community Template Browsing & Rating
- **Effort:** M
- **Owner:** FE / BE
- **Dependencies:** FEAT-037
- **Acceptance Criteria:**
  - [ ] GET `/api/templates?status=approved` → list approved community templates
  - [ ] Dashboard → "Browse Community" tab shows gallery
  - [ ] Each template card: thumbnail, title, author, usage count, rating (stars)
  - [ ] Click template → preview map, description
  - [ ] "Use This Template" button (same as built-in)
  - [ ] Rating system: user can rate 1-5 stars (stores in DB)
  - [ ] Tests: 4 tests for template gallery

---

### AI Features (Modular, Feature-Flagged)

#### FEAT-039: Polygon Suggestion Backend (SAM Model)
- **Effort:** L
- **Owner:** BE / AI generalist
- **Dependencies:** FEAT-004
- **Acceptance Criteria:**
  - [ ] POST `/api/ai/polygon-suggestion` accepts image (upload or satellite tile)
  - [ ] Calls SAM model (self-hosted or API) for field boundary detection
  - [ ] Returns suggested polygon as GeoJSON
  - [ ] Rate limiting: 2/month free, 20/month paid (HTTP 429 if exceeded)
  - [ ] Fallback: If SAM fails, manual drawing mode
  - [ ] Cost tracking: Log AI usage to database
  - [ ] Tests: 5 tests for polygon suggestion (mock SAM)

#### FEAT-040: Layout Generation via LLM
- **Effort:** L
- **Owner:** BE / AI generalist
- **Dependencies:** None (can work in parallel)
- **Acceptance Criteria:**
  - [ ] POST `/api/ai/layout-generation` with form: sport, age_group, field_size
  - [ ] Calls OpenAI/Claude API with prompt (structured generation)
  - [ ] Returns suggested layout: items[], zones[], layers[] as JSON
  - [ ] Frontend renders suggestion on canvas with "Use This" button
  - [ ] Rate limiting: 2/month free, 20/month paid
  - [ ] Cost tracking + budget limits (disable if over budget)
  - [ ] Tests: 5 tests for layout generation (mock LLM)

#### FEAT-041: Feature Flag System & AI Toggle
- **Effort:** M
- **Owner:** BE
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] Feature flag service in backend (Redis-backed or in-memory)
  - [ ] Flags: `enable_ai_polygon_suggestion`, `enable_ai_layout_generation`, `enable_community_templates`, etc.
  - [ ] Admin dashboard: List flags with toggle switches
  - [ ] Changes persist immediately (no deploy needed)
  - [ ] Client polls every 5s for flag changes (or webhook)
  - [ ] Frontend respects flags (hides AI buttons if disabled)
  - [ ] Tests: 4 tests for feature flag system

---

### Admin Dashboard

#### FEAT-042: Admin User Management & Analytics
- **Effort:** L
- **Owner:** FE / BE
- **Dependencies:** FEAT-002, FEAT-009
- **Acceptance Criteria:**
  - [ ] `/admin` dashboard (Clerk admin role required)
  - [ ] User list: email, name, tier, signup date, last login, status (active/suspended)
  - [ ] Search by email, filter by tier
  - [ ] Actions: Suspend user (set is_active = FALSE), Reactivate, Impersonate
  - [ ] Impersonate: Generate token, redirect to `/app` as user, audit log
  - [ ] Analytics tabs:
    - Overview: DAU, MAU, paid users, total revenue (placeholder)
    - Layouts: Created count, exports, avg per user
    - Templates: Most popular, pending approvals, rejection reasons
    - AI: Usage stats, cost burn, rate limiting details
  - [ ] Charts: Line graph (DAU trend), pie (tier breakdown), bar (top templates)
  - [ ] Export analytics as CSV
  - [ ] Tests: 8 tests for admin pages (mock auth)

#### FEAT-043: Template Moderation Queue
- **Effort:** M
- **Owner:** FE / BE
- **Dependencies:** FEAT-037, FEAT-042
- **Acceptance Criteria:**
  - [ ] Admin dashboard → "Templates" tab → "Pending" queue
  - [ ] Show submitted templates: author, title, category, submission date
  - [ ] Thumbnail preview, description, sample items
  - [ ] Actions: Approve (public immediately), Reject (with reason)
  - [ ] Bulk actions: Select multiple, approve all, reject all
  - [ ] Rejected templates: Send email to author with feedback
  - [ ] Approved templates: Auto-email author + notify in-app
  - [ ] Moderation SLA: Response within 24h (admin note)
  - [ ] Tests: 5 tests for moderation workflows

---

### Polish & Testing

#### FEAT-044: Dark Mode Toggle
- **Effort:** M
- **Owner:** FE
- **Dependencies:** None
- **Acceptance Criteria:**
  - [ ] Settings → Theme toggle (Light / Dark / System)
  - [ ] shadcn/ui components respect theme
  - [ ] Canvas (MapLibre) dark mode style
  - [ ] Persists to LocalStorage
  - [ ] Respects system preference on first load
  - [ ] Tests: 3 tests for theme switching

#### FEAT-045: Performance Optimization & Lighthouse
- **Effort:** M
- **Owner:** FE / DevOps
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Lighthouse score ≥85 on mobile, ≥90 on desktop
  - [ ] First Contentful Paint: <1.5s
  - [ ] Largest Contentful Paint: <2.5s
  - [ ] Cumulative Layout Shift: <0.1
  - [ ] Code splitting per route (Next.js dynamic imports)
  - [ ] Image optimization (WebP, lazy loading)
  - [ ] Service Worker caching strategy optimized
  - [ ] Tests: 2 tests (Lighthouse CI)

#### FEAT-046: Error Handling & User Feedback
- **Effort:** M
- **Owner:** FE / BE
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Backend: Consistent error responses (status, message, code)
  - [ ] Frontend: Toast notifications for errors (15s timeout)
  - [ ] Network errors: Retry button + offline indicator
  - [ ] Validation errors: Inline field messages (red border + helper text)
  - [ ] Sentry integration: Errors logged with breadcrumbs + context
  - [ ] User-facing error page (500, 404, etc.)
  - [ ] Tests: 5 tests for error scenarios

#### FEAT-047: End-to-End Testing (Playwright)
- **Effort:** L
- **Owner:** FE / QA
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Critical user flows covered:
    1. Sign up → create layout → export PNG → share link
    2. Browse community template → use template
    3. Go offline → edit layout → download → sync on reconnect
  - [ ] Cross-browser: Chrome, Firefox, Safari, Edge
  - [ ] Mobile viewport: 375px (iPhone), 768px (tablet)
  - [ ] Performance: Measure load time, export time, share link load time
  - [ ] Tests run on CI (GitHub Actions) before deploy
  - [ ] Tests: 15 E2E test cases

#### FEAT-048: Security & Compliance Checklist
- **Effort:** M
- **Owner:** BE / DevOps
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Helmet.js security headers configured
  - [ ] HTTPS enforced (Vercel + Railway automatic)
  - [ ] CORS policy set (frontend domain only)
  - [ ] SQL injection: Parameterized queries (Knex.js)
  - [ ] XSS: DOMPurify on user text, CSP headers
  - [ ] CSRF: Tokens on state-changing requests (Clerk handles for auth)
  - [ ] Rate limiting tested (should reject >100 req/min)
  - [ ] Sensitive data: API keys in environment variables (never in code)
  - [ ] Privacy: GDPR banner (Termly), cookie consent, data deletion flow
  - [ ] Tests: 8 security tests (penetration testing checklist)

#### FEAT-049: Deployment & Infrastructure Setup
- **Effort:** L
- **Owner:** DevOps
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] Frontend deployed to Vercel: automatic deploy on main branch push
  - [ ] Backend deployed to Railway: Docker image, auto-scaling, health checks
  - [ ] Database: PostgreSQL 16 on Railway, PostGIS extension enabled
  - [ ] Redis: Upstash managed service (cache + feature flags)
  - [ ] S3 / R2: Cloudflare R2 for PDF/PNG exports (cheaper than S3)
  - [ ] Environment variables: `.env.production` configured on both services
  - [ ] CI/CD: GitHub Actions workflow (test → build → deploy)
  - [ ] Monitoring: Sentry + BetterStack + CloudWatch
  - [ ] Backups: Nightly PostgreSQL backup to S3 (7-day retention)
  - [ ] Tests: 3 smoke tests (check homepage loads, API responds)

#### FEAT-050: Documentation & Runbook
- **Effort:** M
- **Owner:** DevOps / FE
- **Dependencies:** All features
- **Acceptance Criteria:**
  - [ ] User guide: How to create, share, export layouts
  - [ ] Admin guide: User management, template moderation, feature flags
  - [ ] Developer guide: API docs, schema, deployment process
  - [ ] Troubleshooting: Common issues + solutions
  - [ ] Runbook: Emergency procedures (data restore, incident response)
  - [ ] Video tutorials (future, not v1)
  - [ ] Tests: 1 documentation completeness check

---

## 📊 Sprint Assignment & Timeline

### Sprint 1: Foundation (Days 1-10)
**FE Tasks:** FEAT-003, 005, 011-018 (8 tasks)  
**BE Tasks:** FEAT-001, 002, 004, 006-010 (8 tasks)  
**DevOps:** Database setup, CI/CD  
**Deliverable:** Auth, location search, canvas basics, autosave

### Sprint 2: Canvas & Export (Days 11-20)
**FE Tasks:** FEAT-019-022, 024, 027, 029-035 (11 tasks)  
**BE Tasks:** FEAT-023, 025, 026, 028, 030 (5 tasks)  
**Deliverable:** Advanced canvas, export, offline, sharing

### Sprint 3: Templates, Admin & Polish (Days 21-30)
**FE Tasks:** FEAT-036, 037-038, 042-050 (13 tasks)  
**BE Tasks:** FEAT-039-041, 043 (4 tasks)  
**DevOps:** FEAT-045, 049 (2 tasks)  
**Deliverable:** Templates, AI, admin, testing, deployment

---

## 🚫 Out of Scope (Post-v1)

- Real-time collaboration (Phase 2)
- Mobile native apps (Phase 3)
- Stripe payment integration (Phase 2)
- Full RBAC / role-based permissions (Phase 2)
- Advanced search (ElasticSearch)
- Custom white-label domains
- API marketplace
- Third-party OAuth provider integrations

---

## ✅ Success Criteria (All Tasks Complete)

1. All 50 tasks completed (FEAT-001 through FEAT-050)
2. All unit/integration tests passing (target 80% code coverage)
3. E2E tests passing (critical user flows on Chrome, Firefox, Safari)
4. Lighthouse scores: ≥85 mobile, ≥90 desktop
5. Zero high-severity security issues (Sentry, OWASP check)
6. Uptime 99.9% maintained for 7 days pre-launch
7. Documentation complete (user, admin, developer guides)
8. Sign-off from product manager

---

## 📝 Notes for Development Team

### Architecture Patterns
- **State management:** Zustand on frontend (minimal, focused)
- **API design:** RESTful, versioned endpoints (/api/v1/...)
- **Database:** PostgreSQL with PostGIS for geospatial; migrations versioned
- **Error handling:** Zod for validation, consistent error responses
- **Testing:** Jest (unit/integration), Playwright (E2E)

### Dependencies to Watch
- MapLibre GL (vs Google Maps): Open-source, no API key cost
- Turf.js: Geospatial logic (distance, area, polygon operations)
- Clerk: Auth provider (simplifies user management)
- PostGIS: Geometry validation, spatial queries
- jsPDF / html2canvas: Client-side PDF/PNG rendering

### Risk Mitigations
1. **Canvas complexity:** Start simple (icons, labels), add tools iteratively
2. **AI cost overruns:** Implement strict rate limits from day 1
3. **Export performance:** Queue async jobs, don't block on large renders
4. **Offline sync conflicts:** Last-write-wins for v1 (manual merge in Phase 2)
5. **Admin abuse:** Audit log all admin actions, rate-limit impersonation

---

## 📞 Questions for Kickoff

1. Should we mock AI APIs for testing or use real APIs?
2. Polygon suggestion: Use Roboflow API or self-host SAM?
3. Stripe integration in Phase 2: How to structure payments for templates?
4. What's the acceptable max layout size (in MB) to sync offline?
5. Should we support collaborative editing in v1 or defer to Phase 2?

---

**End of Task List Document**

---

## 🎬 Quick Reference: Task Dependency Graph

```
FEAT-008 (Database Schema)
├── FEAT-009 (Layout CRUD)
│   ├── FEAT-023 (Share links)
│   ├── FEAT-026 (PNG export)
│   ├── FEAT-028 (PDF export)
│   └── FEAT-036 (Templates)
├── FEAT-001 (Clerk)
│   ├── FEAT-002 (Tier enforcement)
│   └── FEAT-003 (Auth UI)
└── FEAT-004 (Geocoding)
    └── FEAT-005 (Search UI)

FEAT-011 (MapLibre canvas)
├── FEAT-012 (Icons)
├── FEAT-016 (Lines)
└── FEAT-019 (Polygons)

FEAT-017 (LocalStorage)
└── FEAT-018 (Server autosave)

FEAT-031 (Service Worker)
└── FEAT-032 (IndexedDB)
    └── FEAT-033 (Offline editing)
        └── FEAT-035 (Sync queue)

FEAT-042 (Admin dashboard)
└── FEAT-043 (Template moderation)
```

---

## 📅 Gantt-Style Timeline

```
Week 1 (Sprint 1):
Day 1-2:   FEAT-001 (Clerk), FEAT-008 (Schema)
Day 3-4:   FEAT-009 (CRUD), FEAT-004 (Geocoding)
Day 5-6:   FEAT-011 (Canvas), FEAT-012 (Icons)
Day 7-8:   FEAT-017 (LocalStorage), FEAT-014 (Undo/Redo)
Day 9-10:  FEAT-015 (Layers), FEAT-018 (Autosave)

Week 2 (Sprint 2):
Day 11-12: FEAT-019 (Polygons), FEAT-020 (Zones)
Day 13-14: FEAT-026 (PNG), FEAT-028 (PDF)
Day 15-16: FEAT-031 (SW), FEAT-032 (IndexedDB)
Day 17-18: FEAT-023 (Share), FEAT-033 (Offline)
Day 19-20: FEAT-035 (Sync), Buffer + Measurements

Week 3 (Sprint 3):
Day 21-22: FEAT-036 (Templates), FEAT-042 (Admin)
Day 23-24: FEAT-039 (AI Polygon), FEAT-040 (AI Layout Gen)
Day 25-26: FEAT-047 (E2E Testing), FEAT-049 (Deployment)
Day 27-28: FEAT-048 (Security), FEAT-050 (Docs)
Day 29-30: Buffer + Polish + Launch Readiness
```

---

**Document Complete. Ready for Sprint Planning.**
