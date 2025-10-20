import { Knex } from 'knex';

/**
 * Migration: Create assets table with PostGIS geometry (POINT or LINESTRING only)
 * 
 * Assets represent individual objects within a layout (e.g., goals, cones, lines, markers).
 * Unlike zones (which use POLYGON), assets use POINT or LINESTRING geometry.
 * 
 * Key Features:
 * - PostGIS geometry (POINT or LINESTRING only, not POLYGON)
 * - JSONB properties for flexible metadata (color, size, notes, etc.)
 * - Constraint: chk_geometry_type enforces only POINT/LINESTRING
 * - GIST spatial index for geometry queries
 * - Asset types: 'goal', 'cone', 'line', 'marker', 'flag', 'bench', etc.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.integer('layout_id').notNullable()
      .references('id').inTable('layouts').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('asset_type', 50).notNullable(); // 'goal', 'cone', 'line', 'marker', etc.
    table.jsonb('properties'); // Flexible metadata: { color, size_m, width_m, notes, etc. }
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Add PostGIS geometry column (POINT or LINESTRING only)
  await knex.raw(`
    ALTER TABLE assets 
    ADD COLUMN geometry geography(GEOMETRY, 4326) NOT NULL
  `);

  // Constraint: Only POINT or LINESTRING allowed (no POLYGON, MULTIPOINT, etc.)
  await knex.raw(`
    ALTER TABLE assets
    ADD CONSTRAINT chk_geometry_type CHECK (
      ST_GeometryType(geometry::geometry) IN ('ST_Point', 'ST_LineString')
    )
  `);

  // Create indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_assets_layout_id ON assets(layout_id);
    CREATE INDEX idx_assets_geometry ON assets USING GIST(geometry);
    CREATE INDEX idx_assets_type ON assets(asset_type);
  `);

  console.log('✓ Created assets table with PostGIS geometry (POINT/LINESTRING only) and GIST index');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('assets');
  console.log('✓ Dropped assets table');
}
