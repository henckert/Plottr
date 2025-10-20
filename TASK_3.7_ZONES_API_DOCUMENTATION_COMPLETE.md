# TASK 3.7 - Zones API Documentation - COMPLETE ✅

**Completion Date:** 2025-10-20  
**OpenAPI Spec:** `openapi/plottr.yaml` extended with Zones endpoints

## Summary

Successfully documented all 5 Zones API endpoints in the OpenAPI specification with comprehensive schemas, query parameters, headers, and error responses. Documentation follows the existing Layouts API pattern for consistency.

## What Was Added

### Endpoints (5 total)

#### 1. **GET /zones** - List zones with pagination
- **Query Parameters:**
  - `layout_id` (optional integer) - Filter by layout
  - `zone_type` (optional enum) - Filter by type (16 values)
  - `cursor` (optional string) - Base64 cursor for pagination
  - `limit` (optional integer, 1-100, default 50) - Page size
- **Response:** Paginated list with `data`, `next_cursor`, `has_more`
- **Errors:** 400, 401, 500

#### 2. **POST /zones** - Create zone
- **Request Body:** `ZoneCreate` schema
  - Required: `layout_id`, `name`, `zone_type`, `boundary` (GeoJSON)
  - Optional: `surface`, `color` (hex)
- **Response:** 201 with created zone
- **Errors:** 400 (validation), 401, 404 (layout not found)

#### 3. **GET /zones/{id}** - Get single zone
- **Path Parameter:** `id` (integer)
- **Response:** Zone details
- **Errors:** 401, 404

#### 4. **PUT /zones/{id}** - Update zone
- **Path Parameter:** `id` (integer)
- **Header:** `If-Match` (required, UUID version token)
- **Request Body:** `ZoneUpdate` schema (partial update)
- **Response:** 200 with updated zone
- **Errors:** 400, 401, 404, 409 (version conflict)

#### 5. **DELETE /zones/{id}** - Delete zone
- **Path Parameter:** `id` (integer)
- **Header:** `If-Match` (required, UUID version token)
- **Response:** 204 (no content)
- **Errors:** 400, 401, 404, 409 (version conflict)

---

### Schemas (3 total)

#### 1. **Zone** (Response Schema)
```yaml
Properties:
  - id (integer, required)
  - layout_id (integer, required)
  - name (string, maxLength 100, required)
  - zone_type (enum, 16 values, required)
  - surface (enum, 7 values, nullable)
  - color (string, hex pattern, nullable)
  - boundary (GeoJSON Polygon, required)
  - area_sqm (number, nullable) - Auto-calculated
  - perimeter_m (number, nullable) - Auto-calculated
  - version_token (UUID, required)
  - created_at (datetime, required)
  - updated_at (datetime, required)
```

**Example boundary:**
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-122.4194, 37.7749],
      [-122.4184, 37.7749],
      [-122.4184, 37.7739],
      [-122.4194, 37.7739],
      [-122.4194, 37.7749]
    ]
  ]
}
```

#### 2. **ZoneCreate** (Create Request Schema)
```yaml
Required:
  - layout_id (integer)
  - name (string, maxLength 100)
  - zone_type (enum: pitch, goal_area, penalty_area, training_zone, 
               competition, parking, seating, entrance, exit, restroom, 
               concession, vendor, medical, equipment, other)
  - boundary (GeoJSON Polygon - must be valid: closed ring, 4+ points, WGS84 bounds)

Optional:
  - surface (enum: grass, turf, clay, concrete, asphalt, gravel, other)
  - color (hex string pattern: ^#[0-9A-Fa-f]{6}$)
```

#### 3. **ZoneUpdate** (Update Request Schema)
```yaml
All Optional (partial update):
  - name (string, maxLength 100)
  - zone_type (enum, 16 values)
  - surface (enum, 7 values, nullable)
  - color (hex string, nullable)
  - boundary (GeoJSON Polygon)

Note: Requires at least one field. Version token in If-Match header.
```

---

## Zone Types Enum (16 values)

Documented all zone types from `zones.schema.ts`:
- **Sports:** `pitch`, `goal_area`, `penalty_area`, `training_zone`, `competition`
- **Facilities:** `parking`, `seating`, `entrance`, `exit`, `restroom`, `concession`, `vendor`, `medical`, `equipment`
- **General:** `other`

## Surface Types Enum (7 values)

- `grass`, `turf`, `clay`, `concrete`, `asphalt`, `gravel`, `other`

## Validation Rules Documented

1. **GeoJSON Polygon:**
   - Must be closed ring (first point === last point)
   - Minimum 4 points (3 unique + 1 closing)
   - WGS84 bounds: longitude [-180, 180], latitude [-90, 90]

2. **Color Format:**
   - Hex code pattern: `^#[0-9A-Fa-f]{6}$`
   - Example: `#22c55e` (green)

3. **Optimistic Concurrency:**
   - PUT and DELETE require `If-Match` header with current `version_token` (UUID)
   - Returns 409 if token is stale

4. **Pagination:**
   - Cursor-based (not offset)
   - Default limit: 50, max: 100
   - Response includes `next_cursor` and `has_more` boolean

## Error Responses

All endpoints document standard error codes:
- **400 Bad Request** - Validation failed, missing required fields, invalid GeoJSON
- **401 Unauthorized** - Missing or invalid auth token
- **404 Not Found** - Zone or layout not found
- **409 Conflict** - Version token mismatch (stale resource)
- **500 Internal Server Error** - Unexpected server error

## File Modifications

| File | Changes |
|------|---------|
| `openapi/plottr.yaml` | Added 5 endpoints + 3 schemas (240+ lines) |

**Additions Summary:**
- **Lines Added:** ~240
- **Endpoints:** 5 (GET list, POST create, GET by ID, PUT update, DELETE)
- **Schemas:** 3 (Zone, ZoneCreate, ZoneUpdate)
- **Query Parameters:** 4 (layout_id, zone_type, cursor, limit)
- **Headers:** 1 (If-Match for version control)
- **Examples:** GeoJSON polygon, hex colors, timestamps

## Integration with Swagger UI

The OpenAPI spec can now be used to:
1. **Generate Swagger UI** at `/api/docs` endpoint
2. **Interactive API Testing** - Try out endpoints with real data
3. **Client Code Generation** - Auto-generate TypeScript/JavaScript SDK
4. **API Contract Validation** - Ensure implementation matches spec

## Consistency with Existing Patterns

Zones documentation follows the **Layouts API pattern**:
- ✅ Same pagination structure (`next_cursor`, `has_more`)
- ✅ Same authentication (Bearer token)
- ✅ Same version control mechanism (`If-Match` header)
- ✅ Same error response format
- ✅ Same tag structure (`- Zones`)
- ✅ Same query parameter naming conventions

## Validation Against Implementation

Documented API matches implementation:
- ✅ All 5 endpoints from `zones.routes.ts`
- ✅ All schemas from `zones.schema.ts`
- ✅ All zone types enum values
- ✅ All surface types enum values
- ✅ GeoJSON validation rules from `geospatial.ts`
- ✅ Version token format (UUID)
- ✅ Pagination response structure from `pagination.ts`

## Next Steps

**TASK 3 COMPLETE! All 7 subtasks finished:**
- ✅ 3.1 Zones Repository
- ✅ 3.2 Zones Service
- ✅ 3.3 Zones Schemas
- ✅ 3.4 Zones Controller
- ✅ 3.5 Zones Routes
- ✅ 3.6 Zones Integration Tests (29/29 passing)
- ✅ 3.7 Zones API Documentation

**Ready for:**
- Future tasks (TASK 4+)
- Swagger UI deployment at `/api/docs`
- Client SDK generation from OpenAPI spec
- Postman collection import
- API documentation website generation

## Success Criteria Met ✅

- [x] All 5 zones endpoints documented (GET /, POST /, GET /:id, PUT /:id, DELETE /:id)
- [x] Zone schemas defined (Zone, ZoneCreate, ZoneUpdate)
- [x] Query parameters documented (layout_id, zone_type, cursor, limit)
- [x] If-Match header documented for version control
- [x] Error responses documented (400, 401, 404, 409, 500)
- [x] GeoJSON examples provided
- [x] Enum values documented (16 zone types, 7 surface types)
- [x] Validation rules explained (ring closure, WGS84 bounds, hex colors)
- [x] Follows existing Layouts API pattern
- [x] Ready for Swagger UI integration
