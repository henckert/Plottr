import { getKnex } from './knex';

export class SessionsRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

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

  async update(id: number, payload: any) {
    // Filter out undefined values so we don't update columns with null
    const updateData = Object.fromEntries(Object.entries(payload).filter(([_k, v]) => v !== undefined));
    const [updated] = await this.knex('sessions')
      .where({ id })
      .update({ ...updateData, updated_at: this.knex.fn.now() })
      .returning('*');
    return updated || null;
  }
}
