import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add version_token column to pitches table
  await knex.schema.alterTable('pitches', (table) => {
    table.string('version_token');
  });

  // Add version_token column to sessions table
  await knex.schema.alterTable('sessions', (table) => {
    table.string('version_token');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove version_token column from pitches table
  await knex.schema.alterTable('pitches', (table) => {
    table.dropColumn('version_token');
  });

  // Remove version_token column from sessions table
  await knex.schema.alterTable('sessions', (table) => {
    table.dropColumn('version_token');
  });
}
