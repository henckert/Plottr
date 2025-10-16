import 'dotenv/config';
import knex, { Knex } from 'knex';
import config from '../db/knexfile';

let instance: Knex | null = null;

export function getKnex(): Knex {
  if (instance) return instance;
  const env = process.env.NODE_ENV === 'test' ? 'test' : 'development';
  instance = knex(config[env]);
  return instance;
}

export async function destroyKnex() {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}
