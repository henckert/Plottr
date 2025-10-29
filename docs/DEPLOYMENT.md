# Production Deployment Guide

**Project:** Plottr - Field Layout Designer  
**Last Updated:** October 27, 2025  
**Deployment Target:** Railway / Render / Vercel

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 20.x or later
- PostgreSQL 16 with PostGIS 3.4
- Git
- Railway CLI (or Render/Vercel CLI)

### Domain & SSL
- Custom domain (optional but recommended)
- SSL certificate (automatic with Railway/Render/Vercel)

### Third-Party Services
- **Clerk** (authentication) - [clerk.com](https://clerk.com)
- **Mapbox** (geocoding, optional) - [mapbox.com](https://mapbox.com)
- **MapTiler** (satellite basemap) - [maptiler.com](https://maptiler.com)

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgres://user:password@host:5432/plottr_production

# Server
NODE_ENV=production
PORT=3001

# Authentication
AUTH_REQUIRED=true
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx

# CORS
CORS_ORIGIN=https://plottr.example.com

# Mapbox (optional)
MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxx

# Logging
LOG_LEVEL=INFO

# App Version
APP_VERSION=0.1.0
```

### Frontend (.env.local)

```bash
# API
NEXT_PUBLIC_API_BASE_URL=https://api.plottr.example.com

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (with PostGIS) | `postgres://user:pass@host:5432/plottr` |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk authentication secret | `sk_live_...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Clerk publishable key | `pk_live_...` |
| `CORS_ORIGIN` | ✅ Yes | Frontend URL for CORS | `https://plottr.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ Yes | Backend API URL | `https://api.plottr.example.com` |
| `MAPBOX_TOKEN` | ⚠️ Optional | Mapbox geocoding token | `pk.ey...` |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | ⚠️ Optional | MapTiler basemap key | `xxx...` |

---

## Database Setup

### 1. Provision PostgreSQL with PostGIS

**Railway:**
```bash
railway add -s postgres
railway run psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"
railway run psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

**Render:**
- Create PostgreSQL database from dashboard
- Enable PostGIS extension:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```

**Manual Setup (AWS RDS, DigitalOcean, etc.):**
```bash
# Connect to database
psql $DATABASE_URL

# Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Verify
SELECT PostGIS_Version();
```

### 2. Run Database Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL=postgres://user:password@host:5432/plottr_production

# Run migrations
npm run db:migrate

# Verify migrations
psql $DATABASE_URL -c "\dt"
```

Expected tables:
- `venues` (legacy)
- `pitches` (legacy)
- `sessions` (legacy)
- `sites`
- `layouts`
- `zones`
- `assets`
- `templates`
- `share_links`
- `knex_migrations`
- `knex_migrations_lock`

### 3. Seed Initial Data (Optional)

```bash
# Seed template data
npm run db:seed

# Or manually insert system templates
psql $DATABASE_URL -f src/db/seeds/0006_field_layouts.ts
```

---

## Backend Deployment

### Option 1: Railway

**1. Install Railway CLI:**
```bash
npm install -g @railway/cli
railway login
```

**2. Initialize Project:**
```bash
railway init
railway link
```

**3. Configure Environment:**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
railway variables set CORS_ORIGIN=https://plottr.example.com
railway variables set MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxx
```

**4. Deploy:**
```bash
railway up
```

**5. Get Deployment URL:**
```bash
railway domain
# Example: https://plottr-backend-production.up.railway.app
```

### Option 2: Render

**1. Create `render.yaml`:**
```yaml
services:
  - type: web
    name: plottr-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: plottr-db
          property: connectionString
      - key: CLERK_SECRET_KEY
        sync: false
      - key: CORS_ORIGIN
        value: https://plottr.example.com

databases:
  - name: plottr-db
    databaseName: plottr_production
    user: plottr_user
    plan: starter
    postgresMajorVersion: 16
```

**2. Deploy:**
- Connect GitHub repository
- Render auto-deploys on push to `main`

### Option 3: Manual (VPS, AWS EC2, etc.)

**1. Install Dependencies:**
```bash
# On server
git clone https://github.com/henckert/Plottr.git
cd Plottr
npm ci --production
```

**2. Build (if using TypeScript):**
```bash
npm run build
```

**3. Configure Process Manager (PM2):**
```bash
npm install -g pm2

pm2 start npm --name "plottr-backend" -- start
pm2 save
pm2 startup
```

**4. Configure Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name api.plottr.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**5. Enable SSL with Certbot:**
```bash
sudo certbot --nginx -d api.plottr.example.com
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended for Next.js)

**1. Install Vercel CLI:**
```bash
npm install -g vercel
vercel login
```

**2. Deploy:**
```bash
cd web
vercel --prod
```

**3. Configure Environment Variables:**
```bash
vercel env add NEXT_PUBLIC_API_BASE_URL production
# Enter: https://api.plottr.example.com

vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
# Enter: pk_live_xxxxxxxxxxxxxxxxxxxxx

vercel env add NEXT_PUBLIC_MAPTILER_API_KEY production
# Enter: xxxxxxxxxxxxxxxxxxxxx
```

**4. Set Custom Domain:**
```bash
vercel domains add plottr.example.com
```

### Option 2: Railway

**1. Create `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd web && npm ci && npm run build"

[deploy]
startCommand = "cd web && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "plottr-frontend"
```

**2. Deploy:**
```bash
railway up
```

### Option 3: Static Export (Netlify, Cloudflare Pages)

**1. Configure Next.js for Static Export:**
```javascript
// web/next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

**2. Build:**
```bash
cd web
npm run build
```

**3. Deploy `out/` directory to static host**

---

## Post-Deployment

### 1. Verify Health Checks

```bash
# Backend health
curl https://api.plottr.example.com/health
# Expected: {"ok":true,"timestamp":"...","uptime":...}

# Database health
curl https://api.plottr.example.com/healthz
# Expected: {"ok":true,"database":{"healthy":true,"latency":...}}

# API docs
curl https://api.plottr.example.com/api/docs
# Expected: HTML with Swagger UI
```

### 2. Test Authentication

```bash
# Try accessing protected endpoint
curl -H "Authorization: Bearer invalid_token" \
  https://api.plottr.example.com/api/sites
# Expected: 401 Unauthorized
```

### 3. Configure Clerk

**1. Set Production Domains:**
- Go to Clerk Dashboard → Settings → Domains
- Add frontend URL: `https://plottr.example.com`
- Add backend API URL: `https://api.plottr.example.com`

**2. Configure CORS:**
- Clerk Dashboard → Settings → API Keys
- Add allowed origins: `https://plottr.example.com`

### 4. Set Up Monitoring

**Railway:**
```bash
railway logs --tail
```

**Render:**
- View logs in dashboard under "Logs" tab

**Manual:**
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs plottr-backend
```

---

## Monitoring & Logging

### Application Logs

**Structured Logging Format:**
```json
{
  "timestamp": "2025-10-27T12:00:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "requestId": "abc123",
  "method": "GET",
  "path": "/api/sites",
  "status": 200,
  "duration": 45
}
```

**Log Levels:**
- `ERROR` - Application errors, exceptions
- `WARN` - Warnings, deprecations
- `INFO` - Important events (requests, authentication)
- `DEBUG` - Detailed debugging (disabled in production)

### Performance Metrics

**Key Metrics to Monitor:**
- API response time (target: <500ms p95)
- Database query time (target: <200ms p95)
- Error rate (target: <1%)
- Request rate (requests/second)
- Memory usage (Node.js heap)
- CPU usage

**Tools:**
- Railway/Render: Built-in metrics dashboard
- External: Datadog, New Relic, Sentry

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries (>1s)
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second';

-- Database size
SELECT pg_size_pretty(pg_database_size('plottr_production'));

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Backup & Recovery

### Automated Backups

**Railway:**
- Automatic daily backups included
- Restore via dashboard or CLI:
  ```bash
  railway db restore <backup-id>
  ```

**Render:**
- Automatic daily backups on paid plans
- Restore via support ticket

**Manual Backups:**
```bash
# Backup database
pg_dump $DATABASE_URL -F c -f plottr_backup_$(date +%Y%m%d).dump

# Upload to S3 (optional)
aws s3 cp plottr_backup_$(date +%Y%m%d).dump s3://plottr-backups/
```

### Restore Procedure

```bash
# Restore from dump file
pg_restore -d $DATABASE_URL --clean --if-exists plottr_backup_20251027.dump

# Or use psql
psql $DATABASE_URL < plottr_backup_20251027.sql
```

### Rollback Migrations

```bash
# Rollback last migration
npm run db:rollback

# Rollback to specific version
npm run db:rollback -- --to 0010

# Re-run migrations
npm run db:migrate
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Verify `DATABASE_URL` environment variable
- Check firewall rules (allow port 5432)
- Ensure PostgreSQL is running
- Check SSL requirements (`?sslmode=require`)

#### 2. PostGIS Extension Missing

**Symptom:**
```
ERROR: function ST_SetSRID does not exist
```

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### 3. Clerk Authentication Errors

**Symptom:**
```
401 Unauthorized: Invalid or expired token
```

**Solution:**
- Verify `CLERK_SECRET_KEY` is set correctly
- Check Clerk dashboard for API key status
- Ensure frontend is using correct publishable key
- Verify CORS settings in Clerk dashboard

#### 4. CORS Errors

**Symptom:**
```
Access to fetch at 'https://api.plottr.example.com' from origin 'https://plottr.example.com' has been blocked by CORS policy
```

**Solution:**
- Set `CORS_ORIGIN=https://plottr.example.com` in backend
- Ensure Helmet CSP allows frontend domain
- Check Clerk allowed origins

#### 5. Rate Limiting Issues

**Symptom:**
```
429 Too Many Requests
```

**Solution:**
- Increase rate limits in `src/middleware/rateLimitBypass.ts`
- Use API keys for higher limits (future feature)
- Implement exponential backoff in client

### Debug Mode

**Enable detailed logging:**
```bash
# Backend
LOG_LEVEL=DEBUG npm start

# Frontend
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Health Check Commands

```bash
# Test backend
curl -v https://api.plottr.example.com/health

# Test database connectivity
curl -v https://api.plottr.example.com/healthz

# Test API docs
curl -I https://api.plottr.example.com/api/docs

# Test frontend
curl -v https://plottr.example.com
```

---

## Support

- **Documentation:** https://henckert.github.io/Plottr/
- **API Docs:** https://api.plottr.example.com/api/docs
- **GitHub Issues:** https://github.com/henckert/Plottr/issues
- **Email:** support@plottr.example.com

---

**Last Updated:** October 27, 2025  
**Version:** 0.1.0
