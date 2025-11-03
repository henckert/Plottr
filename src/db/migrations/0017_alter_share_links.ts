import { Knex } from 'knex';

/**
 * Migration: Alter share_links table
 * 
 * Changes:
 * 1. Make created_by nullable (optional user tracking)
 * 2. Extend slug from 12 to 20 characters (support longer slugs)
 */

export async function up(knex: Knex): Promise<void> {
  // Alter created_by to be nullable
  await knex.schema.alterTable('share_links', (table) => {
    table.string('created_by', 100).nullable().alter();
  });

  // Extend slug column length (constraint already exists, just alter the column type)
  await knex.schema.raw(`
    ALTER TABLE share_links ALTER COLUMN slug TYPE VARCHAR(20);
  `);

  console.log('✓ Altered share_links: created_by nullable, slug extended to 20 chars');
}

export async function down(knex: Knex): Promise<void> {
  // Revert slug to 12 characters
  await knex.schema.raw(`
    ALTER TABLE share_links ALTER COLUMN slug TYPE VARCHAR(12);
  `);

  // Revert created_by to NOT NULL (this may fail if there are NULL values)
  await knex.schema.alterTable('share_links', (table) => {
    table.string('created_by', 100).notNullable().alter();
  });

  console.log('✓ Reverted share_links: slug back to 12 chars, created_by NOT NULL');
}
