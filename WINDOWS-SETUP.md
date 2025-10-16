# Windows PowerShell Developer Setup Guide

This guide resolves common Windows + PowerShell + Node issues and provides a one-time setup.

## Problem Summary

1. **npm command crashes in PowerShell** — PowerShell's npm.ps1 shim has bugs with `$MyInvocation.Statement`
2. **docker-compose not found** — Missing `docker-compose.yml` configuration file

## One-Time Setup (Run Once)

### Step 1: Run the Development Environment Setup Script

From the Plottr directory, run:

```powershell
# Run the setup script
.\scripts\setup-dev-env.ps1

# If you get an execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try again
```

This script will:
- ✅ Fix npm/npx aliases (so `npm` works without issues)
- ✅ Set local environment variables (DATABASE_URL, MAPBOX_TOKEN, etc.)
- ✅ Display quick reference commands

### Step 2: Start PostgreSQL + PostGIS

```powershell
# Ensure Docker Desktop is running, then:
docker compose up -d

# Verify it started:
docker compose logs postgres

# Should show: "database system is ready to accept connections"
```

### Step 3: Install Dependencies

```powershell
npm install
```

### Step 4: Initialize Database

```powershell
# Create test database
$env:DATABASE_URL_TEST = "postgresql://plottr:plottrpass@localhost:5432/plottr_test"
& psql -U plottr -h localhost -d postgres -c "CREATE DATABASE plottr_test;"

# If psql not available, use docker:
docker exec plottr_postgres psql -U plottr -d postgres -c "CREATE DATABASE plottr_test;"

# Enable extensions
docker exec plottr_postgres psql -U plottr -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec plottr_postgres psql -U plottr -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Run migrations and seeds
npm run migrate
npm run seed
```

## Daily Workflow

After setup, each session:

```powershell
# 1. Start database (if not already running)
docker compose up -d

# 2. Run setup script to fix npm and set env vars
.\scripts\setup-dev-env.ps1

# 3. Use npm normally
npm run dev              # Start server
npm test                 # Run tests
npm run check:types      # Check TypeScript
```

## If npm Commands Still Crash

**Workaround:** Use `npm.cmd` explicitly:

```powershell
& npm.cmd install
& npm.cmd run dev
& npm.cmd test
```

**Permanent Fix:** Uninstall and reinstall Node.js:
1. Uninstall Node via Control Panel
2. Download installer from https://nodejs.org/
3. Run installer (choose "Install Node.js runtime")
4. Restart PowerShell

## Docker Commands Reference

```powershell
# Start database in background
docker compose up -d

# Stop database
docker compose down

# View logs
docker compose logs postgres

# Remove database and volume (reset everything)
docker compose down -v

# Connect to database directly
docker exec -it plottr_postgres psql -U plottr -d plottr_dev
```

## Troubleshooting

### "Cannot find docker compose command"

Ensure Docker Desktop is installed and running.

```powershell
docker --version
docker compose version
```

### "database does not exist" error

Create the test database:

```powershell
docker exec plottr_postgres psql -U plottr -d postgres -c "CREATE DATABASE plottr_test;"
```

### "relation does not exist" during tests

Migrations haven't run. Execute:

```powershell
npm run migrate
npm run seed
```

### "port 5432 already in use"

Docker container is still running or another Postgres instance exists. Choose one:

```powershell
# Option A: Stop all Plottr containers
docker compose down

# Option B: Stop and remove the specific container
docker stop plottr_postgres
docker rm plottr_postgres

# Option C: Run on a different port (modify docker-compose.yml)
# Change "5432:5432" to "5433:5432" and update DATABASE_URL to use port 5433
```

### "Execution policy does not allow running scripts"

PowerShell security is blocking the setup script:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then re-run the setup script.

## Quick Reference

| Task | Command |
|------|---------|
| Setup environment | `.\scripts\setup-dev-env.ps1` |
| Start database | `docker compose up -d` |
| Stop database | `docker compose down` |
| View database logs | `docker compose logs postgres` |
| Install deps | `npm install` |
| Run migrations | `npm run migrate` |
| Load test data | `npm run seed` |
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Type check | `npm run check:types` |
| Connect to DB | `docker exec -it plottr_postgres psql -U plottr -d plottr_dev` |

---

**Last Updated:** 2025-10-16  
**Tested On:** Windows 10/11, PowerShell v5.1+, Node 18+, Docker Desktop
