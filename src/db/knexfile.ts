const path = require('path');

const migrationsDir = path.resolve(__dirname, 'migrations');
const seedsDir = path.resolve(__dirname, 'seeds');

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_dev',
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
  },
  test: {
    client: 'pg',
    connection: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plottr_test',
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
  },
};
