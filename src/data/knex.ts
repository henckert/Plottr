import knex from 'knex';
import { getConfig } from '../config';

let instance: any = null;

export function getKnex() {
  if (instance) return instance;
  const cfg = getConfig();
  instance = knex({
    client: 'pg',
    connection: cfg.DATABASE_URL || process.env.DATABASE_URL,
  });
  return instance;
}
