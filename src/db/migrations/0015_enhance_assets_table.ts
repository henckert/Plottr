import { Knex } from 'knex';

/**
 * Migration: Add missing fields to assets table
 * 
 * Adds:
 * - zone_id: Optional FK to zones table (assets can belong to a specific zone)
 * - icon: FontAwesome icon name for visual representation
 * - rotation_deg: Rotation angle (0-360) for oriented assets
 * - version_token: For optimistic concurrency control
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    // Optional zone reference (assets can be placed in specific zones or floating)
    table.integer('zone_id')
      .nullable()
      .references('id').inTable('zones').onDelete('SET NULL');
    
    // FontAwesome icon name (e.g., 'fa-futbol', 'fa-flag')
    table.string('icon', 50).nullable();
    
    // Rotation angle in degrees (0-360) for oriented icons/assets
    table.decimal('rotation_deg', 5, 2).nullable(); // e.g., 45.50
    
    // Version token for optimistic concurrency
    table.string('version_token', 100).notNullable()
      .defaultTo(knex.raw(`'asset-' || extract(epoch from now())::text || '-' || substr(md5(random()::text), 1, 9)`));
  });

  // Create index on zone_id for filtering
  await knex.raw(`CREATE INDEX idx_assets_zone_id ON assets(zone_id) WHERE zone_id IS NOT NULL`);

  console.log('✓ Added zone_id, icon, rotation_deg, and version_token to assets table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('zone_id');
    table.dropColumn('icon');
    table.dropColumn('rotation_deg');
    table.dropColumn('version_token');
  });

  await knex.raw(`DROP INDEX IF EXISTS idx_assets_zone_id`);

  console.log('✓ Removed zone_id, icon, rotation_deg, and version_token from assets table');
}
