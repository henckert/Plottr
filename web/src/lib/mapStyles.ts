/**
 * Map style configurations for MapLibre GL
 * Uses free, token-less OSM-based styles
 */

export type MapStyle = 'osm-bright' | 'osm-light' | 'osm-dark';

export interface StyleDefinition {
  id: MapStyle;
  name: string;
  url: string;
  attribution: string;
}

/**
 * Available map styles (all free, no API keys required)
 */
export const MAP_STYLES: Record<MapStyle, StyleDefinition> = {
  'osm-bright': {
    id: 'osm-bright',
    name: 'OSM Bright',
    url: '/styles/osm-free.json', // Free OSM raster tiles (no API key required)
    attribution: '© <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  'osm-light': {
    id: 'osm-light',
    name: 'Light',
    url: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  'osm-dark': {
    id: 'osm-dark',
    name: 'Dark',
    url: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
    attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  },
};

export const DEFAULT_STYLE: MapStyle = 'osm-bright';

/**
 * Get style URL by ID
 */
export function getStyleUrl(styleId: MapStyle): string {
  return MAP_STYLES[styleId]?.url || MAP_STYLES[DEFAULT_STYLE].url;
}

/**
 * Get style attribution by ID
 */
export function getStyleAttribution(styleId: MapStyle): string {
  return MAP_STYLES[styleId]?.attribution || MAP_STYLES[DEFAULT_STYLE].attribution;
}
