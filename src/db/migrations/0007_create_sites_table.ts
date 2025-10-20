import { Knex } from 'knex';

/**
 * Migration: Create sites table with PostGIS geography columns
 * 
 * Sites represent physical locations where field layouts are created.
 * Replaces the venues table with better geospatial support.
 * 
 * Key Features:
 * - PostGIS location (POINT) for geocoding/map display
 * - PostGIS bbox (POLYGON) for bounding box queries
 * - Foreign key to clubs table with CASCADE delete
 * - Version tokens for optimistic concurrency
 * - GIST spatial index for location queries
 */

export async function up(knex: Knex): Promise<void> {
  // Ensure PostGIS extension is available
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  // Create sites table
  await knex.schema.createTable('sites', (table) => {
    table.increments('id').primary();
    table.integer('club_id').notNullable()
      .references('id').inTable('clubs').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('address');
    table.string('city', 100);
    table.string('state', 50);
    table.string('country', 50).defaultTo('USA');
    table.string('postal_code', 20);
    table.uuid('version_token').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }); // Soft delete support
  });

  // Add PostGIS geography columns
  // Using geography type for WGS84 lat/lon accuracy (meters, not degrees)
  await knex.raw(`
    ALTER TABLE sites 
    ADD COLUMN location geography(POINT, 4326),
    ADD COLUMN bbox geography(POLYGON, 4326)
  `);

  // Create indexes
  await knex.raw(`
    CREATE INDEX idx_sites_club_id ON sites(club_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_sites_location ON sites USING GIST(location) WHERE deleted_at IS NULL;
    CREATE INDEX idx_sites_updated_at ON sites(updated_at DESC) WHERE deleted_at IS NULL;
  `);

  console.log('✓ Created sites table with PostGIS geography columns');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sites');
  console.log('✓ Dropped sites table');
}
