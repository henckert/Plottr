# Plottr Frontend

Modern Next.js-based web application for sports field booking management.

## Features

- **Venue Management**: Browse and explore sports venues
- **Pitch Details**: View detailed information about individual pitches
- **Session Tracking**: Schedule and manage booking sessions
- **Geospatial Visualization**: Interactive maps powered by MapLibre GL
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Type-Safe**: Full TypeScript support with strict mode
- **Deep Linking**: Share venue/pitch/session URLs directly

## Tech Stack

- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.3 with PostCSS
- **Maps**: MapLibre GL 3.6
- **HTTP Client**: Axios with auto-auth interceptors
- **State Management**: Zustand 4.4
- **API**: Typed client connecting to backend REST API

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- Running Plottr backend API (http://localhost:3000)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application opens at http://localhost:3000. The frontend automatically connects to the backend API (configurable via `NEXT_PUBLIC_API_BASE_URL` environment variable).

### Production Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Project Structure

```
web/
├── src/
│   ├── pages/              # Next.js pages (routes)
│   │   ├── _app.tsx        # App wrapper with health check
│   │   ├── index.tsx       # Venue listing with pagination
│   │   ├── venues/
│   │   │   └── [id].tsx    # Venue detail with pitches
│   │   ├── pitches/
│   │   │   └── [id].tsx    # Pitch detail with map & sessions
│   │   └── sessions/
│   │       └── [id].tsx    # Session detail
│   ├── lib/
│   │   ├── api.ts          # Typed API client
│   │   └── store.ts        # Zustand stores (UI & data)
│   ├── globals.css         # Global styles + Tailwind
├── public/                 # Static assets
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
└── package.json            # Dependencies

## API Integration

The frontend uses a fully-typed API client that connects to the Plottr backend:

```typescript
// Fetch venues with cursor pagination
const response = await venueApi.list(10, cursor);
const venues = response.data;
const nextCursor = response.next_cursor;

// Get specific venue
const venue = await venueApi.getById(venueId);

// List pitches for a venue
const pitchesResponse = await pitchApi.list(50);

// Get session details
const session = await sessionApi.getById(sessionId);

// Health check
await healthApi.check();
```

All responses are fully typed with TypeScript interfaces matching the backend OpenAPI schema.

## Environment Variables

Create a `.env.local` file for development:

```env
# Backend API URL (optional, defaults to http://localhost:3000)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Deep Linking

The application supports deep linking to specific views:

- **Venue**: `/venues/[id]`
- **Pitch**: `/pitches/[id]?venue=[venueId]`
- **Session**: `/sessions/[id]?pitch=[pitchId]`

Users can share these URLs directly to link others to specific resources.

## Maps

Interactive map visualization powered by MapLibre GL:

- Displays pitch boundaries as GeoJSON polygons
- Pan and zoom controls
- Automatic bounds fitting
- Open Street Map tiles (free)

## State Management

Zustand stores for lightweight state management:

```typescript
// UI state (selected items)
const { selectedVenueId, setSelectedVenue } = useUIStore();

// Data state (fetched entities)
const { venues, addVenue } = useDataStore();
```

## Testing

The frontend is designed to work with the Plottr backend API. Test the connection:

```bash
# Verify TypeScript compiles
npm run type-check

# Lint code
npm run lint

# Run dev server
npm run dev
# Visit http://localhost:3000 to test
```

## Next Steps

- Add offline caching with service workers
- Implement optimistic updates for booking creation
- Add filters and search to venue listing
- Create admin dashboard
- Add PWA support (installable web app)

## License

Same as parent Plottr project

## Support

For issues or questions about the backend API, refer to the main Plottr repository documentation.
