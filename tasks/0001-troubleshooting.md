# Troubleshooting Guide - Field Layout System

**Version:** 1.0  
**Date:** October 20, 2025  
**Database:** PostgreSQL 16 with PostGIS 3.4  

## Common Errors & Solutions

### Migration Errors

#### Error: "PostGIS extension does not exist"

**Symptom:**
```
ERROR: type "geography" does not exist
```

**Cause:** PostGIS extension not installed or not enabled.

**Solution:**
```sql
-- Check if PostGIS is available
SELECT * FROM pg_available_extensions WHERE name = 'postgis';

-- Install PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_Version();
-- Expected: 3.4.x or higher
```

**Prevention:** Always verify PostGIS before running migrations.

---

#### Error: "Foreign key constraint violation"

**Symptom:**
```
ERROR: insert or update on table "sites" violates foreign key constraint "sites_club_id_foreign"
DETAIL: Key (club_id)=(1) is not present in table "clubs".
```

**Cause:** Trying to insert a site with a `club_id` that doesn't exist.

**Solution:**
```sql
-- Check if club exists
SELECT id, name FROM clubs WHERE id = 1;

-- If not, create the club first
INSERT INTO clubs (name, slug) VALUES ('Test Club', 'test-club');

-- Then create site
INSERT INTO sites (club_id, name, location) VALUES (
  1,
  'Test Site',
  ST_GeogFromText('POINT(-6.26 53.35)')
);
```

**Prevention:** Always create parent records (clubs) before child records (sites).

---

#### Error: "Migration already executed"

**Symptom:**
```
ERROR: relation "sites" already exists
```

**Cause:** Attempting to re-run a migration that has already been executed.

**Solution:**
```bash
# Check migration status
npm run knex migrate:list

# If migration is listed as completed, skip it
# If you need to re-run, rollback first:
npm run db:rollback

# Then re-migrate:
npm run db:migrate
```

**Prevention:** Use `npm run knex migrate:list` to check status before migrating.

---

### PostGIS Geometry Errors

#### Error: "Polygon ring not closed"

**Symptom:**
```
ERROR: geometry contains non-closed rings
```

**Cause:** Polygon's first point does not equal last point.

**Solution:**
```sql
-- WRONG: First ≠ Last
ST_GeogFromText('POLYGON((
  -6.26 53.35,
  -6.25 53.35,
  -6.25 53.34
))')

-- CORRECT: First = Last
ST_GeogFromText('POLYGON((
  -6.26 53.35,
  -6.25 53.35,
  -6.25 53.34,
  -6.26 53.34,
  -6.26 53.35
))')
```

**Prevention:** Always close polygons by repeating the first coordinate.

---

#### Error: "Coordinate out of range"

**Symptom:**
```
ERROR: Latitude or longitude value out of range
```

**Cause:** Latitude > 90 or < -90, or longitude > 180 or < -180.

**Solution:**
```sql
-- Check coordinate bounds
-- Longitude: -180 to +180
-- Latitude: -90 to +90

-- WRONG: Latitude = 153 (should be 53)
ST_GeogFromText('POINT(-6.26 153.35)')

-- CORRECT:
ST_GeogFromText('POINT(-6.26 53.35)')
```

**Common Mistake:** Swapping latitude and longitude (should be lon, lat order).

---

#### Error: "Self-intersecting polygon"

**Symptom:**
```
ERROR: new row for relation "zones" violates check constraint "chk_valid_boundary"
DETAIL: Failing row contains: (..., ST_IsValid check failed)
```

**Cause:** Polygon edges cross each other.

**Solution:**
```sql
-- Check if polygon is valid
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

-- Fix: Re-order coordinates to avoid crossing
ST_GeogFromText('POLYGON((
  -6.261 53.350,
  -6.260 53.350,
  -6.260 53.349,
  -6.261 53.349,
  -6.261 53.350
))')
```

**Visual Debug:**
1. Plot coordinates on a map to see the crossing
2. Use ST_IsValidReason() to find the intersection point
3. Re-order coordinates clockwise or counter-clockwise

---

#### Error: "Zone exceeds maximum area"

**Symptom:**
```
ERROR: new row for relation "zones" violates check constraint "chk_max_area"
DETAIL: Failing row contains: (..., area_sqm=15000000)
```

**Cause:** Zone area exceeds 10,000,000 m² (10 km²) limit.

**Solution:**
```sql
-- Check zone area before inserting
SELECT ST_Area(
  ST_GeogFromText('POLYGON((
    -6.3 53.4,
    -6.2 53.4,
    -6.2 53.3,
    -6.3 53.3,
    -6.3 53.4
  ))')
) AS area_sqm;
-- Returns: ~123000000 (too large!)

-- Reduce polygon size to fit within 10 km²
ST_GeogFromText('POLYGON((
  -6.261 53.350,
  -6.260 53.350,
  -6.260 53.349,
  -6.261 53.349,
  -6.261 53.350
))')
-- Returns: ~7140 sqm (valid)
```

**Typical Areas:**
- Soccer pitch (105m × 68m): ~7,140 m²
- American football field (110m × 49m): ~5,390 m²
- Rugby pitch (100m × 70m): ~7,000 m²
- Small sports complex: ~50,000 m²

---

#### Error: "Invalid geometry type for assets"

**Symptom:**
```
ERROR: new row for relation "assets" violates check constraint "chk_geometry_type"
DETAIL: Only ST_Point and ST_LineString are allowed
```

**Cause:** Trying to insert POLYGON, MULTIPOINT, or other geometry types into assets.

**Solution:**
```sql
-- WRONG: Polygon in assets table
INSERT INTO assets (name, layout_id, asset_type, geometry) VALUES (
  'Invalid Area',
  1,
  'zone',
  ST_GeogFromText('POLYGON((...))') -- Not allowed!
);

-- CORRECT: Use zones table for polygons
INSERT INTO zones (name, layout_id, zone_type, boundary) VALUES (
  'Training Area',
  1,
  'zone',
  ST_GeogFromText('POLYGON((...))') -- Correct table
);

-- CORRECT: Use POINT or LINESTRING in assets
INSERT INTO assets (name, layout_id, asset_type, geometry) VALUES (
  'Goal Post',
  1,
  'goal',
  ST_GeogFromText('POINT(-6.26 53.35)') -- Allowed
);
```

**Rule:** 
- **Zones** = Polygons (areas)
- **Assets** = Points or LineStrings (objects, lines)

---

### Data Migration Errors

#### Error: "Column does not exist after migration"

**Symptom:**
```
ERROR: column "type" of relation "zones" does not exist
```

**Cause:** Using old column names after migration.

**Solution:**
```sql
-- Check actual column names
\d zones

-- Update queries to use new names:
-- OLD: type
-- NEW: zone_type

-- WRONG:
SELECT * FROM zones WHERE type = 'pitch';

-- CORRECT:
SELECT * FROM zones WHERE zone_type = 'pitch';
```

**Column Name Changes:**
- `venues` → `sites`
- `zones.type` → `zones.zone_type`
- `assets.type` → `assets.asset_type`
- `sites.zip` → `sites.postal_code`

---

#### Error: "Venues data not migrated"

**Symptom:**
```
SELECT COUNT(*) FROM sites;
-- Returns: 0 (but venues has data)
```

**Cause:** Migration 0013 not executed or failed silently.

**Solution:**
```bash
# Check migration status
npm run knex migrate:list

# If 0013_migrate_venues_to_sites.ts is not in completed list:
npm run db:migrate

# Verify migration
psql -U postgres -d plottr_dev -c "
  SELECT 
    (SELECT COUNT(*) FROM venues) as venues_count,
    (SELECT COUNT(*) FROM sites) as sites_count;
"
# Expected: Equal counts
```

**Manual Migration:**
```sql
-- If automated migration failed, run manually:
INSERT INTO sites (
  club_id, name, address, city, state, postal_code, country,
  location, bbox, version_token, created_at, updated_at
)
SELECT 
  club_id, name, address, city, state, zip, country,
  center_point, bbox, gen_random_uuid(), created_at, updated_at
FROM venues
WHERE NOT EXISTS (
  SELECT 1 FROM sites WHERE sites.name = venues.name
);
```

---

### Seed Data Errors

#### Error: "Seed script fails with empty query"

**Symptom:**
```
ERROR: The query is empty
```

**Cause:** Variable not properly assigned in seed script (e.g., `sitesResult`).

**Solution:**
```typescript
// WRONG:
const sites = await knex.raw('SELECT ...');
// Variable 'sites' may be undefined

// CORRECT:
const sitesResult = await knex.raw('SELECT ...');
const sites = sitesResult.rows;
if (sites.length === 0) {
  // Handle empty case
}
```

**Prevention:** Always assign raw query results to `result.rows`.

---

#### Error: "PostGIS location returns Buffer"

**Symptom:**
```
TypeError: Cannot read property 'match' of undefined
```

**Cause:** PostGIS geography columns return Buffer objects, not strings.

**Solution:**
```typescript
// WRONG: Trying to parse Buffer as string
const lon = row.location.match(/POINT\((.*) (.*)\)/)[1];

// CORRECT: Use ST_X/ST_Y to extract coordinates
const result = await knex.raw(`
  SELECT 
    id,
    name,
    ST_X(location::geometry) as lon,
    ST_Y(location::geometry) as lat
  FROM sites
`);

const sites = result.rows;
const lon = sites[0].lon;  // Direct numeric value
const lat = sites[0].lat;
```

**Prevention:** Always use PostGIS accessor functions (ST_X, ST_Y) instead of string parsing.

---

### Test Errors

#### Error: "Tests fail with foreign key violation"

**Symptom:**
```
ERROR: insert or update on table "sites" violates foreign key constraint
DETAIL: Key (club_id)=(1) is not present in table "clubs"
```

**Cause:** Test database missing prerequisite data.

**Solution:**
```typescript
// Add beforeAll hook to create test club
let testClubId: number;

beforeAll(async () => {
  const [club] = await knex('clubs').insert({
    name: 'Test Club',
    slug: 'test-club',
  }).returning('id');
  testClubId = club.id;
});

// Use testClubId in tests
await knex('sites').insert({
  club_id: testClubId,  // Not hardcoded 1
  name: 'Test Site',
  location: knex.raw(`ST_GeogFromText('POINT(-6.26 53.35)')`),
});
```

---

#### Error: "Column name mismatch in tests"

**Symptom:**
```
ERROR: column "type" of relation "zones" does not exist
```

**Cause:** Tests using old column names.

**Solution:**
```typescript
// WRONG:
await knex('zones').insert({
  layout_id: 1,
  name: 'Test Zone',
  type: 'pitch',  // Old column name
});

// CORRECT:
await knex('zones').insert({
  layout_id: 1,
  name: 'Test Zone',
  zone_type: 'pitch',  // New column name
});
```

**Check Column Names:**
```bash
docker exec plottr_postgres psql -U postgres -d plottr_test -c "\d zones"
```

---

### Performance Issues

#### Issue: "Slow spatial queries"

**Symptom:** Queries with ST_Distance or ST_DWithin take >1 second.

**Cause:** Missing GIST indexes on geography columns.

**Solution:**
```sql
-- Check if indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sites' AND indexdef LIKE '%USING gist%';

-- If missing, create GIST indexes
CREATE INDEX idx_sites_location ON sites USING GIST(location);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);
CREATE INDEX idx_assets_geometry ON assets USING GIST(geometry);

-- Verify index is being used
EXPLAIN ANALYZE
SELECT * FROM sites
WHERE ST_DWithin(
  location,
  ST_GeogFromText('POINT(-6.26 53.35)'),
  10000
);
-- Look for "Index Scan using idx_sites_location"
```

**Performance Tip:** GIST indexes are critical for spatial queries.

---

#### Issue: "GIN array queries slow"

**Symptom:** `tags @> ARRAY['soccer']` queries slow on templates table.

**Cause:** Missing GIN index on TEXT[] column.

**Solution:**
```sql
-- Check if GIN index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'templates' AND indexdef LIKE '%USING gin%';

-- If missing, create GIN index
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);

-- Verify performance
EXPLAIN ANALYZE
SELECT * FROM templates WHERE tags @> ARRAY['soccer'];
-- Look for "Bitmap Index Scan using idx_templates_tags"
```

---

### Rollback Issues

#### Issue: "Rollback doesn't remove all tables"

**Symptom:** After rollback, some tables still exist.

**Cause:** Rollback only removes the last batch. Multiple batches require multiple rollbacks.

**Solution:**
```bash
# Check migration batches
npm run knex migrate:list

# Rollback last batch
npm run db:rollback

# Rollback again if needed
npm run db:rollback

# Or rollback all migrations
npm run knex migrate:rollback --all
```

---

#### Issue: "Old tables not restored after rollback"

**Symptom:** After rollback, `layouts` and `templates` tables missing.

**Cause:** Migration 0007a renames tables. Rollback should restore them.

**Solution:**
```bash
# Check if deprecated tables exist
psql -U postgres -d plottr_dev -c "\dt *deprecated"

# If they exist, manually restore
psql -U postgres -d plottr_dev -c "
  ALTER TABLE layouts_deprecated RENAME TO layouts;
  ALTER TABLE templates_deprecated RENAME TO templates;
"

# Or re-run migration sequence
npm run db:rollback --all
npm run db:migrate
```

---

## Diagnostic Commands

### Check PostGIS Installation

```sql
SELECT PostGIS_Version();
SELECT PostGIS_Full_Version();
```

### List All Tables

```sql
\dt
```

### Show Table Structure

```sql
\d sites
\d layouts
\d zones
\d assets
\d templates
\d share_links
```

### Check Migration Status

```bash
npm run knex migrate:list
```

### View Migration Logs

```sql
SELECT * FROM knex_migrations ORDER BY id DESC;
```

### Check Indexes

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Constraints

```sql
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid::regclass::text IN ('sites', 'layouts', 'zones', 'assets', 'templates', 'share_links')
ORDER BY table_name, constraint_name;
```

### Check Foreign Keys

```sql
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
```

### Check Data Counts

```sql
SELECT 
  'clubs' as table_name, COUNT(*) FROM clubs
UNION ALL
SELECT 'sites', COUNT(*) FROM sites
UNION ALL
SELECT 'layouts', COUNT(*) FROM layouts
UNION ALL
SELECT 'zones', COUNT(*) FROM zones
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'templates', COUNT(*) FROM templates
UNION ALL
SELECT 'share_links', COUNT(*) FROM share_links;
```

---

## Getting Help

### Log Files

Check PostgreSQL logs for detailed error messages:
```bash
# macOS (Homebrew)
tail -f /usr/local/var/log/postgres.log

# Linux
tail -f /var/log/postgresql/postgresql-16-main.log

# Docker
docker logs plottr_postgres
```

### Verbose Migration Output

```bash
# Run migrations with debug output
DEBUG=knex:* npm run db:migrate
```

### Database Connection Test

```bash
# Test connection string
psql $DATABASE_URL -c "SELECT current_database();"

# Check environment variables
env | grep DATABASE
```

### PostGIS Diagnostics

```sql
-- Check PostGIS configuration
SELECT name, setting FROM pg_settings WHERE name LIKE 'postgis%';

-- List PostGIS functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
  AND proname LIKE 'st_%' ORDER BY proname LIMIT 20;
```

---

## Support Resources

- **PostGIS Documentation:** https://postgis.net/docs/
- **Knex Documentation:** https://knexjs.org/
- **PostgreSQL Logs:** Check for detailed error messages
- **Schema Diagram:** `tasks/0001-schema-diagram.md`
- **Migration Guide:** `tasks/0001-migration-guide.md`
- **PostGIS Functions:** `tasks/0001-postgis-functions.md`

---

**Related Documentation:**
- [Schema Diagram](./0001-schema-diagram.md)
- [Migration Guide](./0001-migration-guide.md)
- [PostGIS Functions](./0001-postgis-functions.md)
