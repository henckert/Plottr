# Plottr Development Environment Setup for PowerShell
# This script fixes npm/npx shim issues and sets up local development environment

Write-Host "Plottr Development Environment Setup" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Fix npm/npx PowerShell shim issues by aliasing to .cmd versions
Write-Host "Fixing npm/npx PowerShell compatibility..." -ForegroundColor Cyan
Remove-Item Alias:npm  -ErrorAction SilentlyContinue
Remove-Item Alias:npx  -ErrorAction SilentlyContinue
Set-Alias npm "$env:ProgramFiles\nodejs\npm.cmd"
Set-Alias npx "$env:ProgramFiles\nodejs\npx.cmd"

# Set local development environment variables
Write-Host "Setting environment variables..." -ForegroundColor Cyan
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://plottr:plottrpass@localhost:5432/plottr_dev"
$env:DATABASE_URL_TEST = "postgresql://plottr:plottrpass@localhost:5432/plottr_test"
$env:MAPBOX_TOKEN = ""
$env:PORT = "3000"

# Display current setup
Write-Host ""
Write-Host "Current Configuration:" -ForegroundColor Green
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Yellow
Write-Host "  DATABASE_URL_TEST: $env:DATABASE_URL_TEST" -ForegroundColor Yellow
Write-Host "  MAPBOX_TOKEN: $(if ($env:MAPBOX_TOKEN) { 'configured' } else { 'not set (OK for tests)' })" -ForegroundColor Yellow
Write-Host "  PORT: $env:PORT" -ForegroundColor Yellow

# Quick reference
Write-Host ""
Write-Host "Quick Start Commands:" -ForegroundColor Green
Write-Host "  npm install              - Install dependencies" -ForegroundColor Cyan
Write-Host "  npm run migrate          - Run database migrations" -ForegroundColor Cyan
Write-Host "  npm run seed             - Load seed data" -ForegroundColor Cyan
Write-Host "  npm run dev              - Start dev server (localhost:3000)" -ForegroundColor Cyan
Write-Host "  npm test                 - Run test suite" -ForegroundColor Cyan
Write-Host "  npm run check:types      - TypeScript validation" -ForegroundColor Cyan

# Docker commands
Write-Host ""
Write-Host "Docker Commands:" -ForegroundColor Green
Write-Host "  docker compose up -d     - Start PostgreSQL+PostGIS" -ForegroundColor Cyan
Write-Host "  docker compose down      - Stop PostgreSQL" -ForegroundColor Cyan
Write-Host "  docker compose logs      - View database logs" -ForegroundColor Cyan

Write-Host ""
Write-Host "Environment ready! You can now use npm/npx normally." -ForegroundColor Green
Write-Host ""
