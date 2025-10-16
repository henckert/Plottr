# Local setup notes

Required external software
- Docker Desktop (with WSL2 integration enabled) — used to run Postgres+PostGIS locally
- Node.js (v18+ recommended) and npm

Optional helpful tools
- Docker Compose (optional)
- psql (Postgres client)

Quick start
1. Start Postgres+PostGIS (example):
```powershell
docker run --name plottr-pg `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=plottr `
  -p 5432:5432 -d postgis/postgis:16-3.4
```
2. Create test DB and extensions:
```powershell
docker exec -it plottr-pg psql -U postgres -c "CREATE DATABASE plottr_test;"
docker exec -it plottr-pg psql -U postgres -d plottr -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it plottr-pg psql -U postgres -d plottr -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
docker exec -it plottr-pg psql -U postgres -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it plottr-pg psql -U postgres -d plottr_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```
3. Run migrations and tests:
```powershell
cd C:\Users\jhenc\Plottr
$env:DATABASE_URL_TEST = "postgres://postgres:postgres@localhost:5432/plottr_test"
npm install
npm run test:migrations
```
