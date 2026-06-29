# Discord Clone - Database Setup Script
# Run this script to automatically setup the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Discord Clone - Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlExists) {
    Write-Host "❌ PostgreSQL not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL found" -ForegroundColor Green

# Ask for credentials
Write-Host ""
Write-Host "Enter PostgreSQL credentials:" -ForegroundColor Yellow
$username = Read-Host "Username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($username)) {
    $username = "postgres"
}

$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

$dbname = "discord_clone"

Write-Host ""
Write-Host "Creating database '$dbname'..." -ForegroundColor Yellow

# Create database
$env:PGPASSWORD = $passwordPlain
$createDbCommand = "CREATE DATABASE $dbname;"
$createResult = Write-Output $createDbCommand | psql -U $username -h localhost -p 5432 postgres 2>&1

if ($LASTEXITCODE -ne 0) {
    if ($createResult -like "*already exists*") {
        Write-Host "⚠️  Database already exists, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to create database:" -ForegroundColor Red
        Write-Host $createResult
        exit 1
    }
} else {
    Write-Host "✅ Database created" -ForegroundColor Green
}

# Run schema
Write-Host ""
Write-Host "Running database schema..." -ForegroundColor Yellow

$schemaPath = Join-Path $PSScriptRoot "database\schema.sql"
if (-not (Test-Path $schemaPath)) {
    Write-Host "❌ Schema file not found: $schemaPath" -ForegroundColor Red
    exit 1
}

$schemaResult = psql -U $username -h localhost -p 5432 -d $dbname -f $schemaPath 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to run schema:" -ForegroundColor Red
    Write-Host $schemaResult
    exit 1
}

Write-Host "✅ Schema applied successfully" -ForegroundColor Green

# Update .env file
Write-Host ""
Write-Host "Updating backend/.env with database URL..." -ForegroundColor Yellow

$envPath = Join-Path $PSScriptRoot "backend\.env"
$databaseUrl = "postgresql://${username}:${passwordPlain}@localhost:5432/$dbname"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$databaseUrl"
    Set-Content -Path $envPath -Value $envContent
    Write-Host "✅ .env file updated" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, skipping..." -ForegroundColor Yellow
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Database Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd backend" -ForegroundColor White
Write-Host "  2. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  In another terminal:" -ForegroundColor Yellow
Write-Host "  3. cd frontend" -ForegroundColor White
Write-Host "  4. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Then open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
