import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  return {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    DATABASE_URL: process.env.DATABASE_URL || null,
    NODE_ENV: process.env.NODE_ENV || 'development',
  } as const;
}
