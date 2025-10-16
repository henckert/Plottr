import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('sessions').del();

  // Inserts seed entries
  await knex('sessions').insert([
    {
      id: 1,
      team_id: 1,
      venue_id: 1,
      pitch_id: 1,
      segment_id: null,
      start_ts: new Date(Date.now() + 86400000),
      end_ts: new Date(Date.now() + 90000000),
      notes: 'Monday Morning Practice',
      share_token: 'share_abc123def456',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      team_id: 1,
      venue_id: 1,
      pitch_id: 2,
      segment_id: null,
      start_ts: new Date(Date.now() + 432000000),
      end_ts: new Date(Date.now() + 435600000),
      notes: 'Friday Evening Match',
      share_token: 'share_ghi789jkl012',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      team_id: 2,
      venue_id: 2,
      pitch_id: 3,
      segment_id: null,
      start_ts: new Date(Date.now() + 604800000),
      end_ts: new Date(Date.now() + 608400000),
      notes: 'Sunday Scrimmage',
      share_token: 'share_mno345pqr678',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Reset sequence to next available ID
  await knex.raw('SELECT setval(\'sessions_id_seq\', 4)');
}
