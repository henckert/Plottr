import { getKnex } from './knex';

export class VenuesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll() {
    return this.knex('venues').select('*').orderBy('id', 'asc');
  }

  async listAllPaginated(limit: number, cursorParams?: { id: number; sortValue: any }) {
    let query = this.knex('venues').select('*').orderBy('updated_at', 'asc').orderBy('id', 'asc');

    // Apply cursor filtering if provided
    if (cursorParams) {
      // Forward pagination: return records where (updated_at > cursor_sort) 
      // OR (updated_at = cursor_sort AND id > cursor_id)
      query = query.where((builder: any) => {
        builder
          .where('updated_at', '>', cursorParams.sortValue)
          .orWhere((b: any) =>
            b.where('updated_at', '=', cursorParams.sortValue).andWhere('id', '>', cursorParams.id)
          );
      });
    }

    return query.limit(limit);
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
