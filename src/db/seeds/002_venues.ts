import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('venues').del();

  // Inserts seed entries using ST_GeomFromText for PostGIS geometry
  await knex('venues').insert([
    {
      id: 1,
      club_id: 1,
      name: 'Riverside Park',
      address: '123 River Road, Dublin 4, Ireland',
      center_point: knex.raw("ST_GeomFromText('POINT(-6.2603 53.3498)', 4326)"),
      bbox: knex.raw("ST_GeomFromText('POLYGON((-6.2610 53.3490, -6.2596 53.3490, -6.2596 53.3506, -6.2610 53.3506, -6.2610 53.3490))', 4326)"),
      tz: 'Europe/Dublin',
      published: true,
      version_token: 'v001_river_001',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      club_id: 2,
      name: 'Central Sports Complex',
      address: '456 Main Street, Cork, Ireland',
      center_point: knex.raw("ST_GeomFromText('POINT(-8.4772 51.8985)', 4326)"),
      bbox: knex.raw("ST_GeomFromText('POLYGON((-8.4780 51.8977, -8.4764 51.8977, -8.4764 51.8993, -8.4780 51.8993, -8.4780 51.8977))', 4326)"),
      tz: 'Europe/Dublin',
      published: false,
      version_token: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      club_id: 1,
      name: 'Willow Field',
      address: '789 Willow Lane, Galway, Ireland',
      center_point: knex.raw("ST_GeomFromText('POINT(-9.2597 53.2707)', 4326)"),
      bbox: knex.raw("ST_GeomFromText('POLYGON((-9.2605 53.2699, -9.2589 53.2699, -9.2589 53.2715, -9.2605 53.2715, -9.2605 53.2699))', 4326)"),
      tz: 'Europe/Dublin',
      published: true,
      version_token: 'v001_willow_001',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
