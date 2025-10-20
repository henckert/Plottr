import { Knex } from 'knex';

/**
 * Migration: Add version_token to zones table
 * 
 * Adds optimistic locking support to zones table matching layouts pattern.
 * The version_token is used in PUT/DELETE requests via If-Match headers
 * to prevent concurrent modifications.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('zones', (table) => {
    table.uuid('version_token').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
  });

  console.log('✓ Added version_token column to zones table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('zones', (table) => {
    table.dropColumn('version_token');
  });

  console.log('✓ Removed version_token column from zones table');
}
