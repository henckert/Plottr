import { Knex } from 'knex';

/**
 * Migration: Create layouts table
 * 
 * Layouts represent field configurations at a specific site.
 * Multiple layouts can exist per site (e.g., training setup, match day, winter configuration).
 * 
 * Key Features:
 * - Foreign key to sites table with CASCADE delete
 * - Version tokens for optimistic concurrency control
 * - Creator tracking via Clerk user ID
 * - Published status for sharing/visibility control
 * - Indexes for common queries (by site, by creator, by publish status)
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('layouts', (table) => {
    table.increments('id').primary();
    table.integer('site_id').notNullable()
      .references('id').inTable('sites').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description');
    table.boolean('is_published').notNullable().defaultTo(false);
    table.uuid('version_token').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('created_by', 100).notNullable(); // Clerk user ID
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Create indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_layouts_site_id ON layouts(site_id);
    CREATE INDEX idx_layouts_created_by ON layouts(created_by);
    CREATE INDEX idx_layouts_updated_at ON layouts(updated_at DESC);
    CREATE INDEX idx_layouts_is_published ON layouts(is_published) WHERE is_published = TRUE;
  `);

  console.log('✓ Created layouts table with version tokens and indexes');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('layouts');
  console.log('✓ Dropped layouts table');
}
