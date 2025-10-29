# Plottr API Reference

**Version:** 0.1.0  
**Base URL:** `http://localhost:3001` (development)  
**Interactive Docs:** http://localhost:3001/api/docs

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Pagination](#pagination)
4. [Versioning & Concurrency](#versioning--concurrency)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Health & System](#health--system)
   - [Sites](#sites)
   - [Layouts](#layouts)
   - [Zones](#zones)
   - [Assets](#assets)
   - [Templates](#templates)
   - [Share Links](#share-links)
7. [Data Types](#data-types)
8. [Examples](#examples)

---

## Authentication

All API endpoints require authentication via Bearer token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Development Mode:** If `AUTH_REQUIRED=false` in your `.env`, the API accepts any token or runs without authentication.

**Production:** Uses Clerk JWT validation. Obtain a token from your authentication provider.

**Public Endpoints (No Auth):**
- `GET /health`, `/healthz`, `/ready`, `/live`
- `GET /share/:slug` (public share view)

---

## Rate Limiting

**Authenticated Endpoints:** 15 requests/minute  
**Public Endpoints:** 100 requests/minute

Rate limit headers included in responses:
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Pagination

All list endpoints use **cursor-based pagination** for scalability:

**Query Parameters:**
- `cursor` (optional): Base64-encoded cursor from previous response's `next_cursor`
- `limit` (optional): Records per page (default: 50, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "next_cursor": "base64_encoded_cursor",
  "has_more": true
}
```

**First Page:**
```http
GET /api/sites?limit=50
```

**Next Page:**
```http
GET /api/sites?cursor=eyJpZCI6MTAsInNvcnRWYWx1ZSI6IjIwMjUtMTAtMjdUMTI6MDA6MDAuMDAwWiJ9&limit=50
```

---

## Versioning & Concurrency

**Optimistic Locking:** Mutable resources (sites, layouts, zones, assets) use `version_token` (UUID) to prevent conflicting updates.

**Update Flow:**
1. Fetch resource to get current `version_token`
2. Include token in `If-Match` header when updating:
   ```http
   PUT /api/layouts/123
   If-Match: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```
3. If another user modified the resource, you'll get `409 Conflict`

**Handling 409 Conflicts:**
```json
{
  "error": {
    "message": "Resource version mismatch - stale version_token",
    "code": "VERSION_CONFLICT"
  }
}
```

**Solution:** Re-fetch the resource to get the latest `version_token` and retry.

---

## Error Handling

**Standard Error Response:**
```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Resource deleted
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Version token mismatch
- `410 Gone` - Share link expired
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `MISSING_AUTH` - No Authorization header
- `INVALID_TOKEN` - Invalid JWT token
- `FORBIDDEN` - Permission denied
- `NOT_FOUND` - Resource not found
- `VERSION_CONFLICT` - Stale version_token
- `SHARE_LINK_EXPIRED` - Share link past expiration date

---

## Endpoints

### Health & System

#### GET /health
Simple health check (no auth required).

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-10-27T12:00:00.000Z",
  "uptime": 3600
}
```

#### GET /healthz
Detailed health check with database connectivity (no auth required).

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-10-27T12:00:00.000Z",
  "database": {
    "healthy": true,
    "latency": 12
  }
}
```

---

### Sites

Sites are top-level containers representing physical locations (e.g., sports complexes, parks).

#### GET /api/sites
List sites with cursor pagination.

**Query Parameters:**
- `club_id` (required): Filter by club ID
- `cursor` (optional): Pagination cursor
- `limit` (optional): Records per page (default: 50, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "club_id": 10,
      "name": "Central Sports Complex",
      "address": "123 Main St, San Francisco, CA 94102",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "postal_code": "94102",
      "location": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "bbox": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "version_token": "uuid",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

#### POST /api/sites
Create a new site.

**Request Body:**
```json
{
  "club_id": 10,
  "name": "New Sports Complex",
  "address": "456 Oak St",
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  "postal_code": "94103",
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "bbox": {
    "type": "Polygon",
    "coordinates": [[...]]
  }
}
```

#### GET /api/sites/:id
Get a single site by ID.

#### PUT /api/sites/:id
Update a site (requires `If-Match` header with `version_token`).

#### DELETE /api/sites/:id
Delete a site (requires `If-Match` header). **Cascades to layouts, zones, assets.**

---

### Layouts

Layouts represent different configurations of a site (e.g., "Summer Soccer Setup", "Tournament Layout").

#### GET /api/layouts
List layouts with cursor pagination.

**Query Parameters:**
- `site_id` (optional): Filter by site ID
- `is_published` (optional): Filter by published status (true/false)
- `cursor` (optional): Pagination cursor
- `limit` (optional): Records per page

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "site_id": 1,
      "name": "Summer Soccer Setup",
      "description": "Standard layout for summer season",
      "is_published": true,
      "version_token": "uuid",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

#### POST /api/layouts
Create a new layout.

**Request Body:**
```json
{
  "site_id": 1,
  "name": "Tournament Layout",
  "description": "Special layout for weekend tournament",
  "is_published": false
}
```

#### GET /api/layouts/:id
Get a single layout by ID.

#### PUT /api/layouts/:id
Update a layout (requires `If-Match` header).

#### DELETE /api/layouts/:id
Delete a layout (requires `If-Match` header). **Cascades to zones, assets, share links.**

---

### Zones

Zones are polygon areas within a layout (e.g., pitches, parking, seating).

#### GET /api/zones
List zones with cursor pagination.

**Query Parameters:**
- `layout_id` (required): Filter by layout ID
- `zone_type` (optional): Filter by zone type
- `cursor`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "layout_id": 1,
      "name": "Main Pitch",
      "zone_type": "pitch",
      "surface": "grass",
      "color": "#22c55e",
      "boundary": {
        "type": "Polygon",
        "coordinates": [[[-122.4194, 37.7749], ...]]
      },
      "area_sqm": 7200.5,
      "perimeter_m": 360.2,
      "version_token": "uuid",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

**Zone Types:**
`pitch`, `goal_area`, `penalty_area`, `training_zone`, `competition`, `parking`, `seating`, `entrance`, `exit`, `restroom`, `concession`, `vendor`, `medical`, `equipment`, `other`

**Surface Types:**
`grass`, `turf`, `clay`, `concrete`, `asphalt`, `gravel`, `other`

#### POST /api/zones
Create a new zone.

**Request Body:**
```json
{
  "layout_id": 1,
  "name": "New Pitch",
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
}
```

**Validation:**
- Polygon must be closed (first point == last point)
- Minimum 4 points (3 unique + 1 closing)
- Counter-clockwise winding order (RFC 7946)
- WGS84 bounds: lon [-180, 180], lat [-90, 90]
- No self-intersections

#### GET /api/zones/:id
Get a single zone by ID.

#### PUT /api/zones/:id
Update a zone (requires `If-Match` header).

#### DELETE /api/zones/:id
Delete a zone (requires `If-Match` header).

---

### Assets

Assets are point or line features within a layout (e.g., goals, benches, lights). **Assets cannot be polygons.**

#### GET /api/assets
List assets with cursor pagination.

**Query Parameters:**
- `layout_id` (optional): Filter by layout ID
- `zone_id` (optional): Filter by zone ID
- `asset_type` (optional): Filter by asset type
- `cursor`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "layout_id": 1,
      "zone_id": 5,
      "name": "Goal Post 1",
      "asset_type": "goal",
      "icon": "fa-futbol",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "rotation_deg": 90,
      "properties": {
        "height": 2.44,
        "width": 7.32
      },
      "version_token": "uuid",
      "created_at": "2025-10-20T12:00:00.000Z",
      "updated_at": "2025-10-20T12:00:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

**Asset Types:**
`goal`, `bench`, `light`, `cone`, `flag`, `marker`, `tree`, `fence`, `net`, `scoreboard`, `water_fountain`, `trash_bin`, `camera`, `other`

**Icons (FontAwesome):**
`fa-futbol`, `fa-basketball`, `fa-volleyball`, `fa-baseball`, `fa-flag`, `fa-bullseye`, `fa-chair`, `fa-lightbulb`, `fa-tree`, `fa-cone-striped`, `fa-water`, `fa-dumpster`, `fa-square-parking`, `fa-restroom`, `fa-kit-medical`, `fa-camera`, `fa-wifi`, `fa-phone`, `fa-door-open`, `fa-fence`

#### POST /api/assets
Create a new asset.

**Request Body:**
```json
{
  "layout_id": 1,
  "zone_id": 5,
  "name": "Corner Flag",
  "asset_type": "flag",
  "icon": "fa-flag",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "rotation_deg": 45,
  "properties": {
    "material": "plastic"
  }
}
```

**Geometry Types:** Only `Point` or `LineString` allowed (no Polygon).

#### GET /api/assets/:id
Get a single asset by ID.

#### PUT /api/assets/:id
Update an asset (requires `If-Match` header).

#### DELETE /api/assets/:id
Delete an asset (requires `If-Match` header).

---

### Templates

Templates are reusable zone and asset configurations (e.g., "Soccer Field", "Basketball Court").

#### GET /api/templates
List templates.

**Query Parameters:**
- `sport_type` (optional): Filter by sport type
- `is_public` (optional): Filter by public/private
- `created_by` (optional): Filter by creator
- `cursor`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "created_by": "user_123",
      "name": "Standard Soccer Field",
      "sport_type": "soccer",
      "description": "Full-size soccer field with goals and benches",
      "zones": [
        {"name": "Pitch", "zone_type": "pitch", "color": "#22c55e"},
        {"name": "Goal Area", "zone_type": "goal_area", "color": "#3b82f6"}
      ],
      "assets": [
        {"name": "Goal Post 1", "asset_type": "goal", "icon": "fa-futbol"}
      ],
      "thumbnail_url": "https://example.com/thumbnails/soccer.png",
      "is_public": true,
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

#### GET /api/templates/:id
Get a single template by ID.

#### POST /api/templates/from-layout
Create a custom template from an existing layout.

**Request Body:**
```json
{
  "layout_id": 1,
  "name": "My Custom Setup",
  "sport_type": "soccer",
  "description": "Custom layout for our team",
  "thumbnail_url": "https://example.com/thumbnail.png",
  "is_public": false
}
```

#### POST /api/templates/:id/apply
Apply a template to a layout.

**Request Body:**
```json
{
  "layout_id": 1,
  "clear_existing": true
}
```

**Response:**
```json
{
  "data": {
    "message": "Template applied successfully",
    "zones_created": ["Pitch", "Goal Area", "Penalty Box"],
    "assets_created": ["Goal Post 1", "Corner Flag 1", "Bench"]
  }
}
```

#### DELETE /api/templates/:id
Delete a custom template (only creator can delete).

---

### Share Links

Share links provide public, read-only access to layouts without authentication.

#### GET /api/share-links
List share links.

**Query Parameters:**
- `layout_id` (optional): Filter by layout ID
- `cursor`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "layout_id": 1,
      "slug": "abc123xyz789",
      "expires_at": "2025-11-15T00:00:00.000Z",
      "view_count": 42,
      "last_accessed_at": "2025-10-27T14:30:00.000Z",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-27T14:30:00.000Z"
    }
  ],
  "next_cursor": "base64_cursor",
  "has_more": true
}
```

#### POST /api/share-links
Create a new share link.

**Request Body:**
```json
{
  "layout_id": 1,
  "expires_at": "2025-11-15T00:00:00.000Z"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "layout_id": 1,
    "slug": "abc123xyz789",
    "expires_at": "2025-11-15T00:00:00.000Z",
    "view_count": 0,
    "last_accessed_at": null,
    "created_at": "2025-10-27T15:00:00.000Z",
    "updated_at": "2025-10-27T15:00:00.000Z"
  }
}
```

**Public Share URL:** `http://localhost:3001/share/abc123xyz789`

#### GET /api/share-links/:id
Get a single share link by ID.

#### DELETE /api/share-links/:id
Revoke a share link (immediate effect, public access disabled).

#### GET /share/:slug (Public, No Auth)
Access shared layout data via public slug.

**Response:**
```json
{
  "data": {
    "layout": {
      "id": 1,
      "name": "Summer Soccer Setup",
      "description": "Standard layout for summer season"
    },
    "zones": [...],
    "assets": [...],
    "share_link": {
      "slug": "abc123xyz789",
      "view_count": 43,
      "expires_at": "2025-11-15T00:00:00.000Z",
      "last_accessed_at": "2025-10-27T15:00:00.000Z"
    }
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Invalid slug
- `410 SHARE_LINK_EXPIRED` - Past expiration date

---

## Data Types

### GeoJSON Point
```json
{
  "type": "Point",
  "coordinates": [-122.4194, 37.7749]
}
```

### GeoJSON Polygon (WGS84, Counter-clockwise)
```json
{
  "type": "Polygon",
  "coordinates": [[
    [-122.4194, 37.7749],
    [-122.4184, 37.7749],
    [-122.4184, 37.7739],
    [-122.4194, 37.7739],
    [-122.4194, 37.7749]
  ]]
}
```

### GeoJSON LineString
```json
{
  "type": "LineString",
  "coordinates": [
    [-122.4194, 37.7749],
    [-122.4184, 37.7739]
  ]
}
```

---

## Examples

### Creating a Complete Layout

**1. Create a Site:**
```bash
curl -X POST http://localhost:3001/api/sites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "club_id": 10,
    "name": "Training Complex",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "location": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    }
  }'
```

**2. Create a Layout:**
```bash
curl -X POST http://localhost:3001/api/layouts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": 1,
    "name": "Game Day Setup",
    "is_published": true
  }'
```

**3. Add a Zone:**
```bash
curl -X POST http://localhost:3001/api/zones \
  -H "Authorization: Bearer YOUR_TOKEN" \
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
```

**4. Add an Asset:**
```bash
curl -X POST http://localhost:3001/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout_id": 1,
    "name": "Goal Post",
    "asset_type": "goal",
    "icon": "fa-futbol",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    },
    "rotation_deg": 90
  }'
```

**5. Create a Share Link:**
```bash
curl -X POST http://localhost:3001/api/share-links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout_id": 1,
    "expires_at": "2025-12-31T23:59:59.000Z"
  }'
```

**6. Access Public Share View (No Auth):**
```bash
curl http://localhost:3001/share/abc123xyz789
```

---

## Support

- **Interactive Docs:** http://localhost:3001/api/docs
- **OpenAPI Spec (JSON):** http://localhost:3001/api/openapi.json
- **OpenAPI Spec (YAML):** http://localhost:3001/api/openapi.yaml
- **GitHub Issues:** https://github.com/henckert/Plottr/issues
- **Email:** support@plottr.example.com

---

**Last Updated:** October 27, 2025  
**API Version:** 0.1.0
