import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('templates');
  if (!exists) {
    await knex.schema.createTable('templates', (table) => {
      table.increments('id').primary();
      table.string('template_id').notNullable().unique();
      table.string('name').notNullable();
      table.jsonb('meta');
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
}
