import { Knex } from 'knex';

/**
 * Migration: Create share_links table
 * 
 * Share links enable users to share layouts via short, unique URLs.
 * Each share link has a slug (e.g., "abc123xyz"), optional expiry, and access tracking.
 * 
 * Key Features:
 * - Unique slug for URL generation (e.g., /share/abc123xyz)
 * - Optional expiry timestamp (NULL = permanent link)
 * - Revocation support (is_revoked flag)
 * - Access count tracking for analytics
 * - Last accessed timestamp for activity monitoring
 * - Partial indexes for active links and expiry checks
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('share_links', (table) => {
    table.increments('id').primary();
    table.integer('layout_id').notNullable()
      .references('id').inTable('layouts').onDelete('CASCADE');
    table.string('slug', 12).notNullable().unique(); // e.g., "a1B2c3D4e5F6"
    table.timestamp('expires_at', { useTz: true }); // NULL = no expiry
    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.integer('access_count').notNullable().defaultTo(0);
    table.string('created_by', 100).notNullable(); // Clerk user ID
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_accessed_at', { useTz: true });
  });

  // Create indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_share_links_slug ON share_links(slug) WHERE is_revoked = FALSE;
    CREATE INDEX idx_share_links_layout_id ON share_links(layout_id);
    CREATE INDEX idx_share_links_expires_at ON share_links(expires_at) WHERE expires_at IS NOT NULL;
  `);

  console.log('✓ Created share_links table with unique slug and partial indexes');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('share_links');
  console.log('✓ Dropped share_links table');
}
