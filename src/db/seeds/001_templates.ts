import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
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

  const templates = [
    { template_id: 'rugby-full', name: 'Rugby (100x70)', meta: { length_m: 100, width_m: 70, sport: 'rugby' } },
    { template_id: 'rugby-mini', name: 'Mini Rugby (60x35)', meta: { length_m: 60, width_m: 35, sport: 'rugby' } },
    { template_id: 'soccer-11', name: 'Soccer 11v11 (105x68)', meta: { length_m: 105, width_m: 68, sport: 'soccer' } },
    { template_id: 'soccer-9', name: 'Soccer 9v9 (70x50)', meta: { length_m: 70, width_m: 50, sport: 'soccer' } },
    { template_id: 'gaa-full', name: 'GAA Full', meta: { sport: 'gaa' } },
  ];

  for (const t of templates) {
    const existing = await knex('templates').where('template_id', t.template_id).first();
    if (!existing) {
      await knex('templates').insert({ template_id: t.template_id, name: t.name, meta: JSON.stringify(t.meta) });
    }
  }
}
