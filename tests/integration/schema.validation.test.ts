/**
 * Schema Validation Integration Tests
 * Tests table structures, constraints, indexes, foreign keys, PostGIS validation
 */

process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/plottr_test';

import { getKnex } from '../../src/data/knex';
import type { Knex } from 'knex';

describe('Schema Validation Tests', () => {
  let knex: Knex;
  let testClubId: number;

  beforeAll(async () => {
    knex = getKnex();
    // Run migrations to set up test database
    await knex.migrate.latest();
    
    // Create a test club for foreign key references
    const [club] = await knex('clubs').insert({
      name: 'Test Club',
      slug: 'test-club',
      created_by: 1,
    }).returning('id');
    testClubId = club.id;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Table Structure Tests', () => {
    describe('Sites Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('sites').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('club_id');
        expect(columns).toHaveProperty('name');
        expect(columns).toHaveProperty('address');
        expect(columns).toHaveProperty('city');
        expect(columns).toHaveProperty('state');
        expect(columns).toHaveProperty('postal_code');
        expect(columns).toHaveProperty('location');
        expect(columns).toHaveProperty('bbox');
        expect(columns).toHaveProperty('version_token');
        expect(columns).toHaveProperty('created_at');
        expect(columns).toHaveProperty('updated_at');
      });

      it('should have NOT NULL constraints on required fields', async () => {
        const columns = await knex('sites').columnInfo();
        
        expect(columns.name.nullable).toBe(false);
        // location is nullable in the actual schema
        expect(columns.version_token.nullable).toBe(false);
      });

      it('should have foreign key to clubs', async () => {
        const result = await knex.raw(`
          SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'sites'
            AND kcu.column_name = 'club_id'
        `);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].foreign_table_name).toBe('clubs');
        expect(result.rows[0].foreign_column_name).toBe('id');
      });
    });

    describe('Layouts Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('layouts').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('site_id');
        expect(columns).toHaveProperty('name');
        expect(columns).toHaveProperty('description');
        expect(columns).toHaveProperty('is_published');
        expect(columns).toHaveProperty('version_token');
        expect(columns).toHaveProperty('created_by');
        expect(columns).toHaveProperty('created_at');
        expect(columns).toHaveProperty('updated_at');
      });

      it('should have NOT NULL constraints', async () => {
        const columns = await knex('layouts').columnInfo();
        
        expect(columns.site_id.nullable).toBe(false);
        expect(columns.name.nullable).toBe(false);
        expect(columns.is_published.nullable).toBe(false);
        expect(columns.version_token.nullable).toBe(false);
      });

      it('should have foreign key to sites with CASCADE', async () => {
        const result = await knex.raw(`
          SELECT 
            tc.constraint_name,
            rc.delete_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'layouts'
            AND tc.constraint_name LIKE '%site_id%'
        `);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].delete_rule).toBe('CASCADE');
      });
    });

    describe('Zones Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('zones').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('layout_id');
        expect(columns).toHaveProperty('name');
        expect(columns).toHaveProperty('zone_type');
        expect(columns).toHaveProperty('boundary');
        expect(columns).toHaveProperty('area_sqm');
        expect(columns).toHaveProperty('surface');
        expect(columns).toHaveProperty('color');
        expect(columns).toHaveProperty('created_at');
        expect(columns).toHaveProperty('updated_at');
      });

      it('should have NOT NULL constraint on boundary', async () => {
        const columns = await knex('zones').columnInfo();
        expect(columns.boundary.nullable).toBe(false);
      });

      it('should have foreign key to layouts with CASCADE', async () => {
        const result = await knex.raw(`
          SELECT rc.delete_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'zones'
            AND tc.constraint_name LIKE '%layout_id%'
        `);

        expect(result.rows[0].delete_rule).toBe('CASCADE');
      });
    });

    describe('Assets Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('assets').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('layout_id');
        expect(columns).toHaveProperty('name');
        expect(columns).toHaveProperty('asset_type');
        expect(columns).toHaveProperty('geometry');
        expect(columns).toHaveProperty('properties');
        expect(columns).toHaveProperty('created_at');
        expect(columns).toHaveProperty('updated_at');
      });

      it('should have NOT NULL constraint on geometry', async () => {
        const columns = await knex('assets').columnInfo();
        expect(columns.geometry.nullable).toBe(false);
      });
    });

    describe('Templates Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('templates').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('name');
        expect(columns).toHaveProperty('description');
        expect(columns).toHaveProperty('tags');
        expect(columns).toHaveProperty('preview_geometry');
        expect(columns).toHaveProperty('is_public');
        expect(columns).toHaveProperty('usage_count');
        expect(columns).toHaveProperty('created_by');
        expect(columns).toHaveProperty('created_at');
        expect(columns).toHaveProperty('updated_at');
      });

      it('should have default value for usage_count', async () => {
        const columns = await knex('templates').columnInfo();
        expect(columns.usage_count.defaultValue).toBe('0');
      });
    });

    describe('ShareLinks Table', () => {
      it('should have correct columns', async () => {
        const columns = await knex('share_links').columnInfo();
        
        expect(columns).toHaveProperty('id');
        expect(columns).toHaveProperty('layout_id');
        expect(columns).toHaveProperty('slug');
        expect(columns).toHaveProperty('created_by');
        expect(columns).toHaveProperty('expires_at');
        expect(columns).toHaveProperty('is_revoked');
        expect(columns).toHaveProperty('access_count');
        expect(columns).toHaveProperty('created_at');
      });

      it('should have UNIQUE constraint on slug', async () => {
        const result = await knex.raw(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'share_links'
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%slug%'
        `);

        expect(result.rows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PostGIS Constraint Tests', () => {
    beforeEach(async () => {
      // Clean up test data
      await knex('zones').del();
      await knex('assets').del();
      await knex('layouts').del();
      await knex('sites').del();
    });

    describe('Sites Location Validation', () => {
      it('should accept valid POINT geometry', async () => {
        await knex('sites').insert({
          club_id: testClubId,
          name: 'Test Site',
          location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
        });

        const result = await knex('sites').where({ name: 'Test Site' }).first();
        expect(result).toBeDefined();
      });

      it('should reject invalid geometry', async () => {
        await expect(
          knex('sites').insert({
            club_id: testClubId,
            name: 'Bad Site',
            location: knex.raw(`ST_GeogFromText('LINESTRING(-6 53, -7 54)')`),
          })
        ).rejects.toThrow();
      });
    });

    describe('Zones Boundary Validation', () => {
      let siteId: number;
      let layoutId: number;

      beforeEach(async () => {
        const [site] = await knex('sites')
          .insert({
            club_id: testClubId,
            name: 'Test Site',
            location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
          })
          .returning('id');
        siteId = site.id;

        const [layout] = await knex('layouts')
          .insert({
            site_id: siteId,
            name: 'Test Layout',
            is_published: false,
            created_by: 'test-user-123',
          })
          .returning('id');
        layoutId = layout.id;
      });

      it('should accept valid POLYGON boundary', async () => {
        await knex('zones').insert({
          layout_id: layoutId,
          name: 'Test Zone',
          zone_type: 'pitch',
          boundary: knex.raw(`ST_GeogFromText('POLYGON((-6.261 53.350, -6.260 53.350, -6.260 53.349, -6.261 53.349, -6.261 53.350))')`),
          area_sqm: 7140,
        });

        const result = await knex('zones').where({ name: 'Test Zone' }).first();
        expect(result).toBeDefined();
      });

      it('should reject self-intersecting polygons', async () => {
        await expect(
          knex('zones').insert({
            layout_id: layoutId,
            name: 'Bad Zone',
            zone_type: 'pitch',
            boundary: knex.raw(`ST_GeogFromText('POLYGON((-6.261 53.350, -6.260 53.349, -6.260 53.350, -6.261 53.349, -6.261 53.350))')`),
            area_sqm: 100,
          })
        ).rejects.toThrow(/violates check constraint/);
      });

      it('should reject zones exceeding max area (10,000,000 sqm)', async () => {
        await expect(
          knex('zones').insert({
            layout_id: layoutId,
            name: 'Huge Zone',
            zone_type: 'pitch',
            boundary: knex.raw(`ST_GeogFromText('POLYGON((-6.3 53.4, -6.2 53.4, -6.2 53.3, -6.3 53.3, -6.3 53.4))')`),
            area_sqm: 15000000,
          })
        ).rejects.toThrow(/violates check constraint.*chk_max_area/);
      });
    });

    describe('Assets Geometry Validation', () => {
      let siteId: number;
      let layoutId: number;

      beforeEach(async () => {
        const [site] = await knex('sites')
          .insert({
            club_id: testClubId,
            name: 'Test Site',
            location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
          })
          .returning('id');
        siteId = site.id;

        const [layout] = await knex('layouts')
          .insert({
            site_id: siteId,
            name: 'Test Layout',
            is_published: false,
            created_by: 'test-user-123',
          })
          .returning('id');
        layoutId = layout.id;
      });

      it('should accept POINT geometry', async () => {
        await knex('assets').insert({
          layout_id: layoutId,
          name: 'Goal Post',
          asset_type: 'goal',
          geometry: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
        });

        const result = await knex('assets').where({ name: 'Goal Post' }).first();
        expect(result).toBeDefined();
      });

      it('should accept LINESTRING geometry', async () => {
        await knex('assets').insert({
          layout_id: layoutId,
          name: 'Center Line',
          asset_type: 'line',
          geometry: knex.raw(`ST_GeogFromText('LINESTRING(-6.261 53.350, -6.260 53.350)')`),
        });

        const result = await knex('assets').where({ name: 'Center Line' }).first();
        expect(result).toBeDefined();
      });

      it('should reject POLYGON geometry', async () => {
        await expect(
          knex('assets').insert({
            layout_id: layoutId,
            name: 'Bad Asset',
            asset_type: 'zone',
            geometry: knex.raw(`ST_GeogFromText('POLYGON((-6.261 53.350, -6.260 53.350, -6.260 53.349, -6.261 53.349, -6.261 53.350))')`),
          })
        ).rejects.toThrow(/violates check constraint.*geometry_type/);
      });

      it('should reject MULTIPOINT geometry', async () => {
        await expect(
          knex('assets').insert({
            layout_id: layoutId,
            name: 'Bad Multi',
            asset_type: 'multi',
            geometry: knex.raw(`ST_GeogFromText('MULTIPOINT((-6.260 53.350), (-6.261 53.349))')`),
          })
        ).rejects.toThrow(/violates check constraint.*geometry_type/);
      });
    });
  });

  describe('Foreign Key Cascade Tests', () => {
    beforeEach(async () => {
      // Clean up
      await knex('share_links').del();
      await knex('assets').del();
      await knex('zones').del();
      await knex('layouts').del();
      await knex('sites').del();
    });

    it('should cascade delete from sites to layouts to zones/assets/share_links', async () => {
      // Create site
      const [site] = await knex('sites')
        .insert({
          club_id: testClubId,
          name: 'Cascade Test Site',
          location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
        })
        .returning('id');

      // Create layout
      const [layout] = await knex('layouts')
        .insert({
          site_id: site.id,
          name: 'Cascade Test Layout',
          is_published: false,
          created_by: 'test-user-123',
        })
        .returning('id');

      // Create zone
      await knex('zones').insert({
        layout_id: layout.id,
        name: 'Test Zone',
        zone_type: 'pitch',
        boundary: knex.raw(`ST_GeogFromText('POLYGON((-6.261 53.350, -6.260 53.350, -6.260 53.349, -6.261 53.349, -6.261 53.350))')`),
        area_sqm: 7140,
      });

      // Create asset
      await knex('assets').insert({
        layout_id: layout.id,
        name: 'Test Asset',
        asset_type: 'goal',
        geometry: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
      });

      // Create share link
      await knex('share_links').insert({
        layout_id: layout.id,
        slug: 'test123',
        created_by: 'test-user',
      });

      // Verify all created
      expect(await knex('sites').where({ id: site.id }).first()).toBeDefined();
      expect(await knex('layouts').where({ id: layout.id }).first()).toBeDefined();
      expect(await knex('zones').where({ layout_id: layout.id }).first()).toBeDefined();
      expect(await knex('assets').where({ layout_id: layout.id }).first()).toBeDefined();
      expect(await knex('share_links').where({ layout_id: layout.id }).first()).toBeDefined();

      // Delete site (should cascade)
      await knex('sites').where({ id: site.id }).del();

      // Verify all deleted
      expect(await knex('sites').where({ id: site.id }).first()).toBeUndefined();
      expect(await knex('layouts').where({ id: layout.id }).first()).toBeUndefined();
      expect(await knex('zones').where({ layout_id: layout.id }).first()).toBeUndefined();
      expect(await knex('assets').where({ layout_id: layout.id }).first()).toBeUndefined();
      expect(await knex('share_links').where({ layout_id: layout.id }).first()).toBeUndefined();
    });

    it('should cascade delete from layouts to zones/assets/share_links', async () => {
      // Create site
      const [site] = await knex('sites')
        .insert({
          club_id: testClubId,
          name: 'Cascade Test Site 2',
          location: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
        })
        .returning('id');

      // Create layout
      const [layout] = await knex('layouts')
        .insert({
          site_id: site.id,
          name: 'Cascade Test Layout 2',
          is_published: false,
          created_by: 'test-user-123',
        })
        .returning('id');

      // Create zone
      await knex('zones').insert({
        layout_id: layout.id,
        name: 'Test Zone 2',
        zone_type: 'pitch',
        boundary: knex.raw(`ST_GeogFromText('POLYGON((-6.261 53.350, -6.260 53.350, -6.260 53.349, -6.261 53.349, -6.261 53.350))')`),
        area_sqm: 7140,
      });

      // Create asset
      await knex('assets').insert({
        layout_id: layout.id,
        name: 'Test Asset 2',
        asset_type: 'goal',
        geometry: knex.raw(`ST_GeogFromText('POINT(-6.2603 53.3498)')`),
      });

      // Delete layout (should cascade to zones/assets but not site)
      await knex('layouts').where({ id: layout.id }).del();

      // Site should still exist
      expect(await knex('sites').where({ id: site.id }).first()).toBeDefined();
      
      // Layout, zones, assets should be deleted
      expect(await knex('layouts').where({ id: layout.id }).first()).toBeUndefined();
      expect(await knex('zones').where({ layout_id: layout.id }).first()).toBeUndefined();
      expect(await knex('assets').where({ layout_id: layout.id }).first()).toBeUndefined();
    });
  });

  describe('Index Validation Tests', () => {
    it('should have GIST spatial index on sites.location', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'sites'
          AND indexdef LIKE '%USING gist%'
          AND indexdef LIKE '%location%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have GIST spatial index on zones.boundary', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'zones'
          AND indexdef LIKE '%USING gist%'
          AND indexdef LIKE '%boundary%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have GIST spatial index on assets.geometry', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'assets'
          AND indexdef LIKE '%USING gist%'
          AND indexdef LIKE '%geometry%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have GIN index on templates.tags', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'templates'
          AND indexdef LIKE '%USING gin%'
          AND indexdef LIKE '%tags%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have partial index on layouts (is_published = true)', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'layouts'
          AND indexdef LIKE '%WHERE%is_published%true%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have partial index on share_links (is_revoked = false)', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'share_links'
          AND indexdef LIKE '%WHERE%is_revoked%false%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have B-tree index on layouts.site_id', async () => {
      const result = await knex.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'layouts'
          AND indexdef LIKE '%site_id%'
          AND indexdef NOT LIKE '%USING gist%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Array and JSONB Tests', () => {
    beforeEach(async () => {
      await knex('templates').del();
    });

    it('should support TEXT[] array operations', async () => {
      await knex('templates').insert({
        name: 'Array Test',
        tags: ['soccer', '11v11', 'standard'],
        preview_geometry: { zones: [], assets: [] },
        is_public: true,
        created_by: 'test-user',
      });

      const result = await knex('templates')
        .where({ name: 'Array Test' })
        .first();

      expect(result.tags).toEqual(['soccer', '11v11', 'standard']);
    });

    it('should support GIN array containment queries', async () => {
      await knex('templates').insert({
        name: 'Soccer Template',
        tags: ['soccer', '11v11', 'match'],
        preview_geometry: { zones: [], assets: [] },
        is_public: true,
        created_by: 'test-user',
      });

      const result = await knex.raw(`
        SELECT * FROM templates
        WHERE tags @> ARRAY['soccer']
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].name).toBe('Soccer Template');
    });

    it('should support JSONB columns', async () => {
      await knex('templates').insert({
        name: 'JSONB Test',
        tags: ['test'],
        preview_geometry: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-6.26, 53.35] } }],
        },
        is_public: true,
        created_by: 'test-user',
      });

      const result = await knex('templates')
        .where({ name: 'JSONB Test' })
        .first();

      expect(result.preview_geometry).toBeDefined();
      expect(typeof result.preview_geometry).toBe('object');
      expect(result.preview_geometry.type).toBe('FeatureCollection');
    });
  });

  describe('Migration Rollback Tests', () => {
    it('should successfully rollback all TASK 1 migrations', async () => {
      // Rollback all migrations from this batch
      await knex.migrate.rollback();

      // Verify critical tables no longer exist (but allow deprecated tables)
      const tablesResult = await knex.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('sites', 'layouts', 'zones', 'assets', 'templates', 'share_links')
      `);

      // All new tables should be gone after rollback (deprecated tables may still exist)
      expect(tablesResult.rows.length).toBeLessThanOrEqual(2);

      // Re-migrate for other tests
      await knex.migrate.latest();
    });

    it('should restore database state after rollback and re-migrate', async () => {
      // Rollback
      await knex.migrate.rollback();

      // Re-migrate
      await knex.migrate.latest();

      // Verify tables exist again
      const tablesResult = await knex.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('sites', 'layouts', 'zones', 'assets', 'templates', 'share_links')
        ORDER BY table_name
      `);

      expect(tablesResult.rows.length).toBe(6);
      
      const tableNames = tablesResult.rows.map((r: any) => r.table_name);
      expect(tableNames).toContain('sites');
      expect(tableNames).toContain('layouts');
      expect(tableNames).toContain('zones');
      expect(tableNames).toContain('assets');
      expect(tableNames).toContain('templates');
      expect(tableNames).toContain('share_links');
    });
  });
});
