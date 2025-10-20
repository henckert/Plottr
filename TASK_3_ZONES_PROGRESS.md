# TASK 3: Zones API - Progress Update

**Status**: 🚀 **5/7 Subtasks Complete (71%)**  
**Date**: October 20, 2025  
**Remaining**: Integration Tests + API Documentation

---

## ✅ Completed Subtasks

### 3.1: Zones Repository (255 lines) ✅
- **File**: `src/data/zones.repo.ts`
- **Methods**: 8 total
  - `list()` - Cursor pagination with layout_id and zone_type filters
  - `getById()` - Fetch single zone with GeoJSON boundary
  - `create()` - Create with PostGIS area/perimeter computation
  - `update()` - Update with version token check
  - `delete()` - Delete with version token check
  - `getLayoutId()` - For ownership validation
  - `countByLayout()` - For tier limit enforcement
  - `generateVersionToken()` - UUID generation
- **Features**: PostGIS POLYGON support, cursor pagination, version control

### 3.2: Zones Service (165 lines) ✅
- **File**: `src/services/zones.service.ts`
- **Methods**: 5 public + 2 private
  - `listPaginated()` - Business logic for listing
  - `get()` - Single zone retrieval
  - `create()` - Creation with ownership validation
  - `update()` - Update with version conflict handling
  - `delete()` - Deletion with ownership validation
  - `validateLayoutAccess()` - Ownership chain validation
  - `mapRow()` - DB row to DTO mapping
- **Features**: Ownership validation, error handling, DTO transformation

### 3.3: Zones Schemas (113 lines) ✅
- **File**: `src/schemas/zones.schema.ts`
- **Schemas**: 4 Zod schemas + GeoJSON Polygon
  - `ZoneResponseSchema` - API response validation
  - `ZoneCreateSchema` - POST input validation
  - `ZoneUpdateSchema` - PUT input validation (partial)
  - `ZonesListResponseSchema` - Paginated list response
  - `GeoJSONPolygonSchema` - Boundary geometry validation
- **Features**: 
  - 13 zone types (pitch, goal_area, penalty_area, training_zone, etc.)
  - 7 surface types (grass, turf, clay, concrete, asphalt, gravel, other)
  - Hex color validation (#RRGGBB format)
  - TypeScript type inference

### 3.4: Zones Controller (212 lines) ✅
- **File**: `src/controllers/zones.controller.ts`
- **Handlers**: 5 HTTP endpoints
  - `listZones()` - GET /api/zones with pagination
  - `getZone()` - GET /api/zones/:id
  - `createZone()` - POST /api/zones
  - `updateZone()` - PUT /api/zones/:id (requires If-Match)
  - `deleteZone()` - DELETE /api/zones/:id (requires If-Match)
- **Features**: Input validation, authentication checks, error responses

### 3.5: Zones Routes (42 lines) ✅
- **File**: `src/routes/zones.routes.ts`
- **Routes**: 5 endpoints registered
  - GET /api/zones - List with filters
  - POST /api/zones - Create
  - GET /api/zones/:id - Get by ID
  - PUT /api/zones/:id - Update
  - DELETE /api/zones/:id - Delete
- **Middleware**: Auth middleware applied to all routes
- **Integration**: Registered in `src/routes/index.ts`

---

## 📋 Remaining Work

### 3.6: Integration Tests (In Progress)
- **File**: `tests/integration/zones.test.ts`
- **Planned Tests**: 30+ comprehensive tests
  - CRUD operations (create, read, update, delete)
  - Cursor pagination edge cases
  - Version control (optimistic locking)
  - Ownership validation
  - Layout_id filtering
  - Zone_type filtering
  - Error cases (404, 409, 400)
  - GeoJSON boundary validation
- **Estimated Time**: 1-2 hours

### 3.7: API Documentation
- **File**: `openapi/plottr.yaml`
- **Changes Needed**:
  - Add 5 zones endpoints documentation
  - Add Zone, ZoneCreate, ZoneUpdate schemas
  - Add ZonesListResponse schema
  - Add error response examples
  - Update Swagger UI examples
- **Estimated Time**: 45 minutes

---

## 📊 Code Statistics

| Component | Lines | Status |
|-----------|-------|--------|
| Repository | 255 | ✅ |
| Service | 165 | ✅ |
| Schemas | 113 | ✅ |
| Controller | 212 | ✅ |
| Routes | 42 | ✅ |
| **Total Written** | **787** | **5/7** |
| Integration Tests | 0 (target: 450+) | 🔄 |
| API Documentation | 0 (target: 200+) | ⏳ |
| **Total Target** | **~1,437** | **71%** |

---

## 🎯 API Endpoints (Ready)

All endpoints functional and integrated:

```
GET    /api/zones              - List zones (cursor pagination)
POST   /api/zones              - Create zone
GET    /api/zones/:id          - Get zone by ID
PUT    /api/zones/:id          - Update zone (If-Match required)
DELETE /api/zones/:id          - Delete zone (If-Match required)
```

**Filters Supported**:
- `?layout_id=N` - Filter by layout
- `?zone_type=TYPE` - Filter by zone type
- `?limit=N` - Pagination limit (1-100)
- `?cursor=ABC` - Cursor for next page

---

## 🧪 Quick Manual Test

```bash
# Start backend
npm run dev

# Test health
curl http://localhost:3001/health

# Create zone (requires auth token)
curl -X POST http://localhost:3001/api/zones \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "layout_id": 1,
    "name": "Main Pitch",
    "zone_type": "pitch",
    "surface": "grass",
    "color": "#22c55e",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[
        [-122.4194, 37.7749],
        [-122.4184, 37.7749],
        [-122.4184, 37.7739],
        [-122.4194, 37.7739],
        [-122.4194, 37.7749]
      ]]
    }
  }'

# List zones
curl http://localhost:3001/api/zones?layout_id=1 \
  -H "Authorization: Bearer dev-token"
```

---

## ✨ Next Steps

**Priority 1: Integration Tests** (Target: ~450 lines)
- Set up test database fixtures
- Create comprehensive CRUD tests
- Test pagination thoroughly
- Test version control edge cases
- Test ownership validation
- Aim for 30+ test cases

**Priority 2: API Documentation** (Target: ~200 lines)
- Extend OpenAPI spec
- Add zone schemas
- Add endpoint documentation
- Include request/response examples
- Update Swagger UI

**Estimated Total Time**: 2-3 hours to complete TASK 3

---

**Current Status**: Core API complete, testing and documentation remaining  
**Next Action**: Create `tests/integration/zones.test.ts` with comprehensive test suite
