# PRD: Plottr Field Planner v1

**Document Version:** 1.0  
**Date:** October 18, 2025  
**Status:** Ready for Development  
**Target Launch:** November 15, 2025 (3 weeks)  
**Team:** 3 developers (1 FE, 1 BE, 1 DevOps/AI)

---

## 📖 Introduction & Overview

### Problem
Coaches, event organisers, schools, councils, and club managers currently plan field layouts, drill setups, and event staging using:
- Hand-drawn sketches on paper
- Screenshots with annotations
- Ad-hoc email descriptions
- No shared, editable, exportable format

This results in confusion, miscommunication, repeated work, and lack of professional presentation.

### Solution
**Plottr Field Planner v1** is a map-based layout editor that enables users to:
1. Find and select any open field, sports ground, or event site
2. Place visual elements (cones, goals, tents, zones, buffers) on an interactive map
3. Measure distances and areas
4. Share as public read-only links or export as professional PDF/PNG
5. Work offline and sync changes automatically
6. Save as reusable templates

### Goal
Ship a **standalone, premium-grade spatial planning tool** that replaces ad-hoc sketches with professional, shareable, exportable layouts — accessible on any device, usable offline, and priced at €9/month for unlimited layouts and exports.

### Target Users
- **Primary:** Coaches, club managers, event organisers (small teams, underserved market)
- **Secondary:** Schools, councils, facility managers
- **Tertiary:** Sports clubs needing shared planning tools

### Why Now
- Existing MVP proves geospatial + offline + export capability
- High trust in local networks (viral growth potential)
- Underserved market with clear WTP (willingness to pay)
- Strategic foundation for CoachConnect (planning → management → communication)

---

## 🎯 Goals

### Business Goals
1. **Acquire 500 paid users (€9/mo) by Q4 2025** — validate market fit and SaaS metrics
2. **Achieve 40% monthly retention** — product stickiness with shared maps
3. **Generate viral coefficient >1.0** — each shared map link brings new user signups
4. **Establish admin governance framework** — template moderation, user management
5. **Prove AI-assisted features ROI** — measure polygon suggestion and layout generation adoption

### Product Goals
1. **Core planner fully functional** — users can plan, export, share in <5 minutes
2. **Offline-first UX** — all critical features work without network
3. **Mobile-responsive canvas** — works on tablet; desktop-optimized
4. **< 2s page load time** — snappy performance, cached layouts
5. **99.9% uptime** — reliable SaaS expectations

### Engineering Goals
1. **Clean API architecture** — shared endpoints for future CoachConnect integration
2. **AI modular** — polygon suggestion and layout generation feature-flagged, can be toggled
3. **Rate limiting + compliance** — GDPR consent, AI quotas, DDoS protection
4. **Monitoring + observability** — Sentry errors, BetterStack uptime, structured logs

---

## 👥 User Stories

### Freemium User (Unauth or Free Tier)
```
As a coach planning a training session,
I want to quickly sketch a drill layout on a map,
so that I can share it with my team without sending screenshots or sketching by hand.

Acceptance:
- Can search for a field by name/address
- Can draw cones, goals, and zones on the map
- Can measure distances between elements
- Can download as PNG
- Can generate a public share link
- Limited to 3 saved layouts before upgrade prompt
```

### Paid Individual (€9/month)
```
As a club manager,
I want unlimited saved layouts, export-ready PDFs, and access to layout templates,
so that I can maintain a library of setups and look professional for events.

Acceptance:
- Can save unlimited layouts
- Can export 4k PNG and A3/A4 PDF at 300 DPI
- Can browse 5-10 built-in templates and customize
- Can share read-only maps with edit links for others
- PDF includes legend, scale, and title block
```

### Club Tier Admin (€29/month shared workspace)
```
As a club administrator,
I want my coaches to share layouts and build a library within our club workspace,
so that we have consistent setups across all our teams.

Acceptance:
- Multiple users can edit/view shared layouts (Phase 2)
- Admin can set permissions per user (view/edit)
- Can manage club templates
- Shared history and version recovery
- (Deferred to Phase 2 if schedule tight)
```

### Event Organiser
```
As an event coordinator,
I want to plan a multi-sport event with stalls, stages, and safety zones on a public field,
so that I can finalize the layout with stakeholders and export it for permits.

Acceptance:
- Can draw custom zones (stall areas, stage, parking, entry points)
- Can measure safety buffers (2m around equipment)
- Can add labels and notes
- Can export PDF for council submission
- Can share public link to embed in event website
```

### Admin / Moderator
```
As a Plottr admin,
I want to review submitted community templates and user reports,
so that I can maintain quality and enforce community guidelines.

Acceptance:
- Dashboard to see pending template submissions
- Can approve/reject templates with notes
- Can view user statistics (DAU, paid signups, refunds)
- Can suspend/reactivate users or templates
- Can view audit logs of template approvals
```

---

## 📋 Functional Requirements

### FR.1 Authentication & Authorization
**FR.1.1** System must authenticate users via **Clerk** with email + password, Google, and Apple Sign-In.
- Flow: Sign up → email verify → dashboard
- Clerk handles password reset, 2FA, session management
- Store user tier (free, paid_individual, club_admin) in JWT custom claims

**FR.1.2** System must enforce user roles:
- **Unauthenticated:** Browse public maps, read-only
- **Free:** Create max 3 layouts, no export (PNG/PDF only via web UI), basic features
- **Paid Individual:** Unlimited layouts, full exports, templates, advanced features
- **Club Admin:** Team workspace, multi-user edit, same as Paid + collaboration features
- **Admin:** All user/template/billing management, impersonation, feature flags

**FR.1.3** Paid tiers enforced at API level:
- Free user attempts 4th layout → HTTP 402 "Payment Required" with upgrade modal
- Paid user export → instant download
- Club workspace creation requires admin approval

**FR.1.4** JWT tokens include:
```json
{
  "sub": "user_123",
  "email": "coach@club.com",
  "tier": "paid_individual",
  "workspace_id": "workspace_456",
  "permissions": ["read:layout", "write:layout", "read:template", "export:pdf"]
}
```

---

### FR.2 Location Search & Field Selection

**FR.2.1** System must provide location search by:
- **Address/name** (e.g., "Manchester Sports Ground", "River Dee field", postcode)
- **Geocoding:** MapTiler Geocoding API
- **Fallback:** OpenStreetMap Nominatim if MapTiler fails
- Search autocomplete with 5 results, map preview on hover

**FR.2.2** System must support three entry modes:
1. **Search & Select:** User searches address, system returns geocoded results, user clicks to confirm boundary
2. **Draw Bounding Box:** User opens map, draws rectangle to define area (min 100m x 100m, max 10km x 10km)
3. **Import:** User uploads GeoJSON or KML file, system validates and imports polygon

**FR.2.3** System must validate imported/drawn boundaries:
- Polygon closure (first point = last point)
- Winding order (counterclockwise = valid, via PostGIS ST_IsValid)
- No self-intersections
- Bounds within Earth coordinates
- If invalid, show error "Please check your boundary — it has overlaps or gaps"

**FR.2.4** System must auto-extract boundary suggestion:
- On first selection, if point is within known building/park (from OSM data), suggest trimmed boundary
- User can accept or manually adjust with polygon editor

**FR.2.5** Search results should include:
- Venue name, address, distance from user
- Thumbnail map preview
- Optional: past Plottr usage count ("Used 3 times")

---

### FR.3 Canvas & Layout Editor

**FR.3.1** Interactive map canvas must support:
- **Zoom:** 1-22, smooth scroll/pinch
- **Pan:** Click-drag or arrow keys
- **Draw tools:** Icons, labels, lines, polygons, zones, circles
- **Grid snap:** Optional 1m/5m/10m grid overlay
- **Keyboard shortcuts:** Undo (Ctrl+Z), Redo (Ctrl+Y), Delete (Del), Duplicate (Ctrl+D)

**FR.3.2** Drawing tools:
- **Icons:** Cones, goals, tents, toilets, stalls, stages, markers, hazards (20+ icons)
  - User can place, drag, rotate, resize (proportional scaling)
  - Right-click → edit label, change icon, delete
- **Labels:** Text boxes with font color, size, opacity
- **Lines:** Freehand or straight line segments with width/color
- **Polygons:** Click to add points, close loop, fill color + stroke
- **Zones:** Named rectangular/circular areas with labels (e.g., "Goal Area", "Spectator Zone")
- **Buffers:** Auto-generate 1m/2m/5m/10m safety zones around objects

**FR.3.3** Layers panel must support:
- List all layers (e.g., "Drill Setup", "Safety Zones", "Parking")
- Rename, show/hide (eye icon), lock (lock icon), duplicate, delete, reorder (drag)
- Layer groups (collapsible folders)
- Color-code layers for quick visual reference
- Can import preset layer structures from templates

**FR.3.4** Undo/Redo & Autosave:
- **Undo/Redo:** Last 50 actions in memory (configurable)
- **Autosave Strategy:**
  - Every 5s → save to LocalStorage (client-side, no network call)
  - On blur/exit → sync to backend API (POST /api/layouts/:id/autosave)
  - On connection loss → queue syncs, retry on reconnect
  - User sees "Saving..." indicator; auto-hides on success
- **Version History:** Each autosave creates a recoverable version; user can restore from last 7 days
- **Conflict Resolution:** Last-write-wins (server timestamp authority)

**FR.3.5** Measurement tools:
- **Distance:** Click two points, shows line with distance in meters/feet
- **Area:** Click to add polygon points, closes loop, shows area in m² or acres
- **Perimeter:** For drawn polygons, show total perimeter
- All measurements include unit toggle (metric ↔ imperial)

**FR.3.6** Safety zones / buffers:
- Preset buttons: 1m / 2m / 5m / 10m zones
- User selects object (cone, goal) → click buffer preset → auto-generates concentric polygon
- Can adjust buffer after creation (edit stroke, fill transparency)
- Buffers show dashed outline for clarity

**FR.3.7** Canvas state persistence:
- All edits saved to LocalStorage in real-time
- On page reload, canvas restores exact state (with modal confirming recovery)
- If new version deployed → service worker prompts user to refresh and recover work

---

### FR.4 Templates & Presets

**FR.4.1** System must ship with 5–10 built-in templates:
- **Soccer:** 5-a-side drill grid, possession square, half-field setup
- **Rugby:** Try-scoring zone, scrum setup, defensive alignment
- **Tennis:** Court layout with spectator zones
- **Event:** Market stalls grid, stage + VIP zone, emergency exit markers
- **School:** Multi-sport layout, PE class zones, spectator areas
- **General:** Blank field with safety zones, parking, entry/exit

**FR.4.2** Template features:
- Each template includes: boundary, default layers, sample items, description
- User can "Use Template" → creates new layout from it (editable copy)
- Can "Save as Template" from any layout (prompts for name, description, category)
- Templates have version history (can revert)

**FR.4.3** Community templates:
- Users can mark layout as "Public Template" (checkbox in save dialog)
- Public templates appear in "Browse Community" gallery
- Gallery shows: template thumbnail, author, usage count, rating (★★★★☆), last updated
- Admin can feature/unfeature templates (manual curation)
- Admin can flag templates as low-quality or remove (moderation)

**FR.4.4** Template submission & approval:
- Free tier cannot submit (paid only)
- Paid users submit template → enters "Pending Review" queue
- Admin dashboard shows queue with preview
- Admin can approve (goes live immediately) or reject (with reason note)
- Rejection sends email to creator with feedback

---

### FR.5 Sharing & Permissions

**FR.5.1** Share links:
- **Public share link:** `/s/:slug` — read-only, no login required
  - Shows map, layers, items, title, last-updated timestamp
  - Download buttons: PNG (4k), PDF (A3/A4, 300 DPI)
  - Share count badge (e.g., "Shared 47 times")
  - Shareable via copy-link, QR code, social media buttons (Twitter, Facebook, email)
- **Private share link:** URL with token (e.g., `/s/:slug?token=xyz`) — view or edit permission
  - Token expires after 7 days or revoked manually
  - Can be shared with specific people (no search/discovery)

**FR.5.2** Link management:
- Layout settings → "Sharing" tab shows all active links
- Can toggle public/private, revoke links, set expiry
- Link analytics: click count, unique visitors, last visited
- Can set password protection for sensitive layouts

**FR.5.3** Permission model:
- Creator always has full edit access
- Can grant others: **view-only** (read-only map) or **edit** (full canvas access)
- Edit access allows user to make changes but not delete layout or change permissions
- Permissions inherited by layout versions (all versions share permissions)

**FR.5.4** Collaborative editing (Phase 2, feature-flagged):
- Multiple users can edit same layout simultaneously
- Cursor presence (see other users' names + color-coded cursors)
- Real-time sync (WebSocket or polling) — changes propagate <1s
- Conflict resolution: visual highlight of conflicting edits, last-write-wins
- Activity log in panel: "John moved cone X" 5m ago

---

### FR.6 Export & Downloads

**FR.6.1** PNG export:
- **Quality:** 4000 x 3000px (11.5" x 8.7" @ 300 DPI)
- **Options:** Include grid? Include legend? Include scale bar?
- **Output:** Downloaded immediately, named `layout-name-YYYY-MM-DD.png`
- **Offline:** Works without network (renders locally, saves from LocalStorage)

**FR.6.2** PDF export:
- **Format:** A4 or A3, 300 DPI, portrait or landscape
- **Content:**
  - Map image (centered, scaled to page)
  - Title block (layout name, date, creator name)
  - Legend (layer colors, item icons, descriptions)
  - Scale bar (with metric/imperial)
  - Measurement annotations (if user adds them)
  - Footer: "Created with Plottr" + timestamp
- **Font:** Consistent sans-serif (Helvetica/Arial fallback)
- **Output:** Download or email (if paid user)

**FR.6.3** Google Maps link:
- User clicks "Open in Google Maps"
- If layout is simple (few items):
  - Generate Google Maps URL with boundary polygon + all markers as pins
  - E.g., `https://maps.google.com?q=polygon...&markers=...`
- If layout is complex:
  - Generate boundary-only link (fewer query param limits)
  - Show note: "Markers omitted due to complexity; use PNG/PDF export for full view"

**FR.6.4** Export formats (future):
- **GeoJSON:** Full layout as GeoJSON FeatureCollection (items, layers, styles)
- **SVG:** Vector export for design tools
- **ICS:** Calendar event file (if layout has scheduled event date)

**FR.6.5** Offline export:
- User can export PNG/PDF without server connectivity (rendered client-side)
- PDF generation uses jsPDF + html2canvas (local rendering)
- Files saved to browser default download folder
- Notification: "Downloaded offline — will sync when online"

---

### FR.7 Offline Support & Sync

**FR.7.1** Offline functionality:
- Service Worker caches all layout data + map tiles
- User can open previously-viewed layout without network
- Can edit layout offline (all changes queued locally)
- All drawing tools work offline (no external dependencies)

**FR.7.2** Offline indicators:
- Status bar: "🔴 Offline" in red / "🟢 Online" in green
- Autosave badge: "Saved locally" or "Synced to cloud"
- Warning modal if user tries to share/export without connectivity (download to file instead)

**FR.7.3** Sync strategy:
- Edits saved to LocalStorage immediately
- When device comes online, auto-sync to backend (merge-friendly strategy)
- For conflicts: show "Unsaved changes from offline edit" prompt
- User can: Keep local (override server), Keep server (discard local), or Merge manually

**FR.7.4** Cache invalidation:
- Layouts older than 30 days auto-purge from cache (user can adjust)
- Cache size warning if >50MB (suggest cleanup)
- User can manually clear cache (Settings → Storage)

**FR.7.5** IndexedDB schema (offline storage):
```javascript
layouts: {
  keyPath: 'id',
  indexes: ['workspace_id', 'updated_at', 'public']
}
items: {
  keyPath: 'id',
  indexes: ['layout_id', 'layer_id']
}
layers: {
  keyPath: 'id',
  indexes: ['layout_id']
}
sync_queue: {
  keyPath: 'id',
  indexes: ['status', 'created_at']  // status: pending, synced, failed
}
```

---

### FR.8 AI-Assisted Features (Modular, Feature-Flagged)

**FR.8.1** Polygon suggestion (MVP AI feature):
- User uploads aerial/satellite image or clicks "Auto-detect boundary"
- System uses SAM (Segment Anything Model) to detect field outline
- Shows suggested polygon on canvas with "Accept" / "Reject" buttons
- If accepted, user can edit/refine polygon manually
- If rejected, falls back to manual drawing

**FR.8.2** Polygon source options:
- **Default:** MapTiler satellite tiles (free tier, ~60cm resolution)
- **Alternative:** Google Satellite Images (if user provides API key, via settings)
- **Upload:** User can upload local georeferenced GeoTIFF or JPG
- System tries source in priority order, defaults to MapTiler

**FR.8.3** Layout generation (form-based):
- User fills form: Sport type (Soccer/Rugby/Tennis/Event) + age group (U8/U10/.../Adult) + field size (small/medium/large)
- System calls OpenAI API with prompt:
  ```
  Generate a training layout for [sport] [age] on a [size] field.
  Return JSON with items (type, x, y, label) and zones (name, bounds, label).
  ```
- Shows suggestion on canvas with layer structure
- User can "Use This" (creates layout) or "Generate Again" (new suggestion)

**FR.8.4** AI rate limits:
- Free user: 2 suggestions/month
- Paid user: 20 suggestions/month
- Club admin: 100 suggestions/month
- Exceeding limit → HTTP 429 with "Upgrade to use more suggestions"

**FR.8.5** AI cost management:
- Polygon suggestion cost tracked (external API calls)
- If monthly costs exceed budget, feature auto-disabled until next month
- Admin dashboard shows AI cost burn rate

---

### FR.9 Admin Dashboard

**FR.9.1** Admin access:
- Only users with `role: admin` can access `/admin`
- Clerk defines admin role via custom claims
- Login to admin dashboard requires Clerk auth + role check
- Audit log: All admin actions logged (user ID, action, timestamp, IP)

**FR.9.2** User management:
- List all users: email, name, tier (free/paid/club), signup date, last login
- Search by email
- Actions: Suspend, Reactivate, Impersonate, View usage stats
- Impersonate: Click user → redirect to `/app` as if logged in as them (audit logged)
- Usage stats: Layouts created, exports, templates submitted, share count

**FR.9.3** Tier/subscription management:
- View active subscriptions (Stripe integration future)
- Manual override: Promote free → paid (for testing, trials)
- Refund: Mark layout/payment for manual refund (flag for finance)

**FR.9.4** Template moderation:
- Queue tab: Show pending community templates (awaiting approval)
- Each template preview: thumbnail map, title, author, submission date
- Actions: Approve, Reject (with reason), Feature, Unfavorite
- Bulk actions: Select multiple, approve all, reject all
- Approval sends email notification to author

**FR.9.5** Analytics & reporting:
- **Overview metrics:**
  - Total users (free/paid)
  - DAU (daily active users), MAU (monthly)
  - Layouts created (total, daily, weekly trend)
  - Exports (PNG/PDF count, daily trend)
  - Share count (public link clicks, daily)
- **Conversion:** Free → Paid conversion rate, churn rate
- **Templates:** Most popular, most used by others, pending count
- **AI usage:** Polygon suggestions/month, layout generations, cost trend
- **Engagement:** Average layouts per user, repeat user %, feature usage heatmap
- **Charts:** Line graphs (DAU, revenue), pie (tier breakdown), bar (top templates)

**FR.9.6** Feature flags:
- Admin panel to toggle features live (without deployment):
  - `enable_ai_polygon_suggestion` (bool)
  - `enable_ai_layout_generation` (bool)
  - `enable_community_templates` (bool)
  - `enable_offline_export` (bool)
  - `maintenance_mode` (bool) — returns 503 to public users with message
- Changes reflected immediately (feature flag service checks every 5s or via polling)

**FR.9.7** System health & monitoring:
- Dashboard shows:
  - API uptime (% green, % red if errors >1%)
  - Database connection status
  - Service Worker deployment status
  - Sentry error rate (last 24h)
  - Last backup timestamp
  - Stripe API connectivity status
- Alert threshold: Auto-email admin if error rate >5% or uptime <99%

---

### FR.10 Data Model & Database Schema

**FR.10.1** Core entities:
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  clerk_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  tier ENUM ('free', 'paid_individual', 'club_admin', 'admin') DEFAULT 'free',
  workspace_id UUID FOREIGN KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP -- soft delete
);

workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  tier ENUM ('free', 'paid_individual', 'club_admin'),
  owner_id UUID FOREIGN KEY users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  max_layouts INT DEFAULT 3 -- enforced by app
);

layouts (
  id UUID PRIMARY KEY,
  workspace_id UUID FOREIGN KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  boundary GEOMETRY(Polygon, 4326) NOT NULL, -- PostGIS polygon
  address VARCHAR,
  zoom_level INT DEFAULT 15,
  center_lat DECIMAL(10,8),
  center_lng DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,
  thumbnail_url VARCHAR, -- PNG preview
  json_data JSONB NOT NULL -- full canvas state
);

items (
  id UUID PRIMARY KEY,
  layout_id UUID FOREIGN KEY,
  layer_id UUID FOREIGN KEY,
  item_type ENUM ('icon', 'label', 'line', 'polygon', 'zone', 'buffer', 'circle'),
  icon_type VARCHAR, -- 'cone', 'goal', 'tent', etc.
  position_lat DECIMAL(10,8) NOT NULL,
  position_lng DECIMAL(11,8) NOT NULL,
  rotation FLOAT DEFAULT 0,
  size_m FLOAT DEFAULT 1, -- in meters
  label VARCHAR,
  color VARCHAR DEFAULT '#000000',
  stroke_width FLOAT DEFAULT 2,
  fill_opacity FLOAT DEFAULT 0.3,
  custom_properties JSONB, -- future: capacity, notes, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

layers (
  id UUID PRIMARY KEY,
  layout_id UUID FOREIGN KEY,
  name VARCHAR NOT NULL,
  display_order INT,
  is_visible BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  color_hex VARCHAR DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW()
);

templates (
  id UUID PRIMARY KEY,
  workspace_id UUID FOREIGN KEY, -- null if built-in
  title VARCHAR NOT NULL,
  description TEXT,
  category ENUM ('soccer', 'rugby', 'tennis', 'event', 'school', 'general'),
  is_community BOOLEAN DEFAULT FALSE,
  status ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'archived') DEFAULT 'draft',
  json_data JSONB NOT NULL, -- layout structure
  thumbnail_url VARCHAR,
  usage_count INT DEFAULT 0,
  rating FLOAT DEFAULT 0, -- avg user rating
  created_by UUID FOREIGN KEY users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  approval_notes TEXT
);

share_links (
  id UUID PRIMARY KEY,
  layout_id UUID FOREIGN KEY,
  slug VARCHAR UNIQUE NOT NULL,
  token VARCHAR UNIQUE, -- for private links
  permission ENUM ('view', 'edit') DEFAULT 'view',
  is_public BOOLEAN DEFAULT TRUE,
  is_password_protected BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR, -- bcrypt
  expires_at TIMESTAMP,
  created_by UUID FOREIGN KEY users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  click_count INT DEFAULT 0,
  last_clicked_at TIMESTAMP
);

api_events (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  event_type VARCHAR, -- 'export_png', 'export_pdf', 'ai_suggestion', etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

admin_actions (
  id UUID PRIMARY KEY,
  admin_id UUID FOREIGN KEY users(id),
  action_type VARCHAR, -- 'suspend_user', 'approve_template', etc.
  target_id UUID, -- user_id or template_id
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**FR.10.2** Indexes for performance:
```sql
CREATE INDEX idx_layouts_workspace ON layouts(workspace_id);
CREATE INDEX idx_layouts_updated ON layouts(updated_at DESC);
CREATE INDEX idx_items_layout ON items(layout_id);
CREATE INDEX idx_share_links_slug ON share_links(slug);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_events_user ON api_events(user_id);
```

---

### FR.11 API Endpoints

**FR.11.1** Authentication endpoints:
```
POST /api/auth/signup              -- Clerk handles, backend confirms user record
POST /api/auth/logout              -- Clear session
GET  /api/auth/me                  -- Current user profile
GET  /api/auth/verify              -- Check JWT validity
```

**FR.11.2** Layout endpoints:
```
GET    /api/layouts                       -- List layouts for current workspace
POST   /api/layouts                       -- Create new layout
GET    /api/layouts/:id                   -- Get layout by ID
PUT    /api/layouts/:id                   -- Update layout (title, description, boundary)
DELETE /api/layouts/:id                   -- Soft delete layout
POST   /api/layouts/:id/autosave          -- Save canvas state (autosave sync)
GET    /api/layouts/:id/history           -- List version history
GET    /api/layouts/:id/history/:version_id -- Restore version
```

**FR.11.3** Export endpoints:
```
GET  /api/layouts/:id/export/png           -- Download PNG (async, webhook notify)
GET  /api/layouts/:id/export/pdf           -- Download PDF (async)
GET  /api/layouts/:id/export/geojson       -- Get GeoJSON data
GET  /api/layouts/:id/export/google-maps   -- Get Google Maps link
POST /api/layouts/:id/export/email         -- Email PDF (paid only)
```

**FR.11.4** Sharing endpoints:
```
POST   /api/layouts/:id/share             -- Generate share link
GET    /api/layouts/:id/share             -- List share links
PUT    /api/layouts/:id/share/:slug       -- Update link (permission, expiry, password)
DELETE /api/layouts/:id/share/:slug       -- Revoke link
GET    /api/layouts/:id/share/:slug/stats -- Link analytics
```

**FR.11.5** Template endpoints:
```
GET    /api/templates                 -- List templates (built-in + community approved)
GET    /api/templates/:id             -- Get template by ID
POST   /api/templates                 -- Submit community template
GET    /api/templates/admin/pending   -- (Admin) List pending approvals
PUT    /api/templates/:id/admin       -- (Admin) Approve/reject/feature template
DELETE /api/templates/:id             -- (Admin) Remove template
```

**FR.11.6** Item/Layer endpoints:
```
POST   /api/layouts/:id/items        -- Add item to layout
PUT    /api/layouts/:id/items/:item_id -- Update item (position, rotation, label, etc.)
DELETE /api/layouts/:id/items/:item_id -- Delete item

POST   /api/layouts/:id/layers       -- Create layer
PUT    /api/layouts/:id/layers/:layer_id -- Update layer (name, visibility, lock)
DELETE /api/layouts/:id/layers/:layer_id -- Delete layer
```

**FR.11.7** AI endpoints:
```
POST /api/ai/polygon-suggestion       -- Send image, get polygon suggestion (rate-limited)
POST /api/ai/layout-generation        -- Send form params, get layout suggestion
GET  /api/ai/usage                    -- Get user's AI quota usage
```

**FR.11.8** Admin endpoints:
```
GET    /api/admin/users                  -- List all users
PUT    /api/admin/users/:id              -- Suspend/reactivate user
POST   /api/admin/users/:id/impersonate  -- Generate impersonation token
GET    /api/admin/analytics              -- Aggregated analytics
GET    /api/admin/feature-flags          -- List feature flags
PUT    /api/admin/feature-flags/:flag    -- Toggle feature flag
```

**FR.11.9** Public endpoints (no auth):
```
GET  /s/:slug              -- View public share link
GET  /api/public/templates -- List community templates
```

**FR.11.10** Webhook endpoints (internal):
```
POST /webhooks/stripe          -- Handle payment events
POST /webhooks/export-complete -- Notify when async export done
POST /webhooks/clerk           -- Sync user tier from Clerk
```

---

### FR.12 Security & Rate Limiting

**FR.12.1** Authentication & tokens:
- All protected endpoints require Bearer token from Clerk JWT
- Token refresh: Clerk handles auto-refresh on client (transparent to API)
- Token validation: Verify signature + expiry on every request

**FR.12.2** Rate limiting:
```
Authenticated users:
- General API: 100 req/min per user ID
- Export endpoints: 10 req/min (exports are heavy)
- AI endpoints: 5 req/min (AI queries are expensive)

Anonymous users:
- Public share view: 50 req/min per IP
- Signup: 5 req/min per IP

Stripe webhooks:
- Signature verification required (HMAC-SHA256)
```

**FR.12.3** Input validation:
- All POST/PUT payloads validated via Zod schemas
- GeoJSON boundaries: PostGIS ST_IsValid + area limits
- File uploads (if any): virus scan via VirusTotal API (free tier)
- Labels/text: Max 500 chars, sanitized against XSS (DOMPurify)

**FR.12.4** CORS & headers:
```
- CORS: Allow from configured frontend domain + localhost (dev)
- CSP: Restrict script sources to self + trusted CDNs (MapTiler, etc.)
- Security headers: Helmet.js configured (HSTS, X-Frame-Options, X-Content-Type-Options)
```

**FR.12.5** Data encryption:
- All data in transit: TLS 1.3 (Vercel/Railway enforce)
- At rest: PostgreSQL encrypted at volume level (managed service)
- API keys (Stripe, MapTiler): Stored in Vercel environment variables, never in code

---

### FR.13 Monitoring, Observability & Compliance

**FR.13.1** Error tracking:
- Sentry integration on both frontend and backend
- Errors auto-reported with context: user ID, layout ID, action, timestamp
- Dashboard alerts: Spike in error rate (>5%) emails admin

**FR.13.2** Uptime monitoring:
- BetterStack monitors `/healthz` endpoint every 1 minute
- Uptime target: 99.9%
- Incidents auto-logged + email admin if down >5 minutes

**FR.13.3** Structured logging:
```javascript
// Example log entry
{
  timestamp: "2025-10-18T14:30:00Z",
  level: "info",
  service: "layout-service",
  user_id: "user_123",
  layout_id: "layout_456",
  action: "export_pdf",
  duration_ms: 1200,
  size_mb: 2.3,
  trace_id: "abc-123-def"
}
```

**FR.13.4** Backups & disaster recovery:
- Nightly full backup of PostgreSQL to S3 (7-day retention)
- Point-in-time recovery capability (24-hour window)
- RTO (Recovery Time Objective): 2 hours
- RPO (Recovery Point Objective): 1 hour

**FR.13.5** GDPR compliance:
- Privacy Policy + Terms of Service hosted on website
- Termly cookie consent banner (auto-generated)
- Data export: User can download all personal data as JSON (GDPR right to portability)
- Account deletion: User can delete account → cascading soft-delete of layouts
- DPA with external vendors (Stripe, Clerk, MapTiler, Sentry) documented

**FR.13.6** Status page:
- Public `/status` page showing current uptime + incident history
- Transparency for users about platform health

---

### FR.14 Performance & Optimization

**FR.14.1** Frontend performance:
- Page load: Target <2s on 4G (Lighthouse ~85+)
- Canvas rendering: 60 FPS on pan/zoom
- Offline: Instant load from cache (no network dependency)
- Code splitting: Route-based (app shell loads first)
- Image optimization: WebP for PNGs, lazy loading

**FR.14.2** API performance:
- Endpoint response time target: <200ms for reads, <500ms for writes
- Database queries: Indexed, analyzed with EXPLAIN ANALYZE
- Caching: Redis for immutable data (templates, user roles)
- Pagination: Cursor-based (efficient for large datasets)

**FR.14.3** Map performance:
- Tile caching: MapTiler tiles cached by browser (browser cache headers)
- Layer simplification: Reduce polygon points for zoomed-out views
- Decluster markers: Show summary circles at low zoom, expand at high zoom

---

### FR.15 Accessibility & Internationalization (I18N)

**FR.15.1** Accessibility (a11y):
- WCAG 2.1 Level AA target
- Keyboard navigation: Canvas fully navigable (arrow keys, Tab, Enter)
- Screen reader: Semantic HTML, ARIA labels on interactive elements
- Color contrast: Ensure 4.5:1 minimum
- Dark mode: System preference detected, manual override in settings

**FR.15.2** Internationalization (future):
- v1 ships in English only
- Strings centralized in i18n config (ready for future locales)
- All dates/times in user's timezone (auto-detected)
- Units toggle: Metric ↔ Imperial

---

## 🚫 Non-Goals (Out of Scope for v1)

1. **Real-time Collaboration:** Multi-user simultaneous editing deferred to Phase 2 (feature-flagged)
2. **Mobile Native Apps:** PWA sufficient; iOS/Android apps in Phase 3
3. **Advanced Billing:** Stripe integration Phase 2; v1 uses basic tier flagging in database
4. **Complex Permissions:** Role-based access control deferred; v1 has view/edit only
5. **Search Full-Text:** Postgres LIKE search sufficient; ElasticSearch Phase 2
6. **Video Tutorials:** In-app help (text + tooltips) sufficient; YouTube tutorials Phase 2
7. **White-label / Multi-tenant Custom Domains:** Shared domain only (plottr.app); white-label Phase 3
8. **API Rate Limiting via Stripe:** Free tier rate-limited by IP; Stripe Connect Phase 2
9. **Newsletter / Marketing Automation:** Manual email campaigns; automation Phase 2
10. **Advanced Analytics (Mixpanel/Amplitude):** Sentry errors + basic events sufficient; full analytics Phase 2

---

## 🎨 Design Considerations

### UI/UX Principles
1. **Simplicity first:** Visual clarity > feature clutter (one action per screen section)
2. **Familiar patterns:** Toolbars, panels, shortcuts borrowed from Figma, Excalidraw (users recognize)
3. **Responsive design:** Tablet-first mobile (desktop optimized, mobile simplified)
4. **Dark mode:** Light (default) + Dark (toggle in settings) — shadcn/ui components support both

### Color Palette
```
Primary: Blue (#3B82F6)
Secondary: Green (#10B981)
Accent: Orange (#F59E0B)
Danger: Red (#EF4444)
Neutral: Gray (#6B7280)
Background: White / Dark Gray (#1F2937)
```

### Typography
```
Display: 32px, bold (page titles)
Heading: 24px, semibold (section titles)
Subheading: 18px, semibold (subsections)
Body: 16px, regular (content)
Small: 14px, regular (captions)
```

### Component Library
- **UI Components:** shadcn/ui (buttons, inputs, modals, dropdowns)
- **Icons:** Heroicons (free, 24px baseline)
- **Canvas:** MapLibre GL for map, Turf.js for geometry
- **Charts:** Recharts for admin analytics

### Responsive Breakpoints
```
Mobile: 320px (deprecated in v1, prepared for v1.1)
Tablet: 768px (min supported in v1)
Desktop: 1024px (optimized)
Large: 1280px+
```

### Key Screens
1. **Dashboard:** List layouts, recent activity, upgrade prompt
2. **Editor:** Canvas (70%), layers panel (20%), toolbar (10%)
3. **Export modal:** Format/size options, preview, download button
4. **Share modal:** Link generated, copy button, QR code, analytics
5. **Settings:** Theme, storage, export preferences
6. **Admin:** Users table, templates queue, analytics charts

---

## 🏗️ Technical Architecture

### Tech Stack (Aligned with MVP)
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript | SEO, SSR, type safety |
| **UI** | Tailwind CSS 3.3, shadcn/ui | Consistency, rapid prototyping |
| **Maps** | MapLibre GL 3.6 | Open-source, no licensing costs |
| **Geometry** | Turf.js 6.x, PostGIS | Spatial logic, validated polygons |
| **Auth** | Clerk | SSO, no custom password management |
| **Backend** | Express.js, TypeScript | Lightweight, proven, familiar |
| **Database** | PostgreSQL 16, PostGIS | Geospatial, JSONB, mature |
| **Cache** | Redis (Upstash) | Session cache, feature flags |
| **File Storage** | S3 (AWS) or Cloudflare R2 | PDFs, PNGs, backups |
| **AI** | OpenAI API (Claude, Anthropic fallback) | LLM-based layout generation |
| **Monitoring** | Sentry, BetterStack, CloudWatch | Error tracking, uptime, logs |
| **Hosting** | Vercel (FE), Railway (BE), PostgreSQL managed | Scalable, low-ops, good DX |

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                      │
│  Next.js 14 + React 18 + TypeScript + Tailwind CSS     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Pages: Dashboard, Editor, Share, Admin         │   │
│  │  Components: Canvas (MapLibre), Layers, Export  │   │
│  │  State: Zustand store, IndexedDB cache          │   │
│  │  Offline: Service Worker + PWA                  │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTPS REST + WebSocket (future)
┌────────────────────▼──────────────────────────────────────┐
│              Backend API (Railway)                         │
│            Express.js + TypeScript                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Middleware: Clerk auth, CORS, rate limiting      │  │
│  │  Controllers: layouts, items, sharing, exports    │  │
│  │  Services: validation, geometry, AI integration   │  │
│  │  Database: PostgreSQL 16 + PostGIS               │  │
│  │  Cache: Redis (Upstash)                          │  │
│  │  Queue: Bull/Redis for async exports             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    PostgreSQL          OpenAI API          S3 Storage
    (Managed)           (LLM Layout Gen)    (PDFs/PNGs)
```

### Deployment Pipeline (GitHub Actions)
```
Push to main
  → Run tests (Jest unit + integration)
  → TypeScript strict check
  → Linting (ESLint)
  → Build frontend (Next.js)
  → Build backend Docker image
  → Deploy frontend to Vercel
  → Deploy backend to Railway
  → Run smoke tests
  → Notify Slack
```

---

## 📊 Success Metrics

### Business KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Paid Users** | 500 by Nov 30 | Clerk user count, paid tier in DB |
| **Monthly Retention** | 40%+ | Day 30 retention cohort analysis |
| **Viral Coefficient** | >1.0 | Share link → new signup rate |
| **Churn Rate** | <15%/month | Paid users who downgrade |
| **ARPU** | €15+/month avg | Total revenue / total paid users |
| **Upgrade Conversion** | 10%+ | Free users upgrading within 30 days |

### Product KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load Time** | <2s (4G) | Lighthouse, Real User Monitoring |
| **Offline Success Rate** | 98%+ | Layouts opened offline / total offline attempts |
| **Export Speed** | <5s for PNG, <10s for PDF | Time from click to download |
| **Share Link CTR** | 20%+ | Clicks on shared link / link created |
| **Template Usage** | 30%+ of layouts use templates | Template-based layouts / total layouts |
| **AI Feature Adoption** | 15%+ (if launched in v1) | Users using polygon suggestion / total users |

### Technical KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Availability** | 99.9% | BetterStack monitoring |
| **Error Rate** | <0.5% | Sentry error count / total requests |
| **Database Query Latency** | <100ms p95 | APM monitoring (CloudWatch) |
| **Cache Hit Ratio** | 85%+ | Redis cache hits / total cache requests |
| **Code Coverage** | 80%+ | Jest coverage report |

### Engagement KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| **DAU** | 1,000+ by Nov 30 | Daily active user count |
| **MAU** | 3,000+ by Nov 30 | Monthly active user count |
| **Layouts Created/User** | 4+ per month | Total layouts created / DAU |
| **Exports/Layout** | 1.5+ | Export events / layout created |
| **Share Links Generated** | 2+ per layout | Share links created / layout |

---

## 🔧 Implementation Approach

### Sprint Breakdown (3 x 10 working days)

**Sprint 1: Foundation (Days 1-10)**
- Auth: Clerk integration, user tier system
- Location search + boundary import
- Canvas basics: Icons, labels, undo/redo
- Autosave (local + server sync)
- Layers panel (show/hide, rename)

**Sprint 2: Canvas & Export (Days 11-20)**
- Advanced canvas: Lines, polygons, zones, buffers, circles
- Measurements: Distance, area, perimeter
- Export: PNG, PDF, Google Maps link
- Sharing: Public links, read-only view
- Offline support: Service Worker, IndexedDB

**Sprint 3: Templates, AI, Admin (Days 21-30)**
- Built-in templates (5-10)
- Community template submission + admin approval
- AI polygon suggestion (MVP)
- Admin dashboard: User management, analytics, feature flags
- Polish: UI refinement, performance tuning, testing
- Deployment to staging + production

---

## ❓ Open Questions

1. **AI Model Choice:** Use OpenAI GPT-4 for layout generation, or Claude 3? (Claude recommended for cost)
2. **Polygon Suggestion Model:** Self-host SAM locally or use external service (Roboflow)?
3. **Storage Limits:** Free tier local cache limit (50MB default)? Paid tier (unlimited local + cloud)?
4. **Community Template Approval:** Automatic (all public templates live immediately) or manual queue?
5. **Stripe Integration:** Include basic Stripe tier enforcement in v1 for future Phase 2 expansion?
6. **Database:** Start with PostgreSQL 16 or latest (17)? Managed RDS or Railway PostgreSQL?
7. **Performance Baseline:** Acceptable export time for 4K PNG on large layouts? (5-15s depends on complexity)
8. **Offline Sync Conflicts:** Last-write-wins or manual merge UI?
9. **Share Link Expiry:** Default 7 days, or no expiry unless user sets?
10. **AI Rate Limits:** Adjust suggested limits (2/month free, 20/month paid) based on OpenAI cost?

---

## 📝 Dependencies & Assumptions

### External Dependencies
- **Clerk API:** Authentication, user provisioning, custom claims for roles
- **MapTiler API:** Geocoding, satellite imagery (tile data)
- **OpenAI API:** Layout generation prompts (Claude or GPT-4)
- **AWS S3 / Cloudflare R2:** Export file storage
- **Stripe API:** (Phase 2) Payment processing

### Technical Assumptions
1. PostgreSQL with PostGIS extension available on Railway
2. Redis available (Upstash managed)
3. Vercel deployment supports Next.js 14 + Node 20+
4. Service Worker compatible with all target browsers (Chrome 60+, Firefox 44+, Safari 11+)
5. MapLibre GL performant on 3-year-old devices (tablet constraint)

### Team Assumptions
1. Team has prior Express.js + PostgreSQL experience
2. Next.js + React knowledge present (learning MapLibre together)
3. 3 developers working full-time on project
4. CI/CD pipeline already established (GitHub Actions)

---

## 📌 Sign-Off & Next Steps

**PRD Approval:** [User signature]  
**Target Launch:** November 15, 2025  
**Task List:** See accompanying `/tasks/0001-plottr-fieldplanner-tasklist.md`  

**Next Action:** Engineering team reviews PRD, clarifies open questions, begins Sprint 1 planning.

---

## 📚 Appendices

### A. Database Migration Example
```sql
-- Migration: 001_create_layout_tables.sql
-- Timestamp: 2025-10-18

CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  address VARCHAR(500),
  zoom_level INT DEFAULT 15,
  center_lat DECIMAL(10,8),
  center_lng DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,
  thumbnail_url VARCHAR(500),
  json_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT valid_boundary CHECK (ST_IsValid(boundary))
);

CREATE INDEX idx_layouts_workspace ON layouts(workspace_id);
CREATE INDEX idx_layouts_updated ON layouts(updated_at DESC);
CREATE INDEX idx_layouts_public ON layouts(is_public) WHERE is_public = TRUE;
```

### B. API Request/Response Example
```bash
# Request: Create new layout
curl -X POST http://localhost:3001/api/layouts \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "U12 Soccer Training",
    "description": "4-cone drill grid",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[
        [-2.2426, 53.4808],
        [-2.2426, 53.4810],
        [-2.2424, 53.4810],
        [-2.2424, 53.4808],
        [-2.2426, 53.4808]
      ]]
    },
    "address": "Manchester Sports Ground"
  }'

# Response: 201 Created
{
  "id": "layout-123",
  "workspace_id": "workspace-456",
  "title": "U12 Soccer Training",
  "created_at": "2025-10-18T14:30:00Z",
  "json_data": {
    "items": [],
    "layers": [
      { "id": "layer-1", "name": "Default", "visible": true }
    ]
  }
}
```

### C. Feature Flag Configuration Example
```javascript
// backend/src/config/featureFlags.ts
export const featureFlags = {
  enable_ai_polygon_suggestion: {
    description: "Enable SAM-based polygon auto-detection",
    default: false,
    rollout_percentage: 0 // Start at 0%, ramp to 100%
  },
  enable_ai_layout_generation: {
    description: "Enable form-based AI layout generation",
    default: false,
    rollout_percentage: 0
  },
  enable_community_templates: {
    description: "Enable public template sharing and discovery",
    default: true,
    rollout_percentage: 100
  },
  enable_offline_export: {
    description: "Allow PNG/PDF exports without network",
    default: true,
    rollout_percentage: 100
  },
  maintenance_mode: {
    description: "Return 503 to all non-admin users",
    default: false,
    rollout_percentage: 0
  }
};
```

---

**End of PRD Document**
