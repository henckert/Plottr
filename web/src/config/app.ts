/**
 * Application-wide configuration and constants
 * Central place for brand identity, URLs, and app settings
 */

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "PlotIQ";
export const SITE_TAGLINE = "Map. Plan. Share.";
export const SITE_DESCRIPTION = "Design, visualize, and share field layouts in minutes.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const APP_VERSION = "0.1.0";
export const COPYRIGHT_YEAR = new Date().getFullYear();

export const ROUTES = {
  HOME: "/",
  SITES: "/sites",
  SITES_NEW: "/sites/new",
  LAYOUTS: "/layouts",
  TEMPLATES: "/templates",
  SESSIONS: "/sessions",
  CHANGELOG: "/changelog",
} as const;

export const EXTERNAL_LINKS = {
  OSM: "https://www.openstreetmap.org/copyright",
  STADIA_MAPS: "https://stadiamaps.com/",
} as const;
