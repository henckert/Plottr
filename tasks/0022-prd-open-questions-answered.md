# PRD Open Questions - Decisions & Answers

**Document:** PRD-0001 Open Questions Resolution  
**Date:** October 20, 2025  
**Status:** Approved  
**Related:** [PRD-0001](../0001-prd-field-layout-designer.md)

---

## Overview

This document provides answers to the 10 open questions raised in PRD-0001. Decisions are based on technical feasibility, user needs, and MVP scope constraints. All decisions align with the TASK 1 database schema already implemented.

---

## Question Resolutions

### Q-1: Should Sites support multiple boundary types (POLYGON vs MULTIPOLYGON)?

**Answer:** **Start with POLYGON only; add MULTIPOLYGON in v2 if requested.**

**Rationale:**
- **MVP Scope:** 95% of use cases (tournaments, fairs, circuses) occur at single contiguous sites
- **Current Schema:** `sites.bbox` is `geography(POLYGON, 4326)` (already implemented in migration 0007)
- **Complexity:** MULTIPOLYGON adds significant UI/validation complexity (which polygon contains which zones?)
- **Migration Path:** Easy to upgrade column type from POLYGON to GEOMETRY in future migration if needed

**Implementation:**
- No changes required (current schema is correct)
- Document limitation in user-facing help text
- Add to v2 roadmap if users request disconnected site support

**Status:** ✅ RESOLVED - POLYGON only for v1

---

### Q-2: What is the max number of Zones per Layout before performance degrades?

**Answer:** **Set soft limit at 200 Zones per Layout; warn users at 150.**

**Rationale:**
- **MapLibre Rendering:** Can handle 500+ polygons at 60fps on modern browsers
- **Database Performance:** PostGIS spatial queries scale well with GIST indexes (tested in TASK 1)
- **User Experience:** Layouts with >200 zones become visually cluttered and hard to manage
- **Typical Usage:** Expected avg is 10-50 zones (vendor grids, competition areas); 200 is generous buffer

**Implementation:**
- Add UI warning toast when zone count hits 150: "Performance tip: Layouts with >200 zones may be slow. Consider splitting into multiple layouts."
- No hard limit in database (allow power users to exceed if needed)
- Add zone count to layout metadata for quick checks

**Performance Validation:**
- Load test with 500 zones on client (measure render time)
- Monitor PostGIS query times with 200+ zones (expect <200ms per Q-7)

**Status:** ✅ RESOLVED - 200 zone soft limit with warning at 150

---

### Q-3: Should share links have optional expiration dates?

**Answer:** **YES - Add optional `expires_at` timestamp (nullable).**

**Rationale:**
- **Common Use Case:** Event organizers want links to auto-expire after event ends (reduces stale link sharing)
- **Privacy/Security:** Prevents indefinite access to outdated layouts
- **Already Implemented:** `share_links.expires_at` column exists in migration 0012 (nullable TIMESTAMPTZ)
- **User Control:** Default to no expiry (NULL); user can set expiration during share link creation

**Implementation:**
- UI: Add "Expires on" date picker in Share Link modal (optional field)
- API: Check `expires_at` in share link endpoint; return 410 Gone if expired
- Background Job (v2): Soft-delete expired links daily (cleanup task)

**Database Schema:** ✅ Already implemented in TASK 1 (migration 0012)

**Status:** ✅ RESOLVED - Optional expiration dates supported

---

### Q-4: For template application, should system auto-scale Zones to fit Site boundary?

**Answer:** **Auto-scale with user preview + manual adjustment option.**

**Rationale:**
- **User Expectation:** Clicking "Apply Template" should produce immediate usable result (no blank canvas)
- **Flexibility:** User may need to fine-tune positions/sizes for specific site constraints
- **Technical Feasibility:** Compute bounding box of template zones, scale to fit 80% of site bbox (leave margin)

**Implementation Flow:**
1. User selects template from gallery
2. System calculates template bounding box (min/max lon/lat of all zones)
3. System scales template to fit 80% of site bbox (preserves aspect ratio)
4. Preview modal shows "Template Preview" with scaled zones overlaid on site map
5. User clicks "Apply" (commits to layout) or "Cancel" (discards preview)
6. After applying, user can edit zones individually (move vertices, resize)

**Edge Cases:**
- If template aspect ratio doesn't match site (e.g., square template on rectangular site), center and scale to fit shorter dimension
- If site bbox is missing, prompt user to draw site boundary first

**Status:** ✅ RESOLVED - Auto-scale with preview modal + manual editing

---

### Q-5: Should we track analytics on share link views?

**Answer:** **YES - Lightweight view count only (no PII, no user tracking).**

**Rationale:**
- **User Value:** Organizers want to know if participants are viewing layouts ("Did my vendors see this?")
- **Privacy First:** No IP logging, no cookies, no session tracking
- **Minimal Overhead:** Increment counter on each page load (single UPDATE query)
- **Already Implemented:** `share_links.access_count` and `last_accessed_at` columns exist in migration 0012

**Implementation:**
- On share link page load: `UPDATE share_links SET access_count = access_count + 1, last_accessed_at = NOW() WHERE slug = ?`
- Display in organizer UI: "Viewed 47 times (last accessed 2 hours ago)"
- No user identification (GDPR compliant)

**Database Schema:** ✅ Already implemented in TASK 1 (migration 0012)

**Status:** ✅ RESOLVED - View count tracking only (no PII)

---

### Q-6: What happens if user chooses NOT to migrate Venues/Pitches?

**Answer:** **Display warning banner; preserve data indefinitely; allow manual migration later.**

**Rationale:**
- **Data Safety:** Never delete user data without explicit action
- **Flexibility:** User may want to test new layout tools before migrating
- **Coexistence:** `FEATURE_BOOKING=false` hides booking UI but preserves tables

**Implementation:**
- On first login after v2 deploy, show dismissible banner:
  - "New Feature: Layout Designer is now available! You have 3 venues that can be migrated to Sites. [Migrate Now] [Learn More] [Dismiss]"
- If user dismisses, set `user_preferences.migration_banner_dismissed = true`
- User can manually trigger migration anytime via Settings → "Migrate Venues to Sites" button
- Migration script (0013) is idempotent (checks for existing sites before inserting)

**Database Schema:**
- ✅ Migration 0013 already preserves `venues` table (renames to `venues_deprecated`)
- ✅ Rollback restores venues table if needed

**Status:** ✅ RESOLVED - Warning banner + manual migration option

---

### Q-7: Should PDF export include satellite imagery basemap?

**Answer:** **NO - Zone outlines only (vector graphics + legend table).**

**Rationale:**
- **Licensing:** Mapbox/MapLibre satellite tiles have usage restrictions (require attribution, may have print limits)
- **File Size:** Satellite imagery at print resolution (300 DPI) = 5-20 MB PDFs (too large for email)
- **Clarity:** Vector outlines with color-coded zones are clearer than satellite imagery for handouts
- **Export Options:** Users who need satellite imagery can use PNG export (raster image with basemap)

**Implementation:**
- PDF export: Render white background + zone polygons (colored fills) + asset markers + legend table
- Legend: "Zone | Category | Area | Notes" (same data as GeoJSON properties)
- Add footer: "Generated by Plottr Field Layout Designer | [share link URL]"
- Optional: Add north arrow + scale bar for orientation

**Alternative:** Offer "Include Basemap" checkbox (advanced option) that embeds low-res satellite PNG

**Status:** ✅ RESOLVED - Vector outlines only (no satellite basemap in MVP)

---

### Q-8: Should Zone categories allow custom user-defined categories?

**Answer:** **Enforce enum for MVP; add "Custom" option with text input in v2.**

**Rationale:**
- **Data Quality:** Enum prevents typos, enables filtering/grouping, simplifies UI
- **Sufficient Coverage:** Predefined categories cover 90% of use cases:
  - `vendor`, `parking`, `competition`, `stage`, `restroom`, `medical`, `food`, `admin`, `seating`, `other`
- **Future Flexibility:** Easy to add `zones.custom_category` VARCHAR column in v2 if users request
- **Database Schema:** `zones.zone_type` is VARCHAR(50) in migration 0009 (can store enum or custom values)

**Implementation:**
- Frontend: Dropdown with predefined categories + "Other" option
- Backend: Validate zone_type against enum list; allow "other" as catch-all
- v2 Enhancement: If "Other" selected, show text input for custom category

**Predefined Enum (10 categories):**
```typescript
enum ZoneCategory {
  VENDOR = 'vendor',
  PARKING = 'parking',
  COMPETITION = 'competition',
  STAGE = 'stage',
  RESTROOM = 'restroom',
  MEDICAL = 'medical',
  FOOD = 'food',
  ADMIN = 'admin',
  SEATING = 'seating',
  OTHER = 'other',
}
```

**Status:** ✅ RESOLVED - Enforce enum (10 categories) for MVP

---

### Q-9: Should Asset icons be customizable (user uploads)?

**Answer:** **Preset FontAwesome icons only for MVP; defer custom uploads to v2.**

**Rationale:**
- **Security:** User-uploaded images require validation, sanitization, storage (S3/CDN) - out of MVP scope
- **Consistency:** FontAwesome icons ensure visual consistency across layouts
- **Sufficient Coverage:** FA Free has 2,000+ icons covering all asset types:
  - `fa-door-open` (entrance), `fa-restroom`, `fa-plug` (power), `fa-water`, `fa-parking`, etc.
- **Database Schema:** `assets.icon` is VARCHAR (can store FA class name like "fa-door-open")

**Implementation:**
- Frontend: Icon picker modal with 20-30 curated FA icons (filterable by category)
- Store FA class name in `assets.icon` column (e.g., "fa-door-open")
- MapLibre: Render FA icons as SVG markers on map (use `map.addImage()` with FA SVG paths)

**v2 Enhancement:** Add "Upload Custom Icon" option (PNG/SVG, 32x32px max, <50KB)

**Status:** ✅ RESOLVED - FontAwesome preset icons only (20-30 curated)

---

### Q-10: What is the target max file size for PNG exports?

**Answer:** **Target 2-5 MB; max 10 MB (enforce via resolution limits).**

**Rationale:**
- **Email Compatibility:** Most email providers allow 10-25 MB attachments; 5 MB is safe threshold
- **Print Quality:** 1920x1080 PNG at medium compression = 2-3 MB (sufficient for 8.5x11" print at 150 DPI)
- **Web Sharing:** Social media/Slack handle 5 MB images well; 10 MB may be slow on mobile
- **User Control:** Allow resolution picker (Low/Medium/High) with size estimates

**Implementation:**
- Resolution presets:
  - **Low (1280x720):** ~1 MB - web sharing, mobile viewing
  - **Medium (1920x1080):** ~3 MB - email, standard print (default)
  - **High (3840x2160 / 4K):** ~8 MB - large format print, projection
- UI: Show estimated file size before export ("~3 MB")
- Backend: Reject exports >10 MB (return 413 Payload Too Large)

**Technical Details:**
- Use Canvas `toBlob('image/png', 0.8)` for medium compression (quality = 0.8)
- Monitor actual file sizes in production; adjust compression if needed

**Status:** ✅ RESOLVED - Target 2-5 MB (max 10 MB with resolution limits)

---

## Summary Table

| Question | Decision | Implementation Status |
|----------|----------|----------------------|
| **Q-1: POLYGON vs MULTIPOLYGON** | POLYGON only for v1 | ✅ Already implemented |
| **Q-2: Max zones per layout** | 200 soft limit, warn at 150 | ⏳ Requires UI warning |
| **Q-3: Share link expiration** | Optional expires_at (nullable) | ✅ Already implemented |
| **Q-4: Template auto-scale** | Auto-scale with preview modal | ⏳ Requires template service |
| **Q-5: Share link analytics** | View count only (no PII) | ✅ Already implemented |
| **Q-6: Venues migration opt-out** | Warning banner + manual migration | ⏳ Requires UI banner |
| **Q-7: PDF basemap** | Vector outlines only (no satellite) | ⏳ Requires PDF export service |
| **Q-8: Custom zone categories** | Enum only (10 predefined) | ⏳ Requires Zod enum validation |
| **Q-9: Custom asset icons** | FontAwesome presets (20-30) | ⏳ Requires icon picker UI |
| **Q-10: PNG export file size** | Target 2-5 MB, max 10 MB | ⏳ Requires resolution picker |

**Legend:**
- ✅ Already implemented in TASK 1 (database schema supports it)
- ⏳ Requires implementation in TASK 2+ (backend/frontend work)

---

## Impact on TASK 2 (Backend API - Sites & Layouts)

### Database Schema: No Changes Required ✅
All decisions align with existing TASK 1 schema:
- `sites.bbox` supports POLYGON (Q-1)
- `share_links.expires_at` supports expiration (Q-3)
- `share_links.access_count` supports analytics (Q-5)
- `zones.zone_type` supports enum validation (Q-8)
- `assets.icon` supports FontAwesome class names (Q-9)

### Backend Services: New Requirements
**TASK 2 additions based on Q&A:**
1. **Share Link Expiration Check** (Q-3):
   - Add middleware to check `expires_at` in share link route
   - Return 410 Gone if expired

2. **View Count Tracking** (Q-5):
   - Increment `access_count` on share link page load
   - Update `last_accessed_at` timestamp

3. **Zone Count Validation** (Q-2):
   - Add computed field `layout.zone_count` in service responses
   - Include in list/get endpoints for UI warnings

4. **Zone Category Enum** (Q-8):
   - Create Zod enum schema with 10 predefined categories
   - Validate in zones controller

### Frontend: New Requirements (TASK 4)
1. Zone count warning UI (Q-2)
2. Share link expiration date picker (Q-3)
3. Template preview modal (Q-4)
4. Migration warning banner (Q-6)
5. Icon picker for assets (Q-9)
6. Resolution picker for PNG export (Q-10)

---

## Approval & Sign-Off

**Product Decision:** All 10 questions resolved ✅  
**Technical Feasibility:** Validated against TASK 1 schema ✅  
**MVP Scope:** Decisions align with v1 timeline ✅  

**Next Steps:**
1. Update PRD-0001 with answers (append this document as addendum)
2. Generate TASK 2 subtasks (Backend API - Sites & Layouts)
3. Include Q&A-driven requirements in subtask acceptance criteria

---

**Document Status:** Approved ✅  
**Action Required:** Proceed to TASK 2 subtask generation

**Related Documentation:**
- [PRD-0001](../0001-prd-field-layout-designer.md)
- [TASK 1 Complete](./0021-task-1-complete.md)
- [Parent Tasks](./0004-parent-tasks.md)
