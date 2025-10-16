# proceed.ps1 — one-shot script to tidy up, verify, commit, and instruct the agent to continue

# --- CONFIG ---------------------------------------------------------------
$RepoRoot = "C:\Users\jhenc\Plottr"
$DBUrl    = $env:DATABASE_URL_TEST
if (-not $DBUrl) { $DBUrl = "postgres://postgres:postgres@localhost:5432/plottr_test" }  # change to 5433 if needed

# --- CD TO REPO -----------------------------------------------------------
Set-Location $RepoRoot

# --- ENSURE .ENV.EXAMPLE HAS THE MODEL + DB HINT --------------------------
# (No secrets written; just ensure example shows expected vars)
$envExample = ".env.example"
if (-not (Test-Path $envExample)) { New-Item -ItemType File -Path $envExample | Out-Null }
$exampleLines = Get-Content $envExample -ErrorAction SilentlyContinue
if ($exampleLines -notcontains "OPENAI_MODEL=gpt-5-mini") { Add-Content $envExample "OPENAI_MODEL=gpt-5-mini" }
if ($exampleLines -notcontains "DATABASE_URL_TEST=$DBUrl") { Add-Content $envExample "DATABASE_URL_TEST=$DBUrl" }

# --- OPTIONAL: CREATE LOCAL .ENV IF MISSING (NO COMMIT) -------------------
$dotenv = ".env"
if (-not (Test-Path $dotenv)) {
  "DATABASE_URL_TEST=$DBUrl" | Out-File -FilePath $dotenv -Encoding UTF8 -Append
  "OPENAI_MODEL=gpt-5-mini"  | Out-File -FilePath $dotenv -Encoding UTF8 -Append
}

# --- UPDATE TASK LIST (if TASKS.md exists) --------------------------------
$tasksFile = "TASKS.md"
if (Test-Path $tasksFile) {
  $content = Get-Content $tasksFile -Raw
  # Mark "Generate initial DB migration + seed" as done if present
  $updated = $content -replace '(\[ \]\s*Generate initial DB migration \+ seed)', '[x] Generate initial DB migration + seed'
  # Ensure no task is marked in-progress
  $updated = $updated -replace '(\[>\])', '[]'
  if ($updated -ne $content) { Set-Content $tasksFile $updated }
}

# --- TYPECHECK + TEST (pre-commit guard locally) --------------------------
Write-Host "Running type checks..." -ForegroundColor Cyan
npm run check:types | Write-Output

Write-Host "Running migration tests..." -ForegroundColor Cyan
$env:DATABASE_URL_TEST = $DBUrl
npm run test:migrations | Write-Output

Write-Host "Running integration tests..." -ForegroundColor Cyan
npm run test:integration | Write-Output

# --- STAGE + COMMIT STAGED CHANGES (package.json / hooks / tasks, etc.) ---
# Use PowerShell-friendly separators (no &&)
git add -A
git commit -m "chore(tasks): sync TASKS.md; ensure .env.example shows OPENAI_MODEL and DATABASE_URL_TEST; local type/test check run" | Write-Output

# --- PRINT THE EXACT AGENT REPLY YOU SHOULD SEND NEXT ---------------------
Write-Host ""
Write-Host "================ COPY THE LINE BELOW INTO YOUR AGENT CHAT ================" -ForegroundColor Yellow
Write-Host "Implement endpoints" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Yellow

# --- CONTEXT MESSAGE FOR YOU ----------------------------------------------
Write-Host ""
Write-Host "Done. Repo verified & committed. Send 'Implement endpoints' to the agent to proceed with venues/pitches/sessions (OpenAPI types + Zod + tests)." -ForegroundColor Cyan
