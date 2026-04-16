# C:\Users\Melody\Documents\Spotter\start-backend.ps1
# Run this from the Spotter root folder: .\start-backend.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  SPOTTER Backend" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

# Activate virtual environment
$venvActivate = Join-Path $backendPath "venv\Scripts\Activate.ps1"
if (-Not (Test-Path $venvActivate)) {
    Write-Host "Virtual environment not found. Creating it now..." -ForegroundColor Yellow
    python -m venv venv
    & $venvActivate
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic pydantic pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" python-multipart httpx redis "celery[redis]" meilisearch python-dotenv pillow reportlab jinja2
} else {
    & $venvActivate
}

# Copy Windows env if .env doesn't exist
$envFile = Join-Path $backendPath ".env"
$envWindows = Join-Path $backendPath ".env.windows"
if (-Not (Test-Path $envFile)) {
    if (Test-Path $envWindows) {
        Copy-Item $envWindows $envFile
        Write-Host ".env created from .env.windows" -ForegroundColor Green
    }
}

# Create uploads folder
$uploadsPath = Join-Path $backendPath "uploads"
if (-Not (Test-Path $uploadsPath)) {
    New-Item -ItemType Directory -Path $uploadsPath | Out-Null
    Write-Host "Created uploads folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting FastAPI on http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs at http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start the server — tables auto-create on first run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
