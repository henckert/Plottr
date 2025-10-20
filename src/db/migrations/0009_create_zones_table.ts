import { Knex } from 'knex';

/**
 * Migration: Create zones table with PostGIS boundary polygons
 * 
 * Zones represent areas within a layout (e.g., pitches, training zones, goal areas).
 * Each zone has a PostGIS POLYGON boundary with validation constraints.
 * 
 * Key Features:
 * - PostGIS boundary (POLYGON) for zone geometry
 * - Computed area_sqm and perimeter_m from ST_Area/ST_Perimeter
 * - Validation: ST_IsValid ensures proper geometry
 * - Constraint: Max area 10 km² prevents accidental huge polygons
 * - GIST spatial index for boundary queries
 * - Zone types: 'pitch', 'goal_area', 'training_zone', 'penalty_area', etc.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('zones', (table) => {
    table.increments('id').primary();
    table.integer('layout_id').notNullable()
      .references('id').inTable('layouts').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('zone_type', 50).notNullable(); // 'pitch', 'goal_area', 'training_zone', etc.
    table.string('surface', 50); // 'grass', 'turf', 'clay', 'concrete'
    table.string('color', 7); // Hex color for rendering (e.g., '#22c55e')
    table.double('area_sqm'); // Computed from ST_Area(boundary)
    table.double('perimeter_m'); // Computed from ST_Perimeter(boundary)
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Add PostGIS boundary column (POLYGON geography type)
  await knex.raw(`
    ALTER TABLE zones 
    ADD COLUMN boundary geography(POLYGON, 4326) NOT NULL
  `);

  // Add validation constraints
  await knex.raw(`
    ALTER TABLE zones
    ADD CONSTRAINT chk_valid_boundary CHECK (ST_IsValid(boundary::geometry)),
    ADD CONSTRAINT chk_max_area CHECK (area_sqm IS NULL OR area_sqm <= 10000000)
  `);

  // Create indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_zones_layout_id ON zones(layout_id);
    CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);
    CREATE INDEX idx_zones_type ON zones(zone_type);
  `);

  console.log('✓ Created zones table with PostGIS boundary POLYGON and validation constraints');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('zones');
  console.log('✓ Dropped zones table');
}
