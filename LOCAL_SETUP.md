# Local Development Setup

Welcome to Plottr backend development! This guide will get you up and running in minutes.

## Prerequisites

- **Node.js**: v18 or v20 LTS (check: `node --version`)
- **Docker**: Desktop for macOS/Windows or Docker Engine for Linux
- **npm**: v9+ (comes with Node.js)
- **Git**: For version control

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/henckert/Plottr.git
cd Plottr
npm install
```

### 2. Start Database

```bash
docker compose up -d
```

Verify PostgreSQL is running:
```bash
docker compose ps
# Should show: plottr_postgres ... Up ... (healthy)
```

### 3. Setup Database

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Dev Server

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
```

### 5. Verify Installation

In another terminal:

```bash
# Simple health check
curl http://localhost:3000/health
# Expected: { "ok": true, ... }

# Get venues (may require auth, check dev mode setting)
curl http://localhost:3000/api/venues

# Detailed health (includes DB latency)
curl http://localhost:3000/healthz
```

**✅ You're ready to develop!**

---

## Database Commands

### Reset Everything (Fresh Start)

```bash
npm run db:reset
```

This will:
1. Rollback all migrations
2. Re-run migrations
3. Seed test data

Perfect for a clean state or resolving migration issues.

### Just Migrate

```bash
npm run db:migrate
```

Run pending migrations without resetting.

### Just Seed Data

```bash
npm run db:seed
```

Add test data without re-running migrations.

### Rollback Last Migration

```bash
npm run migrate:rollback
```

Useful for development when you need to fix a migration.

---

## Testing

### Run All Tests

```bash
npm test
```

Expected output:
```
Test Suites: 10 passed, 10 total
Tests:       158 passed, 158 total
```

### Run Unit Tests Only

```bash
npm run test:unit
```

Fast tests (pagination, geospatial validation).

### Run Integration Tests Only

```bash
npm run test:integration
```

Tests against real database.

### Run Specific Test File

```bash
npm test -- tests/integration/venues.test.ts
```

### Watch Mode

```bash
npm test -- --watch
```

Re-run tests as files change (useful during development).

---

## Code Quality

### Type Check

```bash
npm run check:types
```

Verify TypeScript compilation without building.

### Generate API Types

After updating `openapi/plottr.yaml`:

```bash
npm run gen:types
```

This regenerates `src/types/openapi.ts` with auto-generated types.

---

## Common Development Workflows

### Adding a Database Migration

```bash
# Create migration file in src/migrations/
# Edit the migration file to add schema changes

# Run migration immediately in dev
npm run db:migrate

# Test the migration
npm test

# If you need to adjust, rollback and try again
npm run migrate:rollback
```

### Adding a New Endpoint

1. Create controller in `src/controllers/`
2. Create route in `src/routes/`
3. Add Zod validation schema
4. Write integration tests in `tests/integration/`
5. Update `openapi/plottr.yaml`
6. Run `npm run gen:types`
7. Run `npm test` to verify

### Debugging

The dev server runs with full stack traces. Check the terminal output for errors.

For more detailed debugging:

```bash
# Enable debug logging
LOG_LEVEL=DEBUG npm run dev
```

---

## Troubleshooting

### "Cannot connect to database"

**Problem**: `error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
docker compose up -d
docker compose ps  # Verify container is healthy
```

If container won't start, check Docker Desktop is running.

### "Port 3000 already in use"

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000 (on Windows)
netstat -ano | findstr :3000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F

# Or just use a different port
PORT=3001 npm run dev
```

### "Migration lock held by another process"

**Problem**: Tests hang or fail with lock timeout

**Solution**:
```bash
docker exec plottr_postgres psql -U postgres -d plottr_test -c "DELETE FROM knex_migrations_lock;"
```

Then retry: `npm test`

### "Tests failing with timeout"

**Problem**: `Tests timeout after 30 seconds`

**Solution**: Usually Docker is not running
```bash
docker compose up -d
docker compose ps  # Verify all containers healthy
npm test
```

### "TypeScript errors after git pull"

**Problem**: Type checking fails

**Solution**:
```bash
npm install  # Update dependencies
npm run gen:types  # Regenerate types
npm run check:types  # Verify
```

---

## Docker Management

### View Logs

```bash
docker compose logs -f plottr_postgres
```

### Stop Everything

```bash
docker compose down
```

### Remove All Data and Start Fresh

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
```

---

## Editor Setup (VS Code)

### Recommended Extensions

- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`
- **Thunder Client** (or REST Client): For testing API endpoints
- **PostgreSQL Explorer**: `ckolkman.vscode-postgres`

### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": ["typescript", "typescriptreact"]
}
```

---

## Environment Variables

### Development (.env.local)

```bash
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/plottr
API_PORT=3000
AUTH_REQUIRED=false
MAPBOX_TOKEN=
```

### Testing (.env.test)

```bash
NODE_ENV=test
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/plottr_test
MAPBOX_TOKEN=
```

---

## Next Steps

- 📖 Read `README.md` for API documentation
- 🧪 Run `npm test` to verify everything works
- 📝 Check `openapi/plottr.yaml` for API specification
- 🗺️ Explore `src/` for codebase structure
- 🐛 Report issues to GitHub

---

## Getting Help

- **API Questions**: Check `README.md` and `openapi/plottr.yaml`
- **Database Issues**: See troubleshooting section above
- **Test Failures**: Run `npm test` and check detailed error output
- **Type Errors**: Run `npm run check:types` for full diagnostics
- **GitHub Issues**: https://github.com/henckert/Plottr/issues

---

Happy coding! 🚀
