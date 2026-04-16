# C:\Users\Melody\Documents\Spotter\start-frontend.ps1
# Run this from the Spotter root folder: .\start-frontend.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  SPOTTER Frontend" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath

# Copy Windows env.local if missing
$envLocal = Join-Path $frontendPath ".env.local"
$envWindows = Join-Path $frontendPath ".env.local.windows"
if (-Not (Test-Path $envLocal)) {
    if (Test-Path $envWindows) {
        Copy-Item $envWindows $envLocal
        Write-Host ".env.local created" -ForegroundColor Green
    } else {
        # Create it inline
        "NEXT_PUBLIC_API_URL=http://localhost:8000/api" | Out-File -FilePath $envLocal -Encoding UTF8
        "NEXT_PUBLIC_APP_NAME=SPOTTER" | Add-Content -Path $envLocal -Encoding UTF8
        Write-Host ".env.local created" -ForegroundColor Green
    }
}

# Install node_modules if missing
$nodeModules = Join-Path $frontendPath "node_modules"
if (-Not (Test-Path $nodeModules)) {
    Write-Host "Installing npm packages (first time only)..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Starting Next.js on http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npm run dev
