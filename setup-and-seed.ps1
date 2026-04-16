# C:\Users\Melody\Documents\Spotter\setup-and-seed.ps1
# Run ONCE after installing Python, Node, PostgreSQL, Redis
# Usage: .\setup-and-seed.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  SPOTTER - First-Time Setup" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

$rootPath    = $PSScriptRoot
$backendPath = Join-Path $rootPath "backend"

# ── 1. Create .env ────────────────────────────────────────────────────────
$envFile    = Join-Path $backendPath ".env"
$envWindows = Join-Path $backendPath ".env.windows"
$envExample = Join-Path $backendPath ".env.example"

if (-Not (Test-Path $envFile)) {
    $template = if (Test-Path $envWindows) { $envWindows } else { $envExample }
    Copy-Item $template $envFile
    Write-Host "✓ .env created from template" -ForegroundColor Green
    Write-Host "  Edit $envFile to set your PostgreSQL password if needed" -ForegroundColor Yellow
} else {
    Write-Host "  .env already exists — skipping" -ForegroundColor Gray
}

# ── 2. Python virtual environment ────────────────────────────────────────
Set-Location $backendPath
$venvPath = Join-Path $backendPath "venv"

if (-Not (Test-Path $venvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

$activate = Join-Path $venvPath "Scripts\Activate.ps1"
& $activate

Write-Host "Installing Python packages..." -ForegroundColor Yellow
pip install --quiet -r requirements.txt
Write-Host "✓ Python packages installed" -ForegroundColor Green

# ── 3. Uploads folder ────────────────────────────────────────────────────
$uploadsPath = Join-Path $backendPath "uploads"
if (-Not (Test-Path $uploadsPath)) {
    New-Item -ItemType Directory -Path $uploadsPath | Out-Null
}
Write-Host "✓ uploads/ folder ready" -ForegroundColor Green

# ── 4. Run Alembic migrations ────────────────────────────────────────────
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow

$env:PYTHONPATH = $backendPath
alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database tables created" -ForegroundColor Green
} else {
    Write-Host "⚠ Migration failed. Check PostgreSQL is running and .env is correct." -ForegroundColor Red
    Write-Host "  Then re-run this script." -ForegroundColor Red
    exit 1
}

# ── 5. Seed default data ─────────────────────────────────────────────────
Write-Host "Seeding default accounts and matching weights..." -ForegroundColor Yellow
python -m app.seed

# ── 6. Frontend packages ─────────────────────────────────────────────────
$frontendPath = Join-Path $rootPath "frontend"
Set-Location $frontendPath

$envLocal = Join-Path $frontendPath ".env.local"
if (-Not (Test-Path $envLocal)) {
    $envLocalExample = Join-Path $frontendPath ".env.example"
    if (Test-Path $envLocalExample) {
        Copy-Item $envLocalExample $envLocal
    } else {
        "NEXT_PUBLIC_API_URL=http://localhost:8000/api`nNEXT_PUBLIC_APP_NAME=SPOTTER" |
            Out-File -FilePath $envLocal -Encoding UTF8
    }
    Write-Host "✓ frontend .env.local created" -ForegroundColor Green
}

$nodeModules = Join-Path $frontendPath "node_modules"
if (-Not (Test-Path $nodeModules)) {
    Write-Host "Installing npm packages (this takes ~1 minute)..." -ForegroundColor Yellow
    npm install --silent
}
Write-Host "✓ npm packages ready" -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Default accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@spotter.ng   / Admin@1234" -ForegroundColor White
Write-Host "  Spotter: spotter@spotter.ng / Spotter@1234" -ForegroundColor White
Write-Host ""
Write-Host "Open TWO PowerShell windows and run:" -ForegroundColor Cyan
Write-Host "  Window 1:  cd $rootPath; .\start-backend.ps1" -ForegroundColor White
Write-Host "  Window 2:  cd $rootPath; .\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Then open:" -ForegroundColor Cyan
Write-Host "  App:      http://localhost:3000" -ForegroundColor Green
Write-Host "  API Docs: http://localhost:8000/api/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Read TESTING_GUIDE.md for the full test walkthrough." -ForegroundColor Yellow
Write-Host ""
