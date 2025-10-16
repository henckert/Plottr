import { getKnex } from './knex';

export class PitchesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll(venueId?: number) {
    const q = this.knex('pitches').select('*');
    if (venueId) q.where({ venue_id: venueId });
    return q;
  }

  async getById(id: number) {
    const row = await this.knex('pitches').where({ id }).first();
    return row || null;
  }

  async create(payload: any) {
    const [created] = await this.knex('pitches').insert(payload).returning('*');
    return created;
  }
}
