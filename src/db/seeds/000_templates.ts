import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete in reverse FK order
  await knex('templates').del();

  const templates = [
    { template_id: 'rugby-full', name: 'Rugby (100x70)', meta: { length_m: 100, width_m: 70, sport: 'rugby' } },
    { template_id: 'rugby-mini', name: 'Mini Rugby (60x35)', meta: { length_m: 60, width_m: 35, sport: 'rugby' } },
    { template_id: 'soccer-11', name: 'Soccer 11v11 (105x68)', meta: { length_m: 105, width_m: 68, sport: 'soccer' } },
    { template_id: 'soccer-9', name: 'Soccer 9v9 (70x50)', meta: { length_m: 70, width_m: 50, sport: 'soccer' } },
    { template_id: 'gaa-full', name: 'GAA Full', meta: { sport: 'gaa' } },
  ];

  for (const t of templates) {
    await knex('templates').insert({ 
      template_id: t.template_id, 
      name: t.name, 
      meta: JSON.stringify(t.meta),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}
