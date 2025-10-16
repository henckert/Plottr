import knex from 'knex';
import { getConfig } from '../config';

let instance: any = null;

export function getKnex() {
  if (instance) return instance;
  const cfg = getConfig();
  // Prefer explicit test URL when running tests
  const connection = process.env.DATABASE_URL_TEST || cfg.DATABASE_URL || process.env.DATABASE_URL || null;
  instance = knex({
    client: 'pg',
    connection: connection as any,
    pool: { min: 0, max: 5 },
  });
  return instance;
}

export async function destroyKnex() {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}
