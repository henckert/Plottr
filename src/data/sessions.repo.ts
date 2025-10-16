import { getKnex } from './knex';

export class SessionsRepo {
  private knex = getKnex();

  async listAll() {
    return this.knex('sessions').select('*');
  }

  async getById(id: number) {
    const row = await this.knex('sessions').where({ id }).first();
    return row || null;
  }

  async create(payload: any) {
    const [created] = await this.knex('sessions').insert(payload).returning('*');
    return created;
  }
}
