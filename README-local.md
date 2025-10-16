# Local Development Setup# Local setup notes



This guide covers how to set up the Plottr backend locally for development.Required external software

- Docker Desktop (with WSL2 integration enabled) — used to run Postgres+PostGIS locally

## Prerequisites- Node.js (v18+ recommended) and npm



- **Node.js** 18+ with npmOptional helpful tools

- **Docker** and **Docker Compose** (for PostGIS database)- Docker Compose (optional)

- **Git** configured with your GitHub credentials- psql (Postgres client)

- **PowerShell** v5.1+ (on Windows, included by default)

Quick start

## Quick Start1. Start Postgres+PostGIS (example):

```powershell

### 1. Clone the Repositorydocker run --name plottr-pg `

  -e POSTGRES_USER=postgres `

```bash  -e POSTGRES_PASSWORD=postgres `

git clone https://github.com/henckert/Plottr.git  -e POSTGRES_DB=plottr `

cd Plottr  -p 5432:5432 -d postgis/postgis:16-3.4

``````

2. Create test DB and extensions:

### 2. Install Dependencies```powershell

docker exec -it plottr-pg psql -U postgres -c "CREATE DATABASE plottr_test;"

```bashdocker exec -it plottr-pg psql -U postgres -d plottr -c "CREATE EXTENSION IF NOT EXISTS postgis;"

npm installdocker exec -it plottr-pg psql -U postgres -d plottr -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

```docker exec -it plottr-pg psql -U postgres -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"

docker exec -it plottr-pg psql -U postgres -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

### 3. Environment Configuration```

3. Run migrations and tests:

Copy the example environment file and update with your local settings:```powershell

cd C:\Users\jhenc\Plottr

```bash$env:DATABASE_URL_TEST = "postgres://postgres:postgres@localhost:5432/plottr_test"

cp .env.example .envnpm install

```npm run test:migrations

```

**Key environment variables for local development:**

```env
# Database
DATABASE_URL=postgresql://plottr:plottrpass@localhost:5432/plottr_dev
DATABASE_URL_TEST=postgresql://plottr:plottrpass@localhost:5432/plottr_test

# Mapbox (optional - tests will warn but work without it)
MAPBOX_TOKEN=your_mapbox_token_here

# Express Server
NODE_ENV=development
PORT=3000
```

### 4. Start PostGIS Database (Docker Compose)

The project includes a `docker-compose.yml` that provisions a PostGIS-enabled PostgreSQL instance.

**Start the database:**

```bash
docker-compose up -d
```

**Verify the database is running:**

```bash
docker-compose logs postgres
```

You should see logs indicating PostgreSQL is ready to accept connections.

**Connect to the database directly (optional):**

```bash
docker exec -it plottr_postgres psql -U plottr -d plottr_dev
```

### 5. Run Migrations

Create the database schema:

```bash
npm run migrate:latest
```

This runs all migrations from `src/db/migrations/` in order, creating tables for:
- `templates`
- `clubs`
- `venues`
- `pitches`
- `segments`
- `sessions`
- `users`

### 6. Seed the Database

Load sample data:

```bash
npm run seed:run
```

This runs all seed files from `src/db/seeds/` in numeric order:
1. `001_clubs.ts` - Sample rugby clubs
2. `002_venues.ts` - Sample venues with PostGIS geometries
3. `003_pitches.ts` - Sample pitches with sport types and geometries
4. `004_sessions.ts` - Sample training sessions

After seeding, you'll have test data for development and manual testing.

### 7. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

**Available endpoints (GET):**

- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get a specific template
- `GET /api/venues` - List all venues
- `GET /api/venues/:id` - Get a specific venue
- `GET /api/pitches` - List all pitches
- `GET /api/pitches/:id` - Get a specific pitch
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get a specific session

## Testing

### Run All Tests

```bash
npm test
```

Tests will:
1. Create a temporary test database (`plottr_test`)
2. Run all migrations
3. Run all seed files
4. Execute integration and unit tests
5. Clean up the test database

### Run Specific Test Suite

```bash
npm run test:int -- tests/integration/venues.test.ts --runInBand
```

The `--runInBand` flag runs tests sequentially (recommended for DB-dependent tests).

### Run Unit Tests Only

```bash
npm run test:unit
```

### Watch Mode (auto-run on file changes)

```bash
npm run test:watch
```

## Development Workflow

### 1. Make Code Changes

Edit files in `src/` (services, controllers, routes, etc.). TypeScript compilation happens automatically if you're using an IDE with TypeScript support.

### 2. Type Check

```bash
npm run check:types
```

### 3. Run Tests

```bash
npm test
```

Tests run automatically before each commit (pre-commit hook).

### 4. Commit Changes

```bash
git add .
git commit -m "feat: your feature description"
```

The pre-commit hook will run type checks and unit tests automatically.

### 5. Push to GitHub

```bash
git push origin main
```

GitHub Actions will automatically run the full test suite in CI.

## Database Management

### Reset the Database

To start fresh with a clean schema and seeds:

```bash
# Stop the database
docker-compose down -v

# Restart it
docker-compose up -d

# Run migrations and seeds again
npm run migrate:latest
npm run seed:run
```

### Inspect Database (psql)

```bash
docker exec -it plottr_postgres psql -U plottr -d plottr_dev

# Common commands:
\dt                    # List tables
\d venues              # Describe venues table
SELECT * FROM venues;  # Query data
\q                     # Quit
```

### View Migration/Seed History

```bash
npm run migrate:status
```

## Troubleshooting

### "Connection refused" Error

**Problem:** Can't connect to database.

**Solution:**
```bash
# Check if Docker container is running
docker ps | grep plottr_postgres

# If not running, start it
docker-compose up -d

# Check container logs
docker-compose logs postgres
```

### "Column does not exist" Error

**Problem:** Database schema is out of sync.

**Solution:**
```bash
# Verify migrations are applied
npm run migrate:status

# If migrations are pending
npm run migrate:latest

# Re-run seeds
npm run seed:run
```

### "Foreign key constraint" Error

**Problem:** Seed data refers to non-existent records.

**Solution:** Seeds are designed to run in order and respect foreign keys. Ensure:
1. All migrations ran successfully: `npm run migrate:latest`
2. All seeds ran in order: `npm run seed:run`
3. If you modified a seed file, check FK references match existing data

### Type Errors in IDE

**Problem:** TypeScript errors in VS Code even though `npm run check:types` passes.

**Solution:**
```bash
# Restart the TypeScript language server
# In VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or reload the window
# Ctrl+Shift+P → "Developer: Reload Window"
```

### Tests Fail with "Database does not exist"

**Problem:** Integration tests fail immediately.

**Solution:**
```bash
# The test database should auto-create, but verify Docker is running
docker-compose up -d

# Check Knex is using the correct URL in test config
# The DATABASE_URL_TEST should point to plottr_test
cat .env | grep DATABASE_URL

# Manually create test database if needed
docker exec plottr_postgres createdb -U plottr plottr_test
```

## Project Structure

```
Plottr/
├── src/
│   ├── app.ts                          # Express app setup
│   ├── server.ts                       # Server entry point
│   ├── config.ts                       # Environment & config
│   ├── db/
│   │   ├── migrations/                 # Database schema migrations
│   │   └── seeds/                      # Sample data seeds
│   ├── data/                           # Data access layer (repos)
│   ├── services/                       # Business logic layer
│   ├── controllers/                    # Express route handlers
│   ├── routes/                         # Route definitions
│   └── schemas/                        # Zod validation schemas
├── tests/
│   ├── integration/                    # Integration tests (DB-dependent)
│   └── unit/                           # Unit tests (isolated)
├── docker-compose.yml                  # Docker PostGIS setup
├── package.json                        # NPM scripts and dependencies
├── tsconfig.json                       # TypeScript configuration
├── jest.config.js                      # Jest test configuration
└── .env.example                        # Example environment variables
```

## Common NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | Run all tests (unit + integration) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:int` | Run integration tests only |
| `npm run check:types` | TypeScript type checking |
| `npm run migrate:latest` | Run pending migrations |
| `npm run migrate:status` | Show migration status |
| `npm run seed:run` | Run all seed files |
| `npm run lint` | Linting (if configured) |

## API Testing with Postman

A Postman collection is available for testing endpoints locally.

**Steps:**

1. Start the dev server: `npm run dev`
2. Open Postman
3. Import the collection: `File → Import → Select Plottr.postman_collection.json`
4. Set the collection's base URL to `http://localhost:3000`
5. Test endpoints in the collection

**Example request:**

```
GET http://localhost:3000/api/venues
Authorization: None (Bearer tokens handled in collection)
```

## Additional Resources

- **Database:** PostGIS + PostgreSQL via Docker Compose
- **ORM:** Knex.js for query building and migrations
- **Validation:** Zod for runtime schema validation
- **Testing:** Jest with Supertest for integration tests
- **TypeScript:** Strict mode enabled

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review test output: `npm test` provides detailed error messages
3. Check database logs: `docker-compose logs postgres`
4. Consult the main [README.md](./README.md) for project overview

---

**Last Updated:** 2025-10-15  
**Node Version Required:** 18+  
**PostGIS Version:** 3.x (via Docker)
