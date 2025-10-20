#!/usr/bin/env pwsh
# Start backend in E2E mode
$env:E2E = "true"
$env:PORT = "3001"
$env:AUTH_REQUIRED = "false"
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/plottr_dev"

Write-Host "Starting backend in E2E mode on port 3001..." -ForegroundColor Cyan
npm run dev
