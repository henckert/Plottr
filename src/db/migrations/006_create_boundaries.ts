/**
 * Create boundaries table for storing imported geometries
 * 
 * Stores user-imported polygon boundaries with:
 * - PostGIS geometry column for spatial queries
 * - Accurate area calculation (sq meters)
 * - Bounding box for fast filtering
 * - Usage tracking per user per month
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('boundaries', (table) => {
    table.increments('id').primary();
    
    // User reference
    table.text('user_id').notNullable().index();
    
    // File metadata
    table.text('file_name').nullable();
    table.text('file_mime_type').nullable();
    
    // Geometry: stored as WGS84 (SRID 4326)
    // Using GEOMETRY type to allow any polygon
    table.specificType('geometry', 'geometry(Polygon,4326)').notNullable();
    
    // Area calculation (in square meters, using geodetic calculation)
    table.decimal('area_m2', 15, 2).notNullable();
    
    // Bounding box: [minLng, minLat, maxLng, maxLat]
    table.json('bbox').notNullable(); // [number, number, number, number]
    
    // Validation metadata
    table.boolean('is_valid').notNullable().defaultTo(true);
    table.text('validation_errors').nullable(); // If invalid, store reason
    table.json('warnings').nullable(); // [string] - e.g., "Multiple polygons, used first"
    
    // Audit fields
    table.timestamp('imported_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes for common queries
    table.index(['user_id', 'created_at'], 'idx_boundaries_user_date');
    table.index('user_id', 'idx_boundaries_user');
    
    // Spatial index for geometry queries (PostGIS GIST)
    // Note: Knex doesn't have built-in support, so we'll create via raw SQL in seed
  });

  // Create spatial index using raw SQL
  return knex.raw('CREATE INDEX idx_boundaries_geometry ON boundaries USING GIST(geometry);');
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('boundaries');
}
