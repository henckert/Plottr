# CI/CD Pipeline

This document describes the Plottr backend CI/CD setup and deployment strategy.

## GitHub Actions Workflow

### Overview

The CI pipeline runs automatically on:
- **Push to `main` or `develop`** branches
- **Pull requests** to `main` or `develop` branches
- **Manual trigger** via GitHub Actions

### Matrix Testing

Tests run against multiple Node.js versions to ensure compatibility:
- **Node 18 LTS** (Long-term support)
- **Node 20 LTS** (Latest LTS)

This ensures the application works across different Node versions developers might be using.

### Pipeline Stages

#### 1. Test Job (Runs on both Node 18 & 20)

**Services:**
- PostgreSQL 16 + PostGIS 3.4 (Docker container)
  - Health checks: `pg_isready` every 5 seconds
  - Timeout: 5 seconds per check, max 12 retries (60 seconds total)

**Steps:**
1. **Checkout code** - Clone the repository
2. **Setup Node.js** - Install specific Node version
3. **Install dependencies** - `npm ci` (clean install for reproducibility)
4. **Type check** - `npm run check:types` (TypeScript validation)
5. **Create test database**
   - Create `plottr_test` database
   - Enable PostGIS extension
   - Enable pgcrypto extension (for UUID generation)
6. **Run all tests** - `npm test` (unit + integration + migrations)
7. **Upload coverage** (Node 20 only) - Send to codecov.io

**Expected output:**
```
✅ All tests pass (158/158)
✅ TypeScript checks pass
✅ Database migrations work
```

#### 2. Code Quality Job (PRs only)

**Steps:**
1. **Checkout code**
2. **Setup Node.js** (20.x only)
3. **Install dependencies**
4. **Type check** - `npm run check:types`
5. **Comment on PR** - Add status summary to PR discussion

**Purpose:** Provide feedback to PR reviewers about code quality status.

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `test` | Run in test mode |
| `DATABASE_URL_TEST` | `postgres://...` | Test database connection |
| `MAPBOX_TOKEN` | `${{ secrets.MAPBOX_TOKEN }}` | Geocoding (optional, can be empty) |
| `PGPASSWORD` | `postgres` | PostgreSQL password |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |

### Secrets

Store in GitHub repository settings under **Settings → Secrets and variables → Actions**:

- **`MAPBOX_TOKEN`** (optional): Mapbox API token for geocoding
  - Leave empty if not testing geocoding features
  - Won't fail the build if missing

## Branch Protection Rules

Configure in **Settings → Branches → main**:

### Required Checks

✅ **All of the following must pass before merging to main:**

1. **CI / test (18.x)** - Tests pass on Node 18
2. **CI / test (20.x)** - Tests pass on Node 20
3. **Code review** - Minimum 1 approval required
4. **Up to date** - Branch must be up to date with main

### Rule Configuration

```
Branch name pattern: main

Required status checks:
✅ CI / test (18.x)
✅ CI / test (20.x)

Required reviews:
✅ 1 approval required
✅ Dismiss stale reviews when new commits pushed

Allow auto-merge:
☐ Allow auto-merge (disabled)
```

## Pull Request Workflow

### Creating a PR

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -am "feat: add feature"`
3. Push branch: `git push origin feature/my-feature`
4. Open PR on GitHub (select `main` as base branch)

### CI Checks

GitHub Actions automatically:
- Runs tests on Node 18 & 20
- Reports results on the PR
- Blocks merge if tests fail
- Comments with quality status

### Merging

**Before merge:**
- ✅ All CI checks pass
- ✅ Code review approved
- ✅ Branch is up to date with main

**To merge:**
1. Click "Squash and merge" button (preferred)
2. Confirm the merge

### After Merge

1. Branch automatically deleted
2. CI runs on `main` (final verification)
3. Code is ready to deploy

## Local Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Migrations only
npm run test:migrations
```

### Test with Different Node Versions

Using Node Version Manager (nvm):

```bash
# Switch to Node 18
nvm use 18

# Run tests
npm test

# Switch to Node 20
nvm use 20

# Run tests again
npm test
```

## Deployment Strategy

### Environments

| Environment | Branch | Database | Status |
|-------------|--------|----------|--------|
| Local | - | `plottr` | Development |
| Test | - | `plottr_test` | Testing |
| CI | main/develop | `plottr_test` (ephemeral) | Automated |
| Staging | (future) | `plottr_staging` | Pre-production |
| Production | (future) | `plottr` | Live |

### Current State

- **Local**: Manual `docker compose up -d`
- **CI**: Automatic via GitHub Actions
- **Production**: Manual deployment (when ready)

### Future Deployment

When ready to deploy:

1. **Staging Environment**
   - Deploy to staging branch
   - Run full test suite
   - Manual verification

2. **Production Deployment**
   - Tag release: `git tag v1.0.0`
   - GitHub Actions deploys tagged commit
   - Database migrations run automatically
   - Zero-downtime deployment

## Troubleshooting CI Failures

### "Tests timeout after 30 seconds"

**Cause:** PostgreSQL service not ready

**Solution:**
- Check service logs in GitHub Actions
- Verify health checks: `pg_isready` 
- May be transient; retry PR

### "Type check failed"

**Cause:** TypeScript compilation error

**Solution:**
```bash
# Run locally
npm run check:types

# Fix any issues
# Commit and push
```

### "Database migration failed"

**Cause:** Migration incompatibility or schema issue

**Solution:**
```bash
# Check migration status locally
npm run migrate

# If migration broken, rollback
npm run migrate:rollback

# Fix migration file
# Run again
npm run migrate
```

### "Dependency install failed"

**Cause:** npm cache issues or incompatible versions

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install

# Commit package-lock.json
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

## Monitoring & Alerts

### GitHub Actions Checks

- Accessible via **Actions** tab on repository
- Shows detailed logs for each step
- Downloadable artifacts (if configured)

### PR Status

- Check mark (✅) = All checks pass
- X mark (❌) = Some checks failed
- Details available by clicking "Details"

### Email Notifications

Receive notifications for:
- PR review requests
- Failed CI checks
- Successful deployments

Configure in **Settings → Notifications**.

## Performance

### Build Time

- Install dependencies: ~30-45 seconds
- Type checking: ~5-10 seconds
- Database setup: ~10-15 seconds
- Run tests: ~10-15 seconds

**Total per Node version: ~60-80 seconds**
**Both versions (matrix): ~120-160 seconds**

### Optimization Tips

- Use `npm ci` (not `npm install`) for reproducibility
- Cache npm dependencies (GitHub Actions does this automatically)
- Consider splitting tests into multiple jobs for faster feedback

## Adding New Tests

When adding tests:

1. **Write tests locally**: `npm test -- tests/new.test.ts`
2. **Ensure they pass**: All tests should pass before committing
3. **Commit tests**: Include test files in commit
4. **CI runs automatically**: GitHub Actions will run all tests
5. **PR shows results**: Status appears on the PR

## Best Practices

✅ **Do:**
- Run tests locally before pushing
- Keep tests fast and isolated
- Use descriptive commit messages
- Ensure all checks pass before requesting review
- Review CI logs if tests fail

❌ **Don't:**
- Push untested code to main
- Disable CI checks
- Commit without running `npm test` locally
- Force push to main branch

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PostgreSQL Docker Image](https://hub.docker.com/r/postgis/postgis)
- [Node.js Releases](https://nodejs.org/en/about/releases/)

---

**Questions?** Check the README.md or create a GitHub issue. 🚀
