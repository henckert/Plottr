# PostGIS Functions Reference - Field Layout System

**Version:** 1.0  
**Date:** October 20, 2025  
**PostGIS Version:** 3.4.x  

## Overview

This document covers PostGIS functions used in the field layout system for creating, validating, and querying geospatial data.

## Core Concepts

### Geography vs Geometry

| Type | Use Case | Coordinate System | Distance Unit | Accuracy |
|------|----------|-------------------|---------------|----------|
| **geography** | Global data (lat/lon) | WGS84 (SRID 4326) | Meters | High (ellipsoidal) |
| **geometry** | Local data (projected) | Various SRIDs | Map units | Lower (planar) |

**Our Choice:** We use `geography` for accurate real-world measurements.

### SRID 4326 (WGS84)

- Standard GPS coordinate system
- Longitude: -180 to +180 (east/west)
- Latitude: -90 to +90 (north/south)
- Same as Google Maps, Mapbox, OpenStreetMap

## Constructor Functions

### ST_GeogFromText()

Create geography from Well-Known Text (WKT).

**Signature:**
```sql
ST_GeogFromText(text WKT) → geography
```

**Examples:**

```sql
-- Create a point (site location)
INSERT INTO sites (name, club_id, location) VALUES (
  'Riverside Park',
  1,
  ST_GeogFromText('POINT(-6.2603 53.3498)')  -- Dublin, Ireland
);

-- Create a polygon (site boundary)
INSERT INTO sites (name, club_id, location, bbox) VALUES (
  'Central Sports Complex',
  1,
  ST_GeogFromText('POINT(-8.4772 51.8985)'),  -- Cork, Ireland
  ST_GeogFromText('POLYGON((
    -8.478 51.899,
    -8.476 51.899,
    -8.476 51.898,
    -8.478 51.898,
    -8.478 51.899
  ))')
);

-- Create a zone boundary (soccer pitch 105m x 68m)
INSERT INTO zones (name, layout_id, zone_type, boundary, area_sqm) VALUES (
  'Main Pitch',
  1,
  'pitch',
  ST_GeogFromText('POLYGON((
    -6.2610 53.3504,
    -6.2596 53.3504,
    -6.2596 53.3492,
    -6.2610 53.3492,
    -6.2610 53.3504
  ))'),
  7140  -- 105m * 68m
);

-- Create a linestring (center line)
INSERT INTO assets (name, layout_id, asset_type, geometry) VALUES (
  'Center Line',
  1,
  'line',
  ST_GeogFromText('LINESTRING(-6.2603 53.3504, -6.2603 53.3492)')
);
```

**WKT Format Rules:**
- `POINT(lon lat)` - Single coordinate
- `LINESTRING(lon1 lat1, lon2 lat2, ...)` - Connected points
- `POLYGON((lon1 lat1, lon2 lat2, ..., lon1 lat1))` - Closed ring (first = last)
- Coordinates in **longitude, latitude** order (not lat/lon!)
- Polygons must be closed (first point = last point)

### ST_MakePoint()

Create a point from coordinates (alternative to ST_GeogFromText).

**Signature:**
```sql
ST_MakePoint(lon double, lat double) → geometry
ST_GeogFromGeom(geometry) → geography
```

**Example:**

```sql
-- Create point from variables
INSERT INTO sites (name, club_id, location) VALUES (
  'Willow Field',
  1,
  ST_GeogFromGeom(ST_MakePoint(-9.2597, 53.2707))  -- Galway, Ireland
);
```

## Measurement Functions

### ST_Distance()

Calculate distance between two geographies in meters.

**Signature:**
```sql
ST_Distance(geography a, geography b) → double precision
```

**Examples:**

```sql
-- Find sites within 10km of a point
SELECT id, name, ST_Distance(
  location,
  ST_GeogFromText('POINT(-6.2603 53.3498)')
) AS distance_meters
FROM sites
WHERE ST_Distance(
  location,
  ST_GeogFromText('POINT(-6.2603 53.3498)')
) < 10000  -- 10km
ORDER BY distance_meters;

-- Find nearest site to a coordinate
SELECT id, name, ST_Distance(
  location,
  ST_GeogFromText('POINT(-6.26 53.35)')
) AS distance_meters
FROM sites
ORDER BY distance_meters
LIMIT 1;
```

**Performance Tip:** Use GIST index on location column for fast proximity searches.

### ST_Area()

Calculate area of a polygon in square meters.

**Signature:**
```sql
ST_Area(geography geog) → double precision
```

**Examples:**

```sql
-- Calculate zone areas
SELECT 
  id,
  name,
  zone_type,
  ST_Area(boundary) AS actual_area_sqm,
  area_sqm AS stored_area_sqm
FROM zones;

-- Find largest zones
SELECT name, ST_Area(boundary) AS area_sqm
FROM zones
ORDER BY area_sqm DESC
LIMIT 10;

-- Validate area matches stored value
SELECT id, name,
  ST_Area(boundary) AS calculated,
  area_sqm AS stored,
  ABS(ST_Area(boundary) - area_sqm) AS difference
FROM zones
WHERE ABS(ST_Area(boundary) - area_sqm) > 1;  -- Tolerance: 1 sqm
```

### ST_Perimeter()

Calculate perimeter of a polygon in meters.

**Signature:**
```sql
ST_Perimeter(geography geog) → double precision
```

**Examples:**

```sql
-- Calculate zone perimeters
SELECT 
  id,
  name,
  ST_Perimeter(boundary) AS perimeter_meters,
  perimeter_m AS stored_perimeter
FROM zones;

-- Standard soccer pitch perimeter
-- 105m x 68m = 2*(105+68) = 346m
SELECT name, ST_Perimeter(boundary) AS perimeter
FROM zones
WHERE zone_type = 'pitch'
  AND ST_Perimeter(boundary) BETWEEN 340 AND 350;
```

### ST_Length()

Calculate length of a linestring in meters.

**Signature:**
```sql
ST_Length(geography geog) → double precision
```

**Examples:**

```sql
-- Calculate asset lengths (e.g., lines, paths)
SELECT 
  id,
  name,
  asset_type,
  ST_Length(geometry) AS length_meters
FROM assets
WHERE asset_type = 'line';

-- Find long lines
SELECT name, ST_Length(geometry) AS length
FROM assets
WHERE asset_type = 'line'
ORDER BY length DESC;
```

## Validation Functions

### ST_IsValid()

Check if geometry is topologically valid.

**Signature:**
```sql
ST_IsValid(geometry geom) → boolean
```

**Examples:**

```sql
-- Check all zones have valid boundaries
SELECT id, name, ST_IsValid(boundary::geometry) AS is_valid
FROM zones
WHERE NOT ST_IsValid(boundary::geometry);

-- Expected: 0 rows (constraint enforces validity)

-- Validate before insert (in application code)
SELECT ST_IsValid(
  ST_GeogFromText('POLYGON((
    -6.261 53.350,
    -6.260 53.350,
    -6.260 53.349,
    -6.261 53.349,
    -6.261 53.350
  ))')::geometry
);
-- Returns: true

-- Self-intersecting polygon (invalid)
SELECT ST_IsValid(
  ST_GeogFromText('POLYGON((
    -6.261 53.350,
    -6.260 53.349,
    -6.260 53.350,
    -6.261 53.349,
    -6.261 53.350
  ))')::geometry
);
-- Returns: false
```

**Common Invalid Cases:**
- Self-intersecting polygons (edges cross)
- Duplicate consecutive points
- Unclosed rings (first ≠ last)
- Spikes (very narrow triangles)

### ST_IsValidReason()

Get reason why geometry is invalid.

**Signature:**
```sql
ST_IsValidReason(geometry geom) → text
```

**Examples:**

```sql
-- Debug invalid geometry
SELECT ST_IsValidReason(
  ST_GeogFromText('POLYGON((
    -6.261 53.350,
    -6.260 53.349,
    -6.260 53.350,
    -6.261 53.349,
    -6.261 53.350
  ))')::geometry
);
-- Returns: "Self-intersection[(-6.2605 53.3495)]"

-- Check all zones
SELECT id, name, ST_IsValidReason(boundary::geometry) AS reason
FROM zones
WHERE NOT ST_IsValid(boundary::geometry);
```

### ST_GeometryType()

Get geometry type (POINT, LINESTRING, POLYGON, etc.).

**Signature:**
```sql
ST_GeometryType(geometry geom) → text
```

**Examples:**

```sql
-- Check asset geometry types
SELECT 
  id,
  name,
  asset_type,
  ST_GeometryType(geometry::geometry) AS geom_type
FROM assets;

-- Expected output:
-- id | name          | asset_type | geom_type
-- ---+---------------+------------+--------------
-- 1  | North Goal    | goal       | ST_Point
-- 2  | Center Line   | line       | ST_LineString

-- Validate assets only use POINT or LINESTRING
SELECT id, name, ST_GeometryType(geometry::geometry) AS geom_type
FROM assets
WHERE ST_GeometryType(geometry::geometry) NOT IN ('ST_Point', 'ST_LineString');

-- Expected: 0 rows (constraint enforces this)
```

## Accessor Functions

### ST_X() / ST_Y()

Extract longitude/latitude from a point.

**Signature:**
```sql
ST_X(geometry point) → double precision
ST_Y(geometry point) → double precision
```

**Examples:**

```sql
-- Extract coordinates from site locations
SELECT 
  id,
  name,
  ST_X(location::geometry) AS longitude,
  ST_Y(location::geometry) AS latitude
FROM sites;

-- Format as GeoJSON point
SELECT 
  id,
  name,
  json_build_object(
    'type', 'Point',
    'coordinates', json_build_array(
      ST_X(location::geometry),
      ST_Y(location::geometry)
    )
  ) AS geojson
FROM sites;
```

### ST_AsText()

Convert geography to WKT text format.

**Signature:**
```sql
ST_AsText(geography geog) → text
```

**Examples:**

```sql
-- Export zone boundaries as WKT
SELECT 
  id,
  name,
  ST_AsText(boundary) AS wkt
FROM zones;

-- Sample output:
-- POLYGON((-6.261 53.35,-6.26 53.35,-6.26 53.349,-6.261 53.349,-6.261 53.35))

-- Export site location
SELECT 
  name,
  ST_AsText(location) AS wkt
FROM sites
WHERE name = 'Riverside Park';

-- Output: POINT(-6.2603 53.3498)
```

### ST_AsGeoJSON()

Convert geography to GeoJSON format.

**Signature:**
```sql
ST_AsGeoJSON(geography geog) → text
```

**Examples:**

```sql
-- Export zones as GeoJSON
SELECT 
  id,
  name,
  zone_type,
  ST_AsGeoJSON(boundary)::json AS geometry
FROM zones;

-- Sample output:
-- {"type":"Polygon","coordinates":[[[-6.261,53.35],[-6.26,53.35],...]]

-- Build complete GeoJSON feature
SELECT json_build_object(
  'type', 'Feature',
  'geometry', ST_AsGeoJSON(boundary)::json,
  'properties', json_build_object(
    'id', id,
    'name', name,
    'zone_type', zone_type,
    'area_sqm', area_sqm
  )
) AS feature
FROM zones;
```

## Spatial Relationship Functions

### ST_Contains()

Check if geometry A completely contains geometry B.

**Signature:**
```sql
ST_Contains(geography A, geography B) → boolean
```

**Examples:**

```sql
-- Check if zone contains an asset
SELECT 
  z.name AS zone_name,
  a.name AS asset_name,
  ST_Contains(z.boundary, a.geometry) AS is_inside
FROM zones z
CROSS JOIN assets a
WHERE z.layout_id = a.layout_id
  AND ST_Contains(z.boundary, a.geometry);

-- Find assets outside all zones (data quality check)
SELECT a.*
FROM assets a
WHERE a.layout_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM zones z
    WHERE z.layout_id = a.layout_id
      AND ST_Contains(z.boundary, a.geometry)
  );
```

### ST_Intersects()

Check if two geometries have any spatial intersection.

**Signature:**
```sql
ST_Intersects(geography A, geography B) → boolean
```

**Examples:**

```sql
-- Find overlapping zones (potential data error)
SELECT 
  z1.id AS zone1_id,
  z1.name AS zone1_name,
  z2.id AS zone2_id,
  z2.name AS zone2_name
FROM zones z1
JOIN zones z2 ON z1.layout_id = z2.layout_id AND z1.id < z2.id
WHERE ST_Intersects(z1.boundary, z2.boundary);

-- Find zones intersecting a bounding box
SELECT id, name
FROM zones
WHERE ST_Intersects(
  boundary,
  ST_GeogFromText('POLYGON((
    -6.262 53.351,
    -6.259 53.351,
    -6.259 53.348,
    -6.262 53.348,
    -6.262 53.351
  ))')
);
```

### ST_DWithin()

Check if two geographies are within a distance (meters).

**Signature:**
```sql
ST_DWithin(geography A, geography B, double distance_meters) → boolean
```

**Examples:**

```sql
-- Find sites within 5km of a point
SELECT id, name
FROM sites
WHERE ST_DWithin(
  location,
  ST_GeogFromText('POINT(-6.2603 53.3498)'),
  5000  -- 5km in meters
);

-- Find assets near a specific zone
SELECT a.id, a.name, a.asset_type
FROM assets a
JOIN zones z ON a.layout_id = z.layout_id
WHERE z.id = 1
  AND ST_DWithin(a.geometry, z.boundary, 10);  -- Within 10 meters
```

## Usage in Application Code

### TypeScript/Knex Examples

```typescript
// Insert site with location
await knex('sites').insert({
  club_id: 1,
  name: 'Riverside Park',
  location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
});

// Query with distance calculation
const sites = await knex('sites')
  .select(
    'id',
    'name',
    knex.raw(`ST_X(location::geometry) as lon`),
    knex.raw(`ST_Y(location::geometry) as lat`),
    knex.raw(`ST_Distance(
      location,
      ST_GeogFromText('POINT(-6.26 53.35)')
    ) as distance_meters`)
  )
  .whereRaw(`ST_DWithin(
    location,
    ST_GeogFromText('POINT(-6.26 53.35)'),
    10000
  )`)
  .orderByRaw('distance_meters');

// Insert zone with area calculation
await knex('zones').insert({
  layout_id: 1,
  name: 'Main Pitch',
  zone_type: 'pitch',
  boundary: knex.raw(`ST_GeogFromText('POLYGON((...))')`),
  area_sqm: knex.raw(`ST_Area(ST_GeogFromText('POLYGON((...))'))::numeric(10,2)`),
});
```

## Performance Tips

### 1. Use GIST Indexes

```sql
-- Spatial indexes dramatically speed up queries
CREATE INDEX idx_sites_location ON sites USING GIST(location);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);
CREATE INDEX idx_assets_geometry ON assets USING GIST(geometry);
```

### 2. Use Geography for Global Data

Geography type uses ellipsoidal calculations (slower but accurate).

```sql
-- Accurate for global data (lat/lon)
SELECT ST_Distance(
  ST_GeogFromText('POINT(-6.26 53.35)'),
  ST_GeogFromText('POINT(-9.05 53.27)')
);
-- Returns: 239847.123 meters (accurate haversine)
```

### 3. Use Geometry for Local Data

Geometry type uses planar calculations (faster but less accurate at large scales).

```sql
-- Faster for local projections
SELECT ST_Distance(
  ST_GeomFromText('POINT(500000 200000)', 2157),  -- Irish Grid
  ST_GeomFromText('POINT(501000 201000)', 2157)
);
-- Returns: 1414.21 (Pythagorean distance)
```

### 4. Filter Before Spatial Operations

Use bounding box filters before expensive spatial operations:

```sql
-- SLOW: Calculates distance for every row
SELECT * FROM sites
WHERE ST_Distance(location, ST_GeogFromText('POINT(...)')) < 10000;

-- FAST: Uses GIST index to filter, then calculates distance
SELECT * FROM sites
WHERE ST_DWithin(location, ST_GeogFromText('POINT(...)'), 10000)
ORDER BY ST_Distance(location, ST_GeogFromText('POINT(...)'));
```

## Common Errors

### Error: "Coordinate out of range"

```sql
-- WRONG: Latitude > 90
ST_GeogFromText('POINT(-6.26 153.35)')
-- Error: Latitude must be between -90 and 90

-- CORRECT:
ST_GeogFromText('POINT(-6.26 53.35)')
```

### Error: "Ring is not closed"

```sql
-- WRONG: First point ≠ last point
ST_GeogFromText('POLYGON((-6.26 53.35, -6.25 53.35, -6.25 53.34))')
-- Error: Polygon ring must be closed

-- CORRECT: First point = last point
ST_GeogFromText('POLYGON((
  -6.26 53.35,
  -6.25 53.35,
  -6.25 53.34,
  -6.26 53.34,
  -6.26 53.35
))')
```

### Error: "Self-intersection"

```sql
-- WRONG: Edges cross
ST_GeogFromText('POLYGON((0 0, 2 2, 2 0, 0 2, 0 0))')
-- Constraint violation: ST_IsValid returns false

-- CORRECT: No self-intersections
ST_GeogFromText('POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))')
```

## Further Reading

- [PostGIS Documentation](https://postgis.net/docs/)
- [PostGIS Reference](https://postgis.net/docs/reference.html)
- [Geographic vs Cartesian](https://postgis.net/workshops/postgis-intro/geography.html)
- [WKT Specification](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry)

---

**Related Documentation:**
- [Schema Diagram](./0001-schema-diagram.md)
- [Migration Guide](./0001-migration-guide.md)
- [Troubleshooting](./0001-troubleshooting.md)
