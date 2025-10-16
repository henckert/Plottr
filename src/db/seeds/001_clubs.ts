import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('clubs').del();

  // Inserts seed entries
  await knex('clubs').insert([
    {
      id: 1,
      name: 'Riverside Rugby Club',
      slug: 'riverside-rugby-club',
      country: 'IE',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      name: 'Central City Sports',
      slug: 'central-city-sports',
      country: 'IE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
