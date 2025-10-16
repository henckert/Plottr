import { getKnex } from './knex';

export class TemplatesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll() {
    return this.knex('templates').select('*').orderBy('id', 'asc');
  }
}
