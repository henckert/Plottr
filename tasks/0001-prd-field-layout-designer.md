# PRD-0001: Field Layout Designer & Sharing

**Status:** Draft  
**Created:** 2025-10-20  
**Owner:** Product Team  
**Target Release:** v2.0

---

## 1. Introduction/Overview

Plottr is pivoting from a sports field booking platform to a **Field Layout Designer & Sharing tool** for event organizers planning tournaments, fairs, field days, circuses, and similar temporary events. The goal is to enable users to visually design site layouts with zones (polygonal areas) and assets (points/lines), calculate geodesic measurements, version their designs, and share read-only public links with participants/vendors.

**Problem:** Event organizers currently use paper sketches, generic CAD tools, or spreadsheets to plan layouts—none integrate geospatial accuracy, easy sharing, or collaborative iteration. Participants receive static PDFs that are hard to update and lack interactivity.

**Solution:** A web-based tool with MapLibre geospatial editing, PostGIS-backed area calculations, versioned layouts, public share links, and export to PNG/GeoJSON/PDF.

---

## 2. Goals

1. **Enable rapid layout design**: Users can create Sites, draw Zones with advanced editing (snap-to-grid, vertex manipulation), and place Assets within 5 minutes for a basic layout.
2. **Provide reusable templates**: Ship with 3-5 common templates (e.g., rugby tournament, vendor rows, circus ring); allow users to save custom templates.
3. **Ensure geospatial accuracy**: All area/perimeter calculations use PostGIS `geography(POLYGON, 4326)` as server truth; display metric/imperial units.
4. **Support sharing workflows**: Generate public, read-only share links with interactive zone details (name, area, notes) for vendors/participants.
5. **Preserve history**: Manual versioning with named save points (e.g., "Draft 1", "Final") per Site; optimistic concurrency prevents conflicts.
6. **Coexist with booking**: Existing booking features remain accessible behind `FEATURE_BOOKING=false` flag (default off), preserving data while pivoting focus.

---

## 3. User Stories

### Event Organizers (Primary Users)
- **US-1**: As an event organizer, I want to create a new Site by searching an address (geocoding) or manually placing a boundary on satellite imagery, so I can accurately represent my event location.
- **US-2**: As an organizer, I want to draw Zones (vendor stalls, competition areas, parking) using polygon tools with snap-to-grid and vertex editing, so my layout is precise and aligned.
- **US-3**: As an organizer, I want to apply a template (e.g., "10x10 vendor grid") to quickly populate my Site with predefined Zones, saving setup time.
- **US-4**: As an organizer, I want to place Assets (entrances, restrooms, power outlets, pathways) with custom labels/categories, so participants know where facilities are.
- **US-5**: As an organizer, I want to see real-time geodesic area (m²/ft²) and perimeter for each Zone as I draw, so I can verify dimensions against vendor requirements.
- **US-6**: As an organizer, I want to save named Layout versions ("Draft 1", "Final"), so I can iterate without losing previous milestones.
- **US-7**: As an organizer, I want to generate a public share link for my Layout, so vendors/participants can view it without logging in.
- **US-8**: As an organizer, I want to export my Layout as PNG (for handouts), GeoJSON (for GIS tools), or PDF (with legend), so I can distribute it via multiple channels.

### Vendors/Participants (Secondary Users)
- **US-9**: As a vendor, I want to open a share link and see an interactive map with my assigned Zone highlighted, including area and notes, so I know exactly where to set up.
- **US-10**: As a participant, I want to view Zone details (e.g., competition schedule, parking info) by clicking on the map, so I can plan my arrival.

### On-Site Coordinators
- **US-11**: As a coordinator, I want to quickly edit a Layout on-site (adjust Zone boundaries, add a new restroom), save as "On-Site Update", and regenerate the share link, so real-time changes reach participants.

---

## 4. Functional Requirements

### 4.1 Sites
**FR-1**: System shall allow users to create a Site with name, address, and boundary (POLYGON geography).  
**FR-2**: System shall support Mapbox geocoding for address search; fallback to manual boundary placement if geocoding unavailable.  
**FR-3**: System shall display Sites with MapLibre GL basemap (satellite imagery + street overlay).  
**FR-4**: System shall enforce WGS84 (SRID 4326) for all geospatial data.  
**FR-5**: System shall apply optimistic concurrency control (`version_token`) to prevent conflicting edits on Sites.

### 4.2 Layouts
**FR-6**: System shall allow one Site to have multiple Layouts (1:N relationship).  
**FR-7**: Each Layout shall have: name, description, version name (e.g., "Draft 1"), creator ID, timestamps, `version_token`.  
**FR-8**: System shall support manual save points with user-defined version names.  
**FR-9**: System shall list all Layouts for a Site with cursor-based pagination.  
**FR-10**: System shall validate Layout updates with `If-Match` header (version token check).

### 4.3 Zones (Polygonal Areas)
**FR-11**: System shall allow users to draw Zones as polygons using MapLibre drawing tools.  
**FR-12**: System shall enforce PostGIS polygon validation: closed ring, counter-clockwise winding, no self-intersections.  
**FR-13**: System shall calculate Zone area (m²/ft²) and perimeter server-side via PostGIS `ST_Area(geography)` and `ST_Perimeter(geography)`.  
**FR-14**: System shall display area/perimeter in both metric and imperial units with client-side toggle.  
**FR-15**: System shall support advanced editing: move vertices, add/remove points, rotate, snap-to-grid (client-side preview).  
**FR-16**: Zones shall have: name, category (enum: vendor, parking, competition, stage, restroom, other), geometry, notes, color (hex).  
**FR-17**: System shall validate Zones fit within parent Site boundary (PostGIS `ST_Within` check).

### 4.4 Assets (Points/Lines - Optional)
**FR-18**: System shall allow users to place Point assets (entrances, restrooms, power outlets) with custom labels.  
**FR-19**: System shall allow users to draw LineString assets (pathways, barriers, utility runs) with custom labels.  
**FR-20**: Assets shall have: name, category (enum: entrance, restroom, power, water, path, barrier, other), geometry (Point/LineString), notes, icon (string reference).

### 4.5 Templates
**FR-21**: System shall ship with 3-5 predefined Layout templates: "Rugby Tournament (6 pitches)", "10x10 Vendor Grid", "Circus Ring + Buffer".  
**FR-22**: Templates shall store Zone/Asset configurations (relative positions, sizes) independent of Site geometry.  
**FR-23**: System shall allow users to apply a template to a Site, scaling/positioning Zones to fit Site boundary.  
**FR-24**: System shall allow users to save their current Layout as a custom template for reuse.  
**FR-25**: Templates shall be stored as JSON with schema validation (Zod).

### 4.6 Share Links
**FR-26**: System shall generate unique public share links (e.g., `/share/{uuid}`) for each Layout.  
**FR-27**: Share links shall display Layout in read-only mode: MapLibre map + Zone/Asset overlays.  
**FR-28**: Clicking a Zone on shared view shall display details modal: name, category, area, perimeter, notes.  
**FR-29**: Share links shall not require authentication.  
**FR-30**: System shall allow users to regenerate share link (new UUID) to revoke previous access.

### 4.7 Exports
**FR-31**: System shall export Layout as PNG (raster image of map with overlays) at user-selected resolution (default 1920x1080).  
**FR-32**: System shall export Layout as GeoJSON (FeatureCollection with Site boundary, Zones, Assets) for GIS software.  
**FR-33**: System shall export Layout as PDF with map image + legend table (Zone names, areas, categories).  
**FR-34**: Export priority: PNG > GeoJSON > PDF (KML deferred to future release).

### 4.8 REST API & Pagination
**FR-35**: All list endpoints shall use cursor-based pagination (`src/lib/pagination.ts` utilities).  
**FR-36**: API responses shall follow `{data: T[], next_cursor?: string, has_more: boolean}` shape.  
**FR-37**: All mutable resources (Sites, Layouts, Zones) shall use `version_token` + `If-Match` header for optimistic concurrency.  
**FR-38**: System shall throw `AppError` with HTTP status codes for controlled error responses.

### 4.9 Feature Flagging (Booking Coexistence)
**FR-39**: System shall implement `FEATURE_BOOKING` environment variable (default: `false`).  
**FR-40**: When `FEATURE_BOOKING=false`, booking UI routes (`/venues`, `/pitches`, `/sessions`) shall return 404 or redirect to home.  
**FR-41**: Existing booking database tables (venues, pitches, sessions) shall remain untouched; no destructive migrations.  
**FR-42**: System shall provide optional migration script to convert Venues → Sites, Pitches → Zones (preserving geometry).

---

## 5. Non-Goals (Out of Scope for v1)

**NG-1**: **No reservations/availability system**: This is a layout design tool, not a booking platform (booking remains feature-flagged).  
**NG-2**: **No collaborative editing**: Share links are read-only; no real-time multi-user editing (consider for v2).  
**NG-3**: **No embeddable iframes**: Share links are standalone pages (embeds deferred to future release).  
**NG-4**: **No offline mode**: Requires internet for basemap tiles and API calls (offline support if demand appears).  
**NG-5**: **No KML export**: Focus on PNG/GeoJSON/PDF; KML added later if requested.  
**NG-6**: **No mobile app**: Web-first; responsive design sufficient for tablets/phones.  
**NG-7**: **No team-based permissions**: Private/Public share links only; no invite-by-email collaboration (v2 feature).

---

## 6. Design Considerations

### 6.1 UI/UX
- **Map Editor**: Full-screen MapLibre map with left sidebar for Site/Layout list, right panel for Zone/Asset properties.
- **Drawing Tools**: Toolbar with polygon/point/line modes, snap-to-grid toggle, vertex edit mode, rotation handles.
- **Zone Properties Panel**: Name, category dropdown, color picker, notes textarea, real-time area/perimeter display.
- **Template Gallery**: Modal with thumbnail previews, "Apply Template" button, "Save as Template" in Layout menu.
- **Share Link UI**: "Share" button generates link, displays copyable URL + QR code, "Regenerate" option.
- **Export Modal**: Format selector (PNG/GeoJSON/PDF), resolution picker for PNG, "Download" button.

### 6.2 Responsive Design
- Desktop (>1200px): Full layout with dual sidebars.
- Tablet (768-1200px): Collapsible sidebars, map takes priority.
- Mobile (<768px): Fullscreen map with bottom sheet for controls.

---

## 7. Technical Considerations

### 7.1 Database Schema
**New Tables:**
- `sites`: id, club_id, name, address, boundary (geography POLYGON 4326), version_token, timestamps.
- `layouts`: id, site_id, name, description, version_name, created_by, version_token, timestamps.
- `zones`: id, layout_id, name, category (enum), geometry (geography POLYGON 4326), notes, color, display_order, timestamps.
- `assets`: id, layout_id, name, category (enum), geometry (geography POINT/LINESTRING 4326), notes, icon, timestamps.
- `templates`: id, name, description, config (jsonb), created_by, is_public, timestamps.
- `share_links`: id, layout_id, uuid (unique), created_at, expires_at (nullable).

**Migrations:**
- Knex migrations following `<seq>_<desc>.ts` naming (e.g., `0007_create_sites_layouts_zones.ts`).
- Foreign keys: `layouts.site_id → sites.id`, `zones.layout_id → layouts.id`, etc.

### 7.2 Backend (Express.js)
- **4-layer pattern**: Controllers (HTTP) → Services (business logic) → Repositories (Knex SQL) → DB.
- **Repos**: `sites.repo.ts`, `layouts.repo.ts`, `zones.repo.ts`, `assets.repo.ts`, `templates.repo.ts`, `share_links.repo.ts`.
- **Services**: Map untyped DB rows to Zod-validated DTOs; calculate area/perimeter via raw PostGIS queries.
- **Controllers**: Handle `If-Match` version tokens, call pagination utilities, export generation endpoints.

### 7.3 Frontend (Next.js + MapLibre)
- **MapLibre GL**: Use `maplibre-gl@3.6` for drawing/editing (leverage existing setup from pitch boundaries).
- **Drawing Library**: Integrate MapLibre Draw plugin for polygon/point/line tools.
- **State Management**: Zustand store for active Layout, Zones, Assets, editing mode.
- **API Client**: Extend `web/src/lib/api.ts` with Sites/Layouts/Zones endpoints.

### 7.4 Geospatial Validation
- Reuse `src/lib/geospatial.ts` for polygon validation (structure, WGS84 bounds, self-intersection, winding order).
- Add new validation: `validateZoneWithinSite(zone, site)` using PostGIS `ST_Within`.

### 7.5 Export Implementation
- **PNG**: Server-side using `maplibre-gl-native` or client-side Canvas export (`map.getCanvas().toBlob()`).
- **GeoJSON**: Serialize Sites/Layouts/Zones/Assets to FeatureCollection with properties.
- **PDF**: Use `jsPDF` with embedded PNG + table of Zone metadata.

### 7.6 Feature Flagging
- Add `FEATURE_BOOKING` to `src/config/index.ts`.
- Frontend: Conditionally render booking routes in navigation based on flag.
- Backend: Return 404 for booking endpoints when flag is off.

---

## 8. Success Metrics

**Adoption:**
- **M-1**: 50+ Sites created within first month of launch.
- **M-2**: 200+ Layouts designed (avg 4 per Site).
- **M-3**: 500+ share link accesses (vendors/participants viewing layouts).

**Engagement:**
- **M-4**: Avg 3 versions per Layout (indicates iterative design).
- **M-5**: 30% of users apply templates (validates template value).
- **M-6**: 50+ PNG exports in first month (sharing use case).

**Performance:**
- **M-7**: Zone area calculations complete <200ms (PostGIS query).
- **M-8**: Share links load in <2s (public endpoint optimization).

**Retention:**
- **M-9**: 60% of creators return to edit/create new Layout within 7 days.

---

## 9. Open Questions

**Q-1**: Should Sites support multiple boundary types (POLYGON vs MULTIPOLYGON for disconnected areas)?  
**Q-2**: What is the max number of Zones per Layout before performance degrades (client rendering)?  
**Q-3**: Should share links have optional expiration dates (e.g., event ends, link auto-expires)?  
**Q-4**: For template application, should system auto-scale Zones to fit Site boundary or prompt user to adjust?  
**Q-5**: Should we track analytics on share link views (requires lightweight logging without PII)?  
**Q-6**: What happens to existing Venues/Pitches data if user chooses NOT to migrate—display warning in UI?  
**Q-7**: Should PDF export include satellite imagery basemap or just zone outlines (licensing/file size concerns)?  
**Q-8**: For Zone categories, should we allow custom user-defined categories or enforce enum?  
**Q-9**: Should Asset icons be customizable (user uploads) or limited to preset FontAwesome icons?  
**Q-10**: What is the target max file size for PNG exports (affects resolution limits)?

---

## Next Steps

1. **Review & Approval**: Stakeholders review PRD, answer open questions.
2. **Generate Task List**: Break down PRD into high-level parent tasks (DB, Backend, Frontend, Docs).
3. **Subtask Planning**: For each parent task, create subtasks with acceptance criteria.
4. **Implementation**: Execute subtasks one at a time with test-commit-approve cadence.

---

**End of PRD-0001**
