# TASK 3.6: Zones Integration Tests - Work Confirmation

**Date**: October 20, 2025  
**Current Task**: TASK 3.6 - Zones Integration Tests  
**Status**: 🚧 **STARTING NOW**

---

## Task Tracker Status Confirmed

✅ **TASK_TRACKER.md Updated:**
- Overall completion: **33% (29/88 subtasks)**
- TASK 1: ✅ Complete (10/10)
- TASK 2: ✅ Complete (14/14)
- TASK 3: 🚧 In Progress (5/7 - 71%)

**Current Position in TASK 3:**
- ✅ 3.1: Zones Repository (255 lines)
- ✅ 3.2: Zones Service (165 lines)
- ✅ 3.3: Zones Schemas (113 lines)
- ✅ 3.4: Zones Controller (212 lines)
- ✅ 3.5: Zones Routes (42 lines)
- 🚧 **3.6: Zones Integration Tests** ← **CURRENT TASK**
- ⏳ 3.7: Zones API Documentation

---

## TASK 3.6: Zones Integration Tests

### What I'm Building
**File**: `tests/integration/zones.test.ts`  
**Target**: 30+ comprehensive integration tests  
**Pattern**: Follow `tests/integration/layouts.test.ts` (526 lines, 32 tests)

### Test Categories (30+ tests)

1. **CRUD Operations** (8 tests)
   - Create zone with valid polygon
   - Get zone by ID
   - Update zone (name, color, surface, boundary)
   - Delete zone
   - Verify cascade delete when layout deleted

2. **Pagination** (5 tests)
   - List zones with cursor pagination
   - Navigate through pages with next_cursor
   - Filter by layout_id
   - Filter by zone_type
   - Verify limit boundary (1-100)

3. **Version Control** (4 tests)
   - Update with valid If-Match header
   - Reject update with stale version token (409)
   - Reject update without If-Match (400)
   - Delete with version token check

4. **Ownership Validation** (4 tests)
   - Prevent accessing zones from other user's layouts
   - Validate layout→site→club ownership chain
   - Return 403 for unauthorized access
   - Allow access within same club

5. **GeoJSON Validation** (5 tests)
   - Reject invalid polygon (not closed)
   - Reject self-intersecting polygon
   - Reject wrong winding order
   - Reject coordinates outside WGS84 bounds
   - Accept valid complex polygon

6. **PostGIS Calculations** (2 tests)
   - Verify area_sqm computed correctly
   - Verify perimeter_m computed correctly

7. **Zone Types** (2 tests)
   - Accept all 13 valid zone types
   - Reject invalid zone type (400)

8. **Error Cases** (5 tests)
   - 404 for non-existent zone ID
   - 400 for missing required fields
   - 400 for invalid color format
   - 400 for layout_id not found
   - 400 for invalid GeoJSON structure

### Tools Already Configured
✅ Jest (test framework)  
✅ Supertest (HTTP testing)  
✅ Knex (database setup)  
✅ TypeScript (type-safe tests)  
✅ Database migrations/seeds

### Acceptance Criteria
- [ ] All 30+ tests pass
- [ ] Coverage includes all 5 HTTP endpoints
- [ ] Version control tested (If-Match header)
- [ ] Ownership validation tested
- [ ] GeoJSON polygon validation tested
- [ ] Run via: `npm run test:integration -- tests/integration/zones.test.ts`

### Estimated Time
**1.5-2 hours** (following layouts.test.ts pattern)

---

## Why This Task Now

1. **Validate 787 LOC** of production code before documenting API
2. **Catch bugs early** (cheaper than fixing post-documentation)
3. **Follow proven pattern** (Sites: 33 tests, Layouts: 32 tests)
4. **No new tools needed** (leverage existing test infrastructure)
5. **Natural progression**: Code → Test → Document

---

## After TASK 3.6 Completes

**Next**: TASK 3.7 - Zones API Documentation
- Extend `openapi/plottr.yaml` with zones endpoints
- Document schemas (ZoneResponse, ZoneCreate, ZoneUpdate)
- Add Swagger UI examples
- Est. time: 45 minutes

**Then**: TASK 4 - Assets API (following same 7-step pattern)

---

**CONFIRMED: Proceeding with TASK 3.6 - Zones Integration Tests** ✅
