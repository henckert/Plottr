# Migration Guide - Field Layout System

**Version:** 1.0  
**Date:** October 20, 2025  
**Target Database:** PostgreSQL 16 with PostGIS 3.4  

## Overview

This guide covers the migration from the old pitch-based system to the new field layout system with Sites, Layouts, Zones, Assets, Templates, and ShareLinks.

## Prerequisites

### Required Software
- **PostgreSQL:** 16.x or higher
- **PostGIS Extension:** 3.4 or higher
- **Node.js:** 18.x or higher (for Knex migrations)
- **Knex CLI:** `npm install -g knex`

### Verify PostGIS Installation

```sql
-- Check PostgreSQL version
SELECT version();
-- Expected: PostgreSQL 16.x

-- Check PostGIS version
SELECT PostGIS_Version();
-- Expected: 3.4.x

-- List installed extensions
SELECT * FROM pg_available_extensions WHERE name = 'postgis';
```

If PostGIS is not installed:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Pre-Migration Checklist

### 1. Backup Your Database

**Critical:** Always backup before running migrations.

```bash
# Full database backup
pg_dump -U postgres -d plottr_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql

# Test restore (on test database)
psql -U postgres -d plottr_test < backup_20251020_120000.sql
```

### 2. Check Database Connection

```bash
# Test connection
psql -U postgres -d plottr_dev -c "SELECT current_database();"

# Verify environment variables
echo $DATABASE_URL
# Expected: postgres://postgres:postgres@localhost:5432/plottr_dev
```

### 3. Review Existing Data

```sql
-- Check venues data (will be migrated to sites)
SELECT COUNT(*) FROM venues;
SELECT id, name, club_id FROM venues LIMIT 5;

-- Check old layouts/templates (will be preserved as _deprecated)
SELECT COUNT(*) FROM layouts;
SELECT COUNT(*) FROM templates;
```

## Migration Execution

### Step 1: Run Migrations

Execute all migrations in sequence:

```bash
# From project root
cd /path/to/plottr

# Run all pending migrations
npm run db:migrate

# Expected output:
# Batch 1 run: 7 migrations
# 0007_create_sites_table.ts
# 0007a_rename_old_tables.ts
# 0008_create_layouts_table.ts
# 0009_create_zones_table.ts
# 0010_create_assets_table.ts
# 0011_create_templates_table.ts
# 0012_create_share_links_table.ts
# 0013_migrate_venues_to_sites.ts
```

### Step 2: Verify Migration Status

```bash
# Check migration log
npm run knex migrate:list

# Expected output:
# Batch 1 - completed
# 0007_create_sites_table.ts
# 0007a_rename_old_tables.ts
# ...
```

### Step 3: Verify Table Creation

```sql
-- List all new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('sites', 'layouts', 'zones', 'assets', 'templates', 'share_links')
ORDER BY table_name;

-- Expected: 6 rows (all tables exist)

-- Check table structures
\d sites
\d layouts
\d zones
\d assets
\d templates
\d share_links
```

### Step 4: Verify Data Migration

```sql
-- Verify venues → sites migration
SELECT 
  v.id as venue_id,
  v.name as venue_name,
  s.id as site_id,
  s.name as site_name,
  s.location,
  s.bbox
FROM venues v
LEFT JOIN sites s ON v.name = s.name
ORDER BY v.id;

-- Expected: All venues have matching sites

-- Count records
SELECT 
  (SELECT COUNT(*) FROM venues) as venues_count,
  (SELECT COUNT(*) FROM sites) as sites_count;
-- Expected: Equal counts
```

### Step 5: Verify Indexes

```sql
-- Check GIST spatial indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexdef LIKE '%USING gist%'
ORDER BY tablename;

-- Expected indexes:
-- idx_sites_location (sites)
-- idx_zones_boundary (zones)
-- idx_assets_geometry (assets)

-- Check GIN array index
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexdef LIKE '%USING gin%' AND tablename = 'templates';

-- Expected: idx_templates_tags
```

### Step 6: Verify Constraints

```sql
-- Check foreign key constraints
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('sites', 'layouts', 'zones', 'assets', 'share_links')
ORDER BY tc.table_name, kcu.column_name;

-- Expected cascade deletes:
-- sites.club_id → clubs.id (CASCADE)
-- layouts.site_id → sites.id (CASCADE)
-- zones.layout_id → layouts.id (CASCADE)
-- assets.layout_id → layouts.id (CASCADE)
-- share_links.layout_id → layouts.id (CASCADE)

-- Check PostGIS constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid IN ('zones'::regclass, 'assets'::regclass)
  AND contype = 'c'
ORDER BY conrelid, conname;

-- Expected constraints:
-- zones: chk_valid_boundary (ST_IsValid)
-- zones: chk_max_area (area_sqm <= 10000000)
-- assets: chk_geometry_type (ST_Point or ST_LineString)
```

## Post-Migration Tasks

### 1. Run Seed Data (Optional)

```bash
# Seed realistic test data
npm run db:seed

# Expected output:
# Ran 6 seed files
# - Created 3 sites (from venues)
# - Created 6 layouts
# - Created 18 zones
# - Created 36 assets
# - Created 3 templates
# - Created 3 share links
```

### 2. Run Integration Tests

```bash
# Validate schema with integration tests
npm test -- tests/integration/schema.validation.test.ts

# Expected: 38 tests passing
```

### 3. Update Application Code

Update services/controllers to use new tables:

```typescript
// OLD: venues
const venues = await knex('venues').select('*');

// NEW: sites with PostGIS
const sites = await knex('sites')
  .select(
    'id',
    'name',
    knex.raw('ST_X(location::geometry) as lon'),
    knex.raw('ST_Y(location::geometry) as lat')
  );
```

## Rollback Procedure

If migration fails or needs to be reverted:

### Option 1: Rollback Last Batch

```bash
# Rollback the most recent batch
npm run db:rollback

# This will:
# 1. Drop all 6 new tables (sites, layouts, zones, assets, templates, share_links)
# 2. Restore old layouts/templates from _deprecated tables
# 3. Remove knex_migrations entries for batch
```

### Option 2: Rollback to Specific Migration

```bash
# Rollback to a specific migration
npx knex migrate:down 0013_migrate_venues_to_sites.ts

# Rollback multiple migrations
npx knex migrate:down
npx knex migrate:down
# (repeat as needed)
```

### Option 3: Full Database Restore

```bash
# Restore from backup (CAUTION: loses all changes since backup)
psql -U postgres -d plottr_dev < backup_20251020_120000.sql
```

### Verify Rollback

```sql
-- Check tables no longer exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('sites', 'layouts', 'zones', 'assets', 'templates', 'share_links');

-- Expected: 0 rows

-- Check old tables restored
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('layouts', 'templates');

-- Expected: 2 rows (old tables restored)
```

## Migration File Details

### 0007_create_sites_table.ts
**Purpose:** Create sites table with PostGIS location/bbox  
**Key Features:**
- `location geography(POINT, 4326)` for site center
- `bbox geography(POLYGON, 4326)` for site boundary
- GIST spatial index on location
- Foreign key to clubs with CASCADE delete

**Rollback:** Drops sites table and indexes

### 0007a_rename_old_tables.ts
**Purpose:** Preserve existing layouts/templates data  
**Key Features:**
- Renames `layouts` → `layouts_deprecated`
- Renames `templates` → `templates_deprecated`
- Preserves all data (5 old pitch templates)

**Rollback:** Restores original table names

### 0008_create_layouts_table.ts
**Purpose:** Create new layouts table for field configurations  
**Key Features:**
- Version tokens (UUID) for optimistic concurrency
- `created_by` tracks Clerk user ID
- Partial index on `is_published = TRUE`
- Foreign key to sites with CASCADE delete

**Rollback:** Drops layouts table and indexes

### 0009_create_zones_table.ts
**Purpose:** Create zones table for field areas  
**Key Features:**
- `boundary geography(POLYGON, 4326)` for zone shape
- ST_IsValid constraint (no self-intersecting polygons)
- Max area constraint (10,000,000 m²)
- GIST spatial index on boundary

**Rollback:** Drops zones table and indexes

### 0010_create_assets_table.ts
**Purpose:** Create assets table for point/linear objects  
**Key Features:**
- `geometry geography(GEOMETRY, 4326)` for flexible geometry
- Constraint: only ST_Point or ST_LineString allowed
- JSONB `properties` for flexible metadata
- GIST spatial index on geometry

**Rollback:** Drops assets table and indexes

### 0011_create_templates_table.ts
**Purpose:** Create templates table for reusable layouts  
**Key Features:**
- `tags TEXT[]` for categorization (e.g., ['soccer', 'training'])
- GIN index on tags for fast array searches
- JSONB `preview_geometry` for layout snapshots
- Usage count tracking

**Rollback:** Drops templates table and indexes

### 0012_create_share_links_table.ts
**Purpose:** Create share_links table for shareable URLs  
**Key Features:**
- Unique 12-character `slug`
- Optional expiration timestamp
- Partial indexes on active/expiring links
- Access count tracking

**Rollback:** Drops share_links table and indexes

### 0013_migrate_venues_to_sites.ts
**Purpose:** Migrate existing venue data to sites table  
**Key Features:**
- Copies all venues to sites
- Preserves club_id, name, address, coordinates
- Generates new UUIDs for version_token
- Preserves timestamps

**Rollback:** Deletes all migrated sites

## Troubleshooting

See [Troubleshooting Guide](./0001-troubleshooting.md) for common issues and solutions.

## Performance Considerations

### Index Usage

The migration creates 19 indexes:
- 3 GIST spatial indexes (sites.location, zones.boundary, assets.geometry)
- 1 GIN array index (templates.tags)
- 3 partial indexes (layouts, share_links)
- 12 B-tree indexes (foreign keys, timestamps, lookups)

**Impact:**
- Slower writes (indexes must be updated)
- Faster reads (queries use indexes)
- Additional disk space (~10-20% overhead)

### PostGIS Performance

Geography operations are slower than geometry but more accurate:
- `ST_Distance(geography, geography)` uses haversine formula (meters)
- `ST_Area(geography)` calculates actual surface area (m²)
- GIST indexes optimize spatial queries

**Optimization Tips:**
- Use `geography` for global data (lat/lon coordinates)
- Use `geometry` for local projections (planar coordinates)
- Create GIST indexes on all spatial columns used in WHERE clauses

## Migration Timeline

| Migration | Estimated Time | Notes |
|-----------|----------------|-------|
| 0007 | 0.5s | Create sites table + indexes |
| 0007a | 0.2s | Rename old tables |
| 0008 | 0.3s | Create layouts table + indexes |
| 0009 | 0.4s | Create zones table + indexes |
| 0010 | 0.4s | Create assets table + indexes |
| 0011 | 0.3s | Create templates table + indexes |
| 0012 | 0.3s | Create share_links table + indexes |
| 0013 | 0.5-2s | Migrate venues data (depends on row count) |
| **Total** | **3-5 seconds** | For typical development database |

Production databases with large datasets may take longer.

## Support

For issues or questions:
1. Check [Troubleshooting Guide](./0001-troubleshooting.md)
2. Review migration logs: `npm run knex migrate:list`
3. Verify PostGIS installation: `SELECT PostGIS_Version();`
4. Check database logs: `tail -f /var/log/postgresql/postgresql-16-main.log`

---

**Related Documentation:**
- [Schema Diagram](./0001-schema-diagram.md)
- [PostGIS Functions](./0001-postgis-functions.md)
- [Troubleshooting](./0001-troubleshooting.md)
