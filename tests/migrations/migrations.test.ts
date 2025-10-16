const knexConfig = require('../../src/db/knexfile');
const Knex = require('knex');

describe('migrations', () => {
  let knex: any;

  beforeAll(() => {
    const config: any = knexConfig.test || knexConfig['test'];
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
