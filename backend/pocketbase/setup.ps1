<# 
    PocketBase Setup Script for Smart Attendance System
    Run this script from the backend/pocketbase directory.
    
    Usage: .\setup.ps1
#>

$ErrorActionPreference = "Stop"
$PB_VERSION = "0.25.9"
$PB_DIR = $PSScriptRoot
if (-not $PB_DIR) { $PB_DIR = Get-Location }
$PB_HTTP_ADDR = "0.0.0.0:8090"

function Get-PrimaryLanIp {
    try {
        $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object {
                $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                -not $_.IPAddressToString.StartsWith("127.")
            }
        if ($ips -and $ips.Count -gt 0) {
            return $ips[0].IPAddressToString
        }
    } catch {
        return $null
    }

    return $null
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Smart Attendance System - PocketBase" -ForegroundColor Cyan
Write-Host "  Setup Script v1.0" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Download PocketBase ----
$PB_EXE = Join-Path $PB_DIR "pocketbase.exe"

if (Test-Path $PB_EXE) {
    Write-Host "[OK] PocketBase already downloaded." -ForegroundColor Green
} else {
    Write-Host "[1/4] Downloading PocketBase v$PB_VERSION..." -ForegroundColor Yellow

    $ARCH = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
    $URL = "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_windows_${ARCH}.zip"
    $ZIP_PATH = Join-Path $PB_DIR "pocketbase.zip"

    try {
        Invoke-WebRequest -Uri $URL -OutFile $ZIP_PATH -UseBasicParsing
        Write-Host "  Downloaded successfully." -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Failed to download PocketBase." -ForegroundColor Red
        Write-Host "  Please download manually from: https://pocketbase.io/docs/" -ForegroundColor Red
        Write-Host "  URL attempted: $URL" -ForegroundColor Gray
        exit 1
    }

    Write-Host "  Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $ZIP_PATH -DestinationPath $PB_DIR -Force
    Remove-Item $ZIP_PATH -Force
    Write-Host "  Extracted." -ForegroundColor Green
}

# ---- Step 2: Verify directory structure ----
Write-Host ""
Write-Host "[2/4] Verifying directory structure..." -ForegroundColor Yellow

$requiredDirs = @("pb_hooks", "pb_migrations")
foreach ($dir in $requiredDirs) {
    $dirPath = Join-Path $PB_DIR $dir
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        Write-Host "  Created: $dir/" -ForegroundColor Gray
    } else {
        Write-Host "  [OK] $dir/" -ForegroundColor Green
    }
}

# ---- Step 3: List hooks files ----
Write-Host ""
Write-Host "[3/4] Checking hooks files..." -ForegroundColor Yellow

$hooksDir = Join-Path $PB_DIR "pb_hooks"
$hookFiles = Get-ChildItem -Path $hooksDir -Filter "*.js" -ErrorAction SilentlyContinue
if ($hookFiles.Count -gt 0) {
    foreach ($f in $hookFiles) {
        Write-Host "  [OK] pb_hooks/$($f.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  [WARN] No hook files found in pb_hooks/" -ForegroundColor Yellow
}

$migrationsDir = Join-Path $PB_DIR "pb_migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.js" -ErrorAction SilentlyContinue
if ($migrationFiles.Count -gt 0) {
    foreach ($f in $migrationFiles) {
        Write-Host "  [OK] pb_migrations/$($f.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  [INFO] No migration files found (use Admin UI to import pb_schema.json instead)" -ForegroundColor Gray
}

# ---- Step 4: Start PocketBase ----
Write-Host ""
Write-Host "[4/4] Starting PocketBase..." -ForegroundColor Yellow
Write-Host ""
$LAN_IP = Get-PrimaryLanIp
$LOCAL_URL = "http://127.0.0.1:8090"
$LAN_URL = if ($LAN_IP) { "http://$LAN_IP:8090" } else { $null }

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  PocketBase will start on:" -ForegroundColor White
Write-Host "    API:   $LOCAL_URL" -ForegroundColor White
Write-Host "    Admin: $LOCAL_URL/_/" -ForegroundColor White
if ($LAN_URL) {
    Write-Host "    LAN:   $LAN_URL" -ForegroundColor Green
    Write-Host "    LAN Admin: $LAN_URL/_/" -ForegroundColor Green
}
Write-Host "" 
Write-Host "  First time? Create admin account at:" -ForegroundColor White
Write-Host "    $LOCAL_URL/_/#/login" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Then import schema from:" -ForegroundColor White
Write-Host "    Settings > Import Collections" -ForegroundColor Yellow
Write-Host "    File: pb_schema.json" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Custom endpoints available:" -ForegroundColor White
Write-Host "    POST /api/custom/start-session" -ForegroundColor Gray
Write-Host "    POST /api/custom/record-attendance" -ForegroundColor Gray
Write-Host "    POST /api/custom/end-session" -ForegroundColor Gray
Write-Host "    GET  /api/custom/attendance-report" -ForegroundColor Gray
Write-Host "    GET  /api/custom/student-warnings" -ForegroundColor Gray
Write-Host "    GET  /api/custom/health" -ForegroundColor Gray
Write-Host "    GET  /api/custom/dashboard-stats" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

& $PB_EXE serve --http="$PB_HTTP_ADDR" --hooksDir="$hooksDir" --migrationsDir="$migrationsDir"
