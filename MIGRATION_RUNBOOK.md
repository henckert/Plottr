# Venues → Sites Migration Runbook

**Version:** 1.0  
**Date:** October 27, 2025  
**Migration Type:** Breaking Schema Change  
**Estimated Time:** 5-10 minutes  
**Rollback Available:** Yes (see Rollback Procedure)

---

## Overview

This runbook guides you through migrating from the legacy **Venues** schema to the new **Sites** schema. The Sites schema provides better separation of concerns, improved geospatial handling, and support for multi-layout field management.

### What's Changing?

| Old Schema (Venues) | New Schema (Sites) | Notes |
|---------------------|-------------------|-------|
| `venues` table | `sites` table | Renamed for clarity |
| `pitches` table | `layouts` table | Better reflects multi-sport usage |
| `sessions` table | No change | Still references layouts |
| `club_id` on venues | `club_id` on sites | Same ownership model |
| `bbox` (POLYGON) | `bbox` (POLYGON) | Same PostGIS geometry |
| `center_point` (POINT) | `location` (POINT) | Renamed for consistency |

### Why Migrate?

- **Better terminology:** "Sites" and "Layouts" are more intuitive than "Venues" and "Pitches"
- **Improved schema:** Cleaner separation between physical locations (sites) and field configurations (layouts)
- **New features:** Templates, zones, assets, share links (all depend on the Sites schema)
- **Future-proof:** Active development continues on Sites; Venues schema is deprecated

---

## Pre-Migration Checklist

Before starting, ensure:

- [ ] **Database backup created** (see Backup Procedure below)
- [ ] **No active users** on the platform (schedule maintenance window)
- [ ] **Migrations tested** in development/staging environment
- [ ] **Rollback plan ready** (see Rollback Procedure)
- [ ] **Team notified** of maintenance window

---

## Migration Procedure

### Step 1: Create Database Backup

```bash
# PostgreSQL dump
pg_dump -h localhost -U postgres -d plottr_prod > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_migration_*.sql
```

### Step 2: Run Knex Migrations

The migration is handled by Knex migration `0013_migrate_venues_to_sites.ts`.

```bash
# From project root
cd /path/to/plottr

# Run migrations (includes 0013_migrate_venues_to_sites.ts)
npm run db:migrate

# Expected output:
# Batch 2 run: 1 migrations
# ✓ 0013_migrate_venues_to_sites.ts
```

### Step 3: Verify Data Migration

Run the following SQL queries to verify data integrity:

```sql
-- 1. Check row counts match
SELECT 
  (SELECT COUNT(*) FROM venues) as venues_count,
  (SELECT COUNT(*) FROM sites) as sites_count;
-- Expected: Both counts should be equal

-- 2. Verify all venues have corresponding sites
SELECT v.id, v.name, s.id, s.name
FROM venues v
LEFT JOIN sites s ON v.id = s.id
WHERE s.id IS NULL;
-- Expected: 0 rows (all venues mapped to sites)

-- 3. Verify pitches → layouts migration
SELECT 
  (SELECT COUNT(*) FROM pitches) as pitches_count,
  (SELECT COUNT(*) FROM layouts) as layouts_count;
-- Expected: Both counts should be equal

-- 4. Check sessions still reference layouts correctly
SELECT COUNT(*) 
FROM sessions s
LEFT JOIN layouts l ON s.pitch_id = l.id
WHERE s.pitch_id IS NOT NULL AND l.id IS NULL;
-- Expected: 0 rows (all session references valid)

-- 5. Verify geometry data preserved
SELECT 
  v.id,
  ST_Equals(v.bbox, s.bbox) AS bbox_match,
  ST_Equals(v.center_point, s.location) AS location_match
FROM venues v
JOIN sites s ON v.id = s.id;
-- Expected: All rows show TRUE for both columns
```

### Step 4: Update Application Code

If you have hardcoded references to `venues` or `pitches` tables in application code:

```diff
// Update API calls
- await fetch('/api/venues')
+ await fetch('/api/sites')

- await fetch('/api/pitches')
+ await fetch('/api/layouts')

// Update database queries (if using raw SQL)
- SELECT * FROM venues WHERE club_id = ?
+ SELECT * FROM sites WHERE club_id = ?

- SELECT * FROM pitches WHERE venue_id = ?
+ SELECT * FROM layouts WHERE site_id = ?
```

### Step 5: Test Application

```bash
# Backend tests
npm test

# Frontend tests
cd web
npm test

# Integration tests
npm run test:integration

# Manual smoke test checklist:
# [ ] Sites list loads
# [ ] Can create new site
# [ ] Can edit existing site
# [ ] Layouts display correctly
# [ ] Sessions still work
# [ ] Maps render with correct geometry
```

---

## Rollback Procedure

If migration fails or issues are discovered:

### Option 1: Rollback Knex Migration

```bash
# Rollback last migration batch
npm run db:rollback

# Verify rollback
npm run db:status
# Expected: 0013_migrate_venues_to_sites.ts should NOT appear in "Completed" list
```

### Option 2: Restore from Backup

```bash
# Drop database
psql -h localhost -U postgres -c "DROP DATABASE plottr_prod;"

# Recreate database
psql -h localhost -U postgres -c "CREATE DATABASE plottr_prod;"

# Restore from backup
psql -h localhost -U postgres -d plottr_prod < backup_pre_migration_YYYYMMDD_HHMMSS.sql

# Verify restoration
psql -h localhost -U postgres -d plottr_prod -c "SELECT COUNT(*) FROM venues;"
```

---

## Post-Migration Validation

After successful migration:

### 1. Verify Data Integrity

```sql
-- Count records
SELECT 
  'sites' as table_name, COUNT(*) as count FROM sites
UNION ALL
SELECT 'layouts', COUNT(*) FROM layouts
UNION ALL
SELECT 'zones', COUNT(*) FROM zones
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;
```

### 2. Check Foreign Key Constraints

```sql
-- Verify no orphaned records
SELECT 'layouts without sites' as issue, COUNT(*) as count
FROM layouts l
LEFT JOIN sites s ON l.site_id = s.id
WHERE s.id IS NULL
UNION ALL
SELECT 'zones without layouts', COUNT(*)
FROM zones z
LEFT JOIN layouts l ON z.layout_id = l.id
WHERE l.id IS NULL
UNION ALL
SELECT 'assets without layouts', COUNT(*)
FROM assets a
LEFT JOIN layouts l ON a.layout_id = l.id
WHERE l.id IS NULL;

-- Expected: All counts should be 0
```

### 3. Test Spatial Queries

```sql
-- Test PostGIS functions still work
SELECT 
  id,
  name,
  ST_AsText(location) as location_wkt,
  ST_Area(bbox::geography) / 1000000 as area_km2
FROM sites
LIMIT 5;

-- Test layout geometry
SELECT 
  id,
  name,
  ST_Area(geometry::geography) as area_m2,
  ST_Perimeter(geometry::geography) as perimeter_m
FROM layouts
WHERE geometry IS NOT NULL
LIMIT 5;
```

### 4. Application Health Check

```bash
# Hit health endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "ok": true,
#   "database": { "healthy": true },
#   "timestamp": "...",
#   "version": "..."
# }
```

---

## Migration Status Tracking

### Check Migration Status via SQL

```sql
-- Check if migration has run
SELECT * FROM knex_migrations 
WHERE name = '0013_migrate_venues_to_sites.ts';

-- If returned: Migration complete
-- If empty: Migration not yet run
```

### Check Migration Status via API

```bash
# GET /api/migration/status
curl http://localhost:3001/api/migration/status

# Response if migration needed:
# {
#   "needs_migration": true,
#   "venues_count": 5,
#   "sites_count": 0,
#   "message": "You have 5 venues that need to be migrated to sites"
# }

# Response if migration complete:
# {
#   "needs_migration": false,
#   "sites_count": 5,
#   "message": "Migration complete"
# }
```

---

## Common Issues & Troubleshooting

### Issue 1: Foreign Key Constraint Violations

**Error:** `violates foreign key constraint "sessions_pitch_id_foreign"`

**Cause:** Sessions table still references `pitches` table, but migration renamed it to `layouts`

**Solution:** The migration automatically updates the foreign key:

```sql
-- Migration handles this automatically, but if manual fix needed:
ALTER TABLE sessions 
DROP CONSTRAINT sessions_pitch_id_foreign;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_layout_id_foreign 
FOREIGN KEY (pitch_id) REFERENCES layouts(id) ON DELETE SET NULL;
```

### Issue 2: Duplicate IDs

**Error:** `duplicate key value violates unique constraint "sites_pkey"`

**Cause:** Sites table already has data (migration ran twice)

**Solution:** Drop sites/layouts tables and re-run migration:

```sql
-- CAUTION: This deletes existing sites/layouts data
TRUNCATE TABLE sites CASCADE;
TRUNCATE TABLE layouts CASCADE;

-- Then re-run migration
-- npm run db:migrate
```

### Issue 3: Missing PostGIS Extension

**Error:** `function st_equals(geography, geography) does not exist`

**Cause:** PostGIS extension not installed

**Solution:**

```sql
-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_Version();
```

### Issue 4: Geometry Type Mismatches

**Error:** `column "bbox" is of type geography but expression is of type geometry`

**Cause:** Geometry/Geography type confusion

**Solution:** Migration handles casting, but if manual fix needed:

```sql
-- Cast geometry to geography
UPDATE sites 
SET bbox = bbox::geography;

UPDATE sites 
SET location = location::geography;
```

---

## Manual Migration (Alternative)

If Knex migration fails, you can migrate manually:

### Step 1: Create Sites Table

```sql
-- Create sites table (same schema as venues)
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  location GEOGRAPHY(POINT, 4326),
  bbox GEOGRAPHY(POLYGON, 4326),
  tz TEXT DEFAULT 'UTC',
  published BOOLEAN DEFAULT false,
  version_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial indexes
CREATE INDEX idx_sites_location ON sites USING GIST(location);
CREATE INDEX idx_sites_bbox ON sites USING GIST(bbox);
CREATE INDEX idx_sites_club_id ON sites(club_id);
```

### Step 2: Copy Data from Venues

```sql
-- Copy all venues to sites
INSERT INTO sites (
  id, club_id, name, address, city, state, country, postal_code,
  location, bbox, tz, published, version_token, created_at, updated_at
)
SELECT 
  id, club_id, name, address, city, state, country, postal_code,
  center_point AS location,  -- Rename field
  bbox, tz, published, version_token, created_at, updated_at
FROM venues;

-- Verify row count matches
SELECT 
  (SELECT COUNT(*) FROM venues) as venues_count,
  (SELECT COUNT(*) FROM sites) as sites_count;
```

### Step 3: Create Layouts Table

```sql
-- Create layouts table (same schema as pitches)
CREATE TABLE IF NOT EXISTS layouts (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  geometry GEOGRAPHY(POLYGON, 4326),
  is_published BOOLEAN DEFAULT false,
  version_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_layouts_site_id ON layouts(site_id);
CREATE INDEX idx_layouts_geometry ON layouts USING GIST(geometry);
```

### Step 4: Copy Data from Pitches

```sql
-- Copy all pitches to layouts
INSERT INTO layouts (
  id, site_id, name, description, geometry, is_published,
  version_token, created_at, updated_at
)
SELECT 
  id, 
  venue_id AS site_id,  -- Rename field
  name,
  COALESCE(code, '') AS description,  -- Map code to description
  geometry,
  (status = 'published') AS is_published,  -- Convert enum to boolean
  version_token, created_at, updated_at
FROM pitches;

-- Verify row count matches
SELECT 
  (SELECT COUNT(*) FROM pitches) as pitches_count,
  (SELECT COUNT(*) FROM layouts) as layouts_count;
```

### Step 5: Update Sessions Foreign Key

```sql
-- Update foreign key constraint
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_pitch_id_foreign;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_layout_id_foreign 
FOREIGN KEY (pitch_id) REFERENCES layouts(id) ON DELETE SET NULL;
```

---

## Migration Checklist

After migration completes:

- [ ] **Data copied:** All venues → sites, all pitches → layouts
- [ ] **Row counts match:** `SELECT COUNT(*) FROM venues` = `SELECT COUNT(*) FROM sites`
- [ ] **Geometry preserved:** ST_Equals checks pass for bbox and location
- [ ] **Foreign keys updated:** Sessions reference layouts correctly
- [ ] **Indexes created:** GIST indexes on geography columns
- [ ] **Application tested:** Sites/layouts API endpoints work
- [ ] **Frontend tested:** UI displays sites and layouts correctly
- [ ] **Backup verified:** Rollback procedure tested in staging
- [ ] **Documentation updated:** README, API docs reference "sites" not "venues"
- [ ] **Old tables deprecated:** Add deprecation notice to venues/pitches tables

---

## Deprecation Timeline

| Date | Action |
|------|--------|
| **October 27, 2025** | Migration released, banner displayed to users |
| **November 1, 2025** | Automatic migration runs for all users on login |
| **December 1, 2025** | Venues/Pitches API endpoints return 410 Gone |
| **January 1, 2026** | Venues/Pitches tables dropped from database |

---

## Support

If you encounter issues during migration:

1. **Check logs:** `docker logs plottr-api` or `npm run logs`
2. **Verify database state:** Run validation SQL queries above
3. **Review migration code:** `src/db/migrations/0013_migrate_venues_to_sites.ts`
4. **Rollback if needed:** Follow Rollback Procedure above
5. **Contact support:** Open issue on GitHub or email support@plottr.io

---

## Related Documentation

- [Database Schema Documentation](./docs/database/SCHEMA.md)
- [Migration Guide](./docs/database/MIGRATION_GUIDE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Last Updated:** October 27, 2025  
**Maintainer:** Plottr Development Team  
**Version:** 1.0.0
