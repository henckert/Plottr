import { getKnex } from './knex';

export class VenuesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll() {
    return this.knex('venues').select('*').orderBy('id', 'asc');
  }

  async listAllPaginated(limit: number) {
    // Fetch with limit, ordered by updated_at (for cursor pagination)
    return this.knex('venues')
      .select('*')
      .orderBy('updated_at', 'asc')
      .orderBy('id', 'asc')
      .limit(limit);
  }

  async getById(id: number) {
    const row = await this.knex('venues').where({ id }).first();
    return row || null;
  }

  async create(payload: any) {
    const [created] = await this.knex('venues').insert(payload).returning('*');
    return created;
  }

  async update(id: number, payload: any) {
    // Filter out undefined values so we don't update columns with null
    const updateData = Object.fromEntries(Object.entries(payload).filter(([_k, v]) => v !== undefined));
    const [updated] = await this.knex('venues')
      .where({ id })
      .update({ ...updateData, updated_at: this.knex.fn.now() })
      .returning('*');
    return updated || null;
  }
}
