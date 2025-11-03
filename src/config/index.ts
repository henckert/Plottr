import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  return {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    DATABASE_URL: process.env.DATABASE_URL || null,
    NODE_ENV: process.env.NODE_ENV || 'development',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5-mini',
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || null,
    AUTH_REQUIRED: process.env.AUTH_REQUIRED === 'true' ? true : false,
    DEV_TOKEN: process.env.DEV_TOKEN || 'dev-token-placeholder',
    
    // Geocoding configuration
    geocoder: {
      provider: (process.env.GEOCODER_PROVIDER ?? 'mapbox').toLowerCase(),
      mapboxToken: process.env.MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_TOKEN ?? '',
      language: process.env.MAPBOX_LANGUAGE ?? 'en',
      countryBias: (process.env.MAPBOX_COUNTRY_BIAS ?? 'ie').toLowerCase(),
      proximity: process.env.MAPBOX_PROXIMITY ?? '-6.2603,53.3498', // Dublin lng,lat
    },
  } as const;
}
