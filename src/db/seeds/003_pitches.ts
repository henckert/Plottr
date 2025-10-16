import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('pitches').del();

  // Inserts seed entries using ST_GeomFromText for PostGIS geometry
  await knex('pitches').insert([
    {
      id: 1,
      venue_id: 1,
      name: 'Pitch A',
      code: 'PA',
      sport: 'rugby',
      level: 'senior',
      geometry: knex.raw("ST_GeomFromText('POLYGON((-6.2603 53.3498, -6.2602 53.3498, -6.2602 53.3499, -6.2603 53.3499, -6.2603 53.3498))', 4326)"),
      rotation_deg: 0,
      template_id: '1',
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      venue_id: 1,
      name: 'Pitch B',
      code: 'PB',
      sport: 'rugby',
      level: 'youth',
      geometry: knex.raw("ST_GeomFromText('POLYGON((-6.2604 53.3497, -6.2603 53.3497, -6.2603 53.3498, -6.2604 53.3498, -6.2604 53.3497))', 4326)"),
      rotation_deg: 0,
      template_id: '1',
      status: 'published',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      venue_id: 2,
      name: 'Main Pitch',
      code: 'MP',
      sport: 'soccer',
      level: 'senior',
      geometry: knex.raw("ST_GeomFromText('POLYGON((-8.4772 51.8985, -8.4771 51.8985, -8.4771 51.8986, -8.4772 51.8986, -8.4772 51.8985))', 4326)"),
      rotation_deg: 15,
      template_id: '2',
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
