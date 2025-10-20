import { Knex } from 'knex';

/**
 * Migration: Create templates table with JSONB and GIN indexes
 * 
 * Templates represent reusable field layout configurations that users can apply to new layouts.
 * Unlike the old templates (pitch templates), these store complete layout snapshots.
 * 
 * Key Features:
 * - JSONB preview_geometry stores snapshot of zones/assets for quick preview
 * - TEXT[] tags for categorization (e.g., ['soccer', 'training', '11v11'])
 * - GIN index on tags for fast array searches
 * - Usage count tracking for popularity sorting
 * - Public/private visibility control
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('templates', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.text('description');
    table.specificType('tags', 'TEXT[]'); // Array of keywords for search/filtering
    table.jsonb('preview_geometry').notNullable(); // Snapshot: { zones: [...], assets: [...] }
    table.boolean('is_public').notNullable().defaultTo(false);
    table.string('created_by', 100).notNullable(); // Clerk user ID
    table.integer('usage_count').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Create indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_templates_created_by ON templates(created_by);
    CREATE INDEX idx_templates_is_public ON templates(is_public) WHERE is_public = TRUE;
    CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
    CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC);
  `);

  console.log('✓ Created templates table with JSONB preview_geometry and GIN index on tags');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
  console.log('✓ Dropped templates table');
}
