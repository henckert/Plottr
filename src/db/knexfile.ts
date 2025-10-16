import 'dotenv/config';
import path from 'path';
import type { Knex } from 'knex';

const connectionTest = process.env.DATABASE_URL_TEST ?? 'postgres://postgres:postgres@localhost:5432/plottr_test';
const connectionDev  = process.env.DATABASE_URL      ?? 'postgres://postgres:postgres@localhost:5432/plottr';

const common: Partial<Knex.Config> = {
  client: 'pg',
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds'),
  },
};

const config: Record<string, Knex.Config> = {
  test: { ...common, connection: connectionTest },
  development: { ...common, connection: connectionDev },
};

export default config;
module.exports = config;
