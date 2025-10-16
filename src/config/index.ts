import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  return {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    DATABASE_URL: process.env.DATABASE_URL || null,
    NODE_ENV: process.env.NODE_ENV || 'development',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5-mini',
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || null,
  } as const;
}
