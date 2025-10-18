import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add Clerk integration columns to users table
  await knex.schema.alterTable('users', (table) => {
    // Add clerk_id (unique identifier from Clerk)
    table.string('clerk_id').unique().notNullable();
    // Add tier system for subscription/usage tiers
    table.enu('tier', ['free', 'paid_individual', 'club_admin', 'admin']).notNullable().defaultTo('free');
    // Add is_active for soft deletions and suspensions
    table.boolean('is_active').notNullable().defaultTo(true);
  });

  // Create index for clerk_id lookups
  await knex.raw('CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users(clerk_id)');
}

export async function down(knex: Knex): Promise<void> {
  // Drop the index first
  await knex.raw('DROP INDEX IF EXISTS users_clerk_id_idx');
  
  // Remove columns
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_active');
    table.dropColumn('tier');
    table.dropColumn('clerk_id');
  });
}
