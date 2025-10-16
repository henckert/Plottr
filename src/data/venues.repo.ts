import { getKnex } from './knex';

export class VenuesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll() {
    return this.knex('venues').select('*');
  }

  async getById(id: number) {
    const row = await this.knex('venues').where({ id }).first();
    return row || null;
  }

  async create(payload: any) {
    const [created] = await this.knex('venues').insert(payload).returning('*');
    return created;
  }
}
