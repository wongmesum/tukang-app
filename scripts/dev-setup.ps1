# TukangNDeso Dev Setup Script
# Seeds demo data and opens admin panel in browser
# Usage: .\scripts\dev-setup.ps1

$API = "http://localhost:3000"
$ADMIN = "http://localhost:5173"

Write-Host "`n=== TukangNDeso Dev Setup ===`n" -ForegroundColor Cyan

# 1. Check if API is running
Write-Host "Checking API..." -NoNewline
try {
    $health = Invoke-RestMethod -Uri "$API/v1/categories" -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "`nAPI tidak berjalan. Jalankan dulu:"
    Write-Host "  cd api"
    Write-Host "  bun src/server.ts" -ForegroundColor Yellow
    Write-Host "`nDengan env:"
    Write-Host '  $env:REPOSITORY_MODE = "memory"'
    Write-Host '  $env:DATABASE_URL = "postgresql://x:x@localhost:5432/x"'
    Write-Host '  $env:JWT_SECRET = "dev-secret-tukangndeso-local-2026"'
    Write-Host '  $env:QRIS_WEBHOOK_SECRET = "dev-webhook-secret"'
    exit 1
}

# 2. Seed demo data
Write-Host "Seeding demo data..." -NoNewline
$seed = Invoke-RestMethod -Uri "$API/dev/seed/demo" -Method POST
Write-Host " OK" -ForegroundColor Green

# 3. Print credentials
Write-Host "`n--- AKUN DEMO ---" -ForegroundColor Yellow
Write-Host "`n[ADMIN]"
Write-Host "  Phone: $($seed.data.admin.phone)"
Write-Host "  Token: $($seed.data.admin.token.Substring(0, 50))..."

Write-Host "`n[CUSTOMER]"
foreach ($c in $seed.data.customers) {
    Write-Host "  $($c.phone) - $($c.name)"
}

Write-Host "`n[TUKANG]"
foreach ($w in $seed.data.workers) {
    Write-Host "  $($w.phone) - $($w.name) [$($w.skills -join ', ')]"
}

# 4. Save admin token for easy access
$adminToken = $seed.data.admin.token
Write-Host "`n--- ADMIN TOKEN (copy ke browser localStorage) ---" -ForegroundColor Cyan
Write-Host "localStorage.setItem('admin_token', '$adminToken')" -ForegroundColor White

# 5. Open browser
Write-Host "`nMembuka admin panel..." -ForegroundColor Green
Start-Process "$ADMIN"

Write-Host "`n=== Setup selesai! ===`n" -ForegroundColor Cyan
Write-Host "API:   $API"
Write-Host "Admin: $ADMIN"
Write-Host "`nUntuk login admin panel:"
Write-Host "1. Buka $ADMIN/login"
Write-Host "2. Masukkan HP: $($seed.data.admin.phone)"
Write-Host "3. Lihat OTP di terminal API"
Write-Host "`nAtau langsung paste di browser console:"
Write-Host "  localStorage.setItem('admin_token', '$adminToken')" -ForegroundColor Yellow
Write-Host "  location.reload()" -ForegroundColor Yellow
