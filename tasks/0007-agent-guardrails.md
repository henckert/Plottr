# Agent Orchestration Guardrails

**Purpose:** Prevent blocking operations during environment validation and development workflow.

---

## Environment Validation Rules

### ✅ Allowed Commands (Fast, Non-Blocking)
```bash
# Type checking (1-3 seconds)
npm run check:types

# Jest test discovery only (no execution, <2 seconds)
jest --listTests

# Preflight check (type check + discovery, <5 seconds)
npm run preflight

# Docker health check (instant)
docker ps --filter "name=plottr_postgres"
docker inspect --format "{{.State.Health.Status}}" plottr_postgres

# Database connectivity test (1-2 seconds)
docker exec plottr_postgres psql -U postgres -d plottr_dev -c "SELECT PostGIS_Version();"
```

### ⚠️ Use Sparingly (Capped Execution)
```bash
# Capped unit test run with open handle detection (10-15 seconds)
npm run test:unit -- --detectOpenHandles --testTimeout=15000 --runInBand 2>&1 | Select-Object -Last 60

# Single test file execution (5-10 seconds)
npm test -- tests/unit/pagination.test.ts --silent
```

### ❌ Avoid Unless Explicitly Requested
```bash
# Full test suite (20-30 seconds, blocks workflow)
npm test

# Full test suite with detection (40-60 seconds)
npm run test:detect

# Integration tests (15-25 seconds)
npm run test:integration
```

---

## Native Module Installation Rules

### Sharp Image Processing
- **Status:** Optional for TASK 5 (PNG exports)
- **Action:** If installation triggers native build warnings/errors, skip and continue
- **Fallback:** Document as known issue, defer to manual setup or html2canvas alternative
- **Command Safety:**
  ```bash
  # Safe install attempt with timeout
  npm install sharp --save --ignore-scripts || echo "Sharp build failed, continuing without PNG export support"
  ```

### Other Native Dependencies
- Always check if module is critical path blocker
- If optional, document and continue without
- If required, pause and ask user before multi-minute builds

---

## Long-Running Operation Rules

### Pause Triggers
- Any command estimated >30 seconds execution time
- Native module builds (node-gyp, Python bindings)
- Database migrations on large datasets
- Docker image builds (except cached pulls)

### Approval Protocol
```markdown
⏸️ **PAUSE - Long Operation Detected**

Command: `npm install sharp`
Estimated Time: 2-5 minutes (native bindings compile)
Required For: TASK 5 (PNG Export), optional for TASK 1-4
Fallback: Client-side html2canvas export

Proceed? (y/n)
```

---

## Database Health Check Protocol

### Standard Health Check (No Blind Sleeps)
```powershell
# Check if container exists and is healthy
$state = docker inspect --format "{{.State.Health.Status}}" plottr_postgres 2>$null

if ($state -eq "healthy") {
  Write-Output "✅ PostgreSQL ready"
} elseif ($state -eq "starting") {
  Write-Output "⏳ PostgreSQL starting, waiting..."
  # Poll with timeout (max 60s)
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    $state = docker inspect --format "{{.State.Health.Status}}" plottr_postgres 2>$null
    if ($state -eq "healthy") { break }
    Start-Sleep -Seconds 2
  }
  if ($state -ne "healthy") {
    throw "PostgreSQL not healthy after 60s"
  }
} else {
  throw "PostgreSQL container not running or unhealthy: $state"
}
```

### Never Use
```bash
# ❌ Blind sleep without health check
Start-Sleep -Seconds 10  # Bad: no verification, wastes time
docker compose up -d && sleep 15  # Bad: hardcoded delay
```

---

## Workflow Integration

### Pre-Commit (Husky)
- ✅ Type check: `npm run check:types` (~2s)
- ✅ Unit tests only: `npm run test:unit` (~5s)
- ❌ Full test suite: Too slow for pre-commit hook

### Pre-Push (Manual)
- ✅ Full test suite: `npm test` (~30s)
- ✅ Integration tests: `npm run test:integration` (~20s)
- User decides timing (not automated)

### CI/CD (GitHub Actions)
- ✅ Full suite: Tests run on remote runners
- ✅ Coverage upload: Non-blocking for developer
- ❌ Local emulation: Don't run full CI checks locally

---

## Agent Self-Check Prompt Injection

**Append to orchestration instructions:**

> Environment validation must use discovery-only (`jest --listTests`) or capped test runs (`npm run test:unit -- --detectOpenHandles --testTimeout=15000`). Avoid long, blocking commands by default. If a native build or long CI step is required (>30s), pause and ask user approval. Use Docker health checks instead of blind sleeps. Treat Sharp as optional; skip if build fails.

---

## Summary Checklist

Before running any command, verify:
- [ ] Is this a blocking operation (>30s)?
- [ ] Can I use discovery/type-check instead of full tests?
- [ ] Is Docker health already verified (don't re-check)?
- [ ] Is this module optional (can I skip if build fails)?
- [ ] Am I about to run a blind sleep (use health polling instead)?

**Default to fast, idempotent operations. Pause for approval on long/risky steps.**
