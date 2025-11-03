# Changelog

All notable changes to Plottr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-11-03

### Added
- **Mapbox Geocoding Provider** - Primary geocoding provider with comprehensive features:
  - Provider abstraction layer with factory pattern for switching between providers
  - Mapbox Geocoding API v5 integration with exponential backoff retry logic
  - Nominatim/OpenStreetMap fallback provider
  - Automatic Eircode (Irish postal code) detection with fallback to Nominatim
  - LRU cache with 60-second TTL for improved performance
  - Token bucket rate limiting (10 requests per minute)
  - Country bias and proximity search support
  - Language preference handling
  - Comprehensive unit tests (58/59 passing - 98%)
  - Smoke tests for real API verification
  - Full documentation in `docs/GEOCODING_CONFIG.md`

### Changed
- Geocoding service refactored to use provider abstraction
- Configuration now supports `GEOCODER_PROVIDER` env var (mapbox|nominatim)
- Geocode controller now clamps limit to [1, 10] range for better API stability
- Legacy `nominatimSearch()`, `nominatimReverse()`, and `forwardGeocode()` preserved for backward compatibility

### Fixed
- **Share Links Feature** - Complete fix of critical test failures:
  - Fixed `created_by` NOT NULL constraint violation by making column nullable
  - Extended `slug` column from VARCHAR(12) to VARCHAR(20) to support generated slugs
  - Fixed GET `/share/:slug` response format to wrap data in `{data: {...}}` property
  - Added `created_at` field to share link metadata in public responses
  - Fixed cursor pagination overlapping results with proper Date encoding
  - Updated pagination utility to convert Date objects to ISO strings for PostgreSQL compatibility
  - All share-links tests now passing (15/15 - 100%)

### Database
- Migration `0017_alter_share_links.ts` applied:
  - `created_by` column: VARCHAR(100) → VARCHAR(100) NULL
  - `slug` column: VARCHAR(12) → VARCHAR(20)

### Testing
- Share Links: 15/15 tests passing (100%)
- Geocoding: 58/59 tests passing (98%)
- Integration suite: 41 tests passing (layouts + share-links)
- TypeScript: 0 compilation errors

### Documentation
- Added `docs/GEOCODING_CONFIG.md` - Complete geocoding configuration guide (400+ lines)
- Updated `SHARE_LINKS_FIX_PLAN.md` - Detailed implementation of all fixes
- API contract maintained - no breaking changes

---

## [1.0.0] - 2024-10-XX

### Added
- Initial release of Plottr backend API
- Venues, pitches, layouts, zones, assets, sessions management
- Cursor-based pagination system
- PostGIS geospatial validation
- Clerk authentication integration
- Share links feature for public session sharing
- Template system for pitch layouts

### Features
- 4-layer architecture: Controller → Service → Repository → Database
- PostgreSQL/PostGIS integration
- Zod schema validation
- Structured logging with correlation IDs
- Version tokens for optimistic concurrency
- Health check endpoints

---

[1.0.1]: https://github.com/plottr/plottr/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/plottr/plottr/releases/tag/v1.0.0
