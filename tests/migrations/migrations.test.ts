import knexConfig = require('../../src/db/knexfile');
import Knex from 'knex';

describe('migrations', () => {
  let knex: Knex;

  beforeAll(() => {
    const config = knexConfig.test as Knex.Config;
    knex = Knex(config);
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test('migrate latest and rollback', async () => {
    await knex.migrate.latest();
    const hasTemplates = await knex.schema.hasTable('templates');
    expect(hasTemplates).toBe(true);
    await knex.migrate.rollback();
  }, 20000);
});
