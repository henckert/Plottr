# TASK 6.6 & 6.7: CI/CD Pipeline + Production Setup - COMPLETION SUMMARY

**Status:** ✅ COMPLETE  
**Completion Date:** October 27, 2025  
**Estimated Time:** 2-3 hours  
**Actual Time:** ~1.5 hours  

---

## Overview

Completed comprehensive CI/CD pipeline with GitHub Actions and full production deployment documentation, enabling automated testing, deployment, and continuous integration for the Plottr platform.

---

## Deliverables

### TASK 6.6: CI/CD Pipeline

**File:** `.github/workflows/ci.yml` (enhanced from 113 → 220+ lines)

**Jobs Added:**

#### 1. OpenAPI Spec Validation
- Validates `openapi/plottr.yaml` on every push/PR
- Uses `@apidevtools/swagger-cli` for validation
- Ensures API spec stays in sync with code
- **Trigger:** On push to `main`/`develop`, PRs

#### 2. Frontend Build & Type Check
- TypeScript type checking for Next.js frontend
- Full production build verification
- Catches frontend errors before deployment
- **Trigger:** On all pushes/PRs

#### 3. Deploy API Docs to GitHub Pages
- Automatic deployment of interactive API documentation
- Deploys Swagger UI, OpenAPI spec, and user guides
- **URL:** https://henckert.github.io/Plottr/ (when enabled)
- **Trigger:** On push to `main` branch only
- **Artifacts Deployed:**
  - `public/api-docs.html` → `/index.html` (Swagger UI)
  - `openapi/plottr.yaml` → `/openapi.yaml`
  - `docs/API_REFERENCE.md` → `/API_REFERENCE.md`
  - `docs/USER_GUIDE_*.md` → User guides

**Existing Jobs (Retained):**
- ✅ Backend tests (Node 18.x + 20.x matrix)
- ✅ TypeScript type checking
- ✅ Integration tests with PostgreSQL/PostGIS
- ✅ Code quality checks on PRs
- ✅ Test coverage reporting (Codecov)

**Total Jobs:** 5 (3 new + 2 existing)

**Workflow Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Release creation (for production deployments)
- Manual trigger (`workflow_dispatch`)

---

### TASK 6.7: Production Environment Setup

**File:** `docs/DEPLOYMENT.md` (1,400+ lines)

**Sections:**

#### 1. Prerequisites
- Required tools (Node.js 20.x, PostgreSQL 16, Git)
- Third-party services (Clerk, Mapbox, MapTiler)
- Domain & SSL requirements

#### 2. Environment Variables (Complete Reference)
- **Backend:** 10 environment variables documented
  - `DATABASE_URL`, `NODE_ENV`, `PORT`, `AUTH_REQUIRED`
  - `CLERK_SECRET_KEY`, `CORS_ORIGIN`, `MAPBOX_TOKEN`
  - `LOG_LEVEL`, `APP_VERSION`
- **Frontend:** 3 environment variables documented
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_MAPTILER_API_KEY`
- **Table:** Required vs optional variables with examples

#### 3. Database Setup
- **PostgreSQL Provisioning:** Railway, Render, Manual (AWS RDS, DigitalOcean)
- **PostGIS Extension:** Installation and verification
- **Migrations:** Running migrations in production
- **Seeding:** Optional template data seeding

#### 4. Backend Deployment (3 Options)
- **Option 1: Railway** (CLI-based deployment)
  - Installation, initialization, environment setup
  - Deploy commands and domain configuration
- **Option 2: Render** (Git-based deployment)
  - `render.yaml` configuration example
  - Auto-deploy on push to `main`
- **Option 3: Manual VPS** (AWS EC2, DigitalOcean Droplet)
  - PM2 process manager setup
  - Nginx reverse proxy configuration
  - SSL with Let's Encrypt (Certbot)

#### 5. Frontend Deployment (3 Options)
- **Option 1: Vercel** (Recommended for Next.js)
  - CLI deployment, environment variables
  - Custom domain configuration
- **Option 2: Railway** (Full-stack deployment)
  - `railway.toml` configuration
- **Option 3: Static Export** (Netlify, Cloudflare Pages)
  - Next.js static export configuration

#### 6. Post-Deployment Checklist
- **Health Checks:** Backend (`/health`, `/healthz`), Frontend
- **Authentication:** Clerk domain configuration, CORS setup
- **Monitoring:** Log tailing, metrics dashboards

#### 7. Monitoring & Logging
- **Structured Logging:** JSON format with request IDs
- **Log Levels:** ERROR, WARN, INFO, DEBUG
- **Performance Metrics:** Response time, error rate, memory/CPU
- **Database Monitoring:** SQL queries for connections, slow queries, sizes

#### 8. Backup & Recovery
- **Automated Backups:** Railway, Render procedures
- **Manual Backups:** `pg_dump` commands, S3 upload
- **Restore Procedure:** `pg_restore` commands
- **Rollback Migrations:** Knex rollback commands

#### 9. Troubleshooting
- **5 Common Issues Documented:**
  1. Database connection errors (`ECONNREFUSED`)
  2. PostGIS extension missing (`ST_SetSRID` errors)
  3. Clerk authentication errors (401 Unauthorized)
  4. CORS errors (blocked by CORS policy)
  5. Rate limiting (429 Too Many Requests)
- **Solutions for Each Issue**
- **Debug Mode:** Environment variable configuration
- **Health Check Commands:** cURL examples

---

## Technical Implementation

### GitHub Actions Workflow Structure

```yaml
name: CI/CD Pipeline
on: [push, pull_request, release]

jobs:
  test:                    # Backend tests (Node 18.x + 20.x)
  code-quality:            # PR quality checks
  openapi-validation:      # Validate OpenAPI spec (NEW)
  frontend-build:          # Frontend type check + build (NEW)
  deploy-api-docs:         # GitHub Pages deployment (NEW)
```

### GitHub Pages Deployment

**Permissions Required:**
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

**Artifacts Deployed:**
- Interactive Swagger UI at `/` (index.html)
- OpenAPI spec at `/openapi.yaml`
- API reference at `/API_REFERENCE.md`
- User guides at `/USER_GUIDE_*.md`
- Auto-generated README with links

**Deployment Flow:**
1. Checkout code
2. Configure GitHub Pages
3. Copy docs to `_site/` directory
4. Upload artifact
5. Deploy to GitHub Pages
6. **Result:** https://henckert.github.io/Plottr/

---

## Deployment Options Matrix

| Platform | Backend | Frontend | Database | Cost | Best For |
|----------|---------|----------|----------|------|----------|
| **Railway** | ✅ Yes | ✅ Yes | ✅ PostgreSQL | $5-20/mo | Full-stack hobby projects |
| **Render** | ✅ Yes | ✅ Yes | ✅ PostgreSQL | $7-25/mo | Production apps |
| **Vercel** | ❌ No | ✅ Yes | ❌ No | Free-$20/mo | Frontend only |
| **Manual VPS** | ✅ Yes | ✅ Yes | ✅ Self-hosted | $5-50/mo | Full control |
| **AWS/GCP** | ✅ Yes | ✅ Yes | ✅ RDS/Cloud SQL | $20-100/mo | Enterprise scale |

**Recommended Stack:**
- **Backend:** Railway or Render (simplicity)
- **Frontend:** Vercel (Next.js optimized)
- **Database:** Railway/Render managed PostgreSQL (automatic backups)

---

## Environment Configuration

### Development
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/plottr_dev
NODE_ENV=development
AUTH_REQUIRED=false
MAPBOX_TOKEN=pk.ey... (optional)
```

### Staging
```bash
DATABASE_URL=postgres://user:pass@staging-db:5432/plottr_staging
NODE_ENV=staging
AUTH_REQUIRED=true
CLERK_SECRET_KEY=sk_test_...
CORS_ORIGIN=https://staging.plottr.example.com
```

### Production
```bash
DATABASE_URL=postgres://user:pass@prod-db:5432/plottr_production
NODE_ENV=production
AUTH_REQUIRED=true
CLERK_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://plottr.example.com
LOG_LEVEL=INFO
```

---

## Monitoring & Observability

### Application Logs

**Example Log Entry:**
```json
{
  "timestamp": "2025-10-27T12:00:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "requestId": "abc123-def456",
  "method": "GET",
  "path": "/api/sites",
  "status": 200,
  "duration": 45,
  "userId": "user_xyz"
}
```

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| API Response Time (p95) | <500ms | >1000ms |
| Database Query Time (p95) | <200ms | >500ms |
| Error Rate | <1% | >5% |
| Uptime | >99.9% | <99.0% |
| Memory Usage | <512MB | >1GB |

### Database Health Checks

```sql
-- Active connections (target: <50)
SELECT count(*) FROM pg_stat_activity;

-- Slow queries (>1s)
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second';

-- Database size
SELECT pg_size_pretty(pg_database_size('plottr_production'));
```

---

## Security Considerations

### Environment Variables
- ✅ Never commit secrets to Git
- ✅ Use environment-specific `.env` files
- ✅ Rotate API keys quarterly
- ✅ Use strong database passwords (16+ chars)

### HTTPS/SSL
- ✅ Enforce HTTPS in production
- ✅ HSTS header enabled (Helmet middleware)
- ✅ Redirect HTTP → HTTPS (Nginx/Railway)

### CORS
- ✅ Whitelist specific origins (no `*`)
- ✅ Credentials: true for cookie-based auth
- ✅ Match Clerk allowed origins

### Rate Limiting
- ✅ 15 req/min for authenticated endpoints
- ✅ 100 req/min for public endpoints
- ✅ IP-based throttling (future: API keys)

---

## Backup Strategy

### Automated Daily Backups
- **Railway:** Automatic, 7-day retention
- **Render:** Automatic on paid plans
- **Manual:** Cron job with `pg_dump`

### Backup Script (Example)
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="plottr_backup_$DATE.dump"

pg_dump $DATABASE_URL -F c -f $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://plottr-backups/
rm $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"
```

### Retention Policy
- **Daily backups:** 7 days
- **Weekly backups:** 4 weeks
- **Monthly backups:** 12 months

---

## Troubleshooting Guide

### Issue: Database Connection Failed

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**
1. Check `DATABASE_URL` environment variable
2. Verify PostgreSQL is running
3. Test with `psql $DATABASE_URL`
4. Check firewall rules (port 5432)

**Solution:**
```bash
# Verify connection
psql $DATABASE_URL -c "SELECT 1;"

# Check SSL requirement
# If error "SSL required", add to DATABASE_URL:
# ?sslmode=require
```

### Issue: Migrations Failed

**Symptom:**
```
Error: Migration "0015_enhance_assets_table.ts" failed
```

**Diagnosis:**
1. Check database extensions (PostGIS, pgcrypto)
2. Verify migration syntax
3. Check for conflicts with existing data

**Solution:**
```bash
# Rollback and retry
npm run db:rollback
npm run db:migrate

# If persistent, check migration file
cat src/db/migrations/0015_enhance_assets_table.ts
```

---

## Success Metrics

✅ **CI/CD Pipeline:** 5 jobs configured  
✅ **OpenAPI Validation:** Automated on every push  
✅ **GitHub Pages:** API docs auto-deployed  
✅ **Deployment Guide:** 1,400+ lines covering 3 platforms  
✅ **Environment Variables:** 13 variables documented  
✅ **Backup Strategy:** Automated + manual procedures  
✅ **Troubleshooting:** 5 common issues documented  

---

## Next Steps

Ready to proceed with **TASK 6.8: Migration Runbook & Banner**
- Create venues→sites data migration documentation
- Build UI banner component for migration notice
- Implement migration status tracking

---

**Last Updated:** October 27, 2025  
**Completion Status:** ✅ COMPLETE (100%)  
**Total LOC:** ~1,500 lines (CI/CD config + deployment docs)
