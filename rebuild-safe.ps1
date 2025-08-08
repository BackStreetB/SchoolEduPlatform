# Safe rebuild script for School Platform (PowerShell)
# This script creates a backup before rebuilding containers

Write-Host "🚀 Starting safe rebuild process..." -ForegroundColor Green

# Create backup before rebuilding
Write-Host "📦 Creating backup before rebuild..." -ForegroundColor Yellow
& .\backup.sh

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed! Aborting rebuild..." -ForegroundColor Red
    exit 1
}

# Ask user which services to rebuild
Write-Host ""
Write-Host "🔧 Which services do you want to rebuild?" -ForegroundColor Cyan
Write-Host "1) All services"
Write-Host "2) Frontend only"
Write-Host "3) Auth service only"
Write-Host "4) Teacher service only"
Write-Host "5) Community service only"
Write-Host "6) Diary service only"
Write-Host "7) Event service only"
Write-Host "8) Report service only"
Write-Host "9) Cancel"
Write-Host ""
$choice = Read-Host "Enter your choice (1-9)"

switch ($choice) {
    "1" {
        Write-Host "🔄 Rebuilding all services..." -ForegroundColor Yellow
        docker-compose build --no-cache
        docker-compose up -d
    }
    "2" {
        Write-Host "🔄 Rebuilding frontend..." -ForegroundColor Yellow
        docker-compose build --no-cache frontend
        docker-compose up -d frontend
    }
    "3" {
        Write-Host "🔄 Rebuilding auth service..." -ForegroundColor Yellow
        docker-compose build --no-cache auth-service
        docker-compose up -d auth-service
    }
    "4" {
        Write-Host "🔄 Rebuilding teacher service..." -ForegroundColor Yellow
        docker-compose build --no-cache teacher-service
        docker-compose up -d teacher-service
    }
    "5" {
        Write-Host "🔄 Rebuilding community service..." -ForegroundColor Yellow
        docker-compose build --no-cache community-service
        docker-compose up -d community-service
    }
    "6" {
        Write-Host "🔄 Rebuilding diary service..." -ForegroundColor Yellow
        docker-compose build --no-cache diary-service
        docker-compose up -d diary-service
    }
    "7" {
        Write-Host "🔄 Rebuilding event service..." -ForegroundColor Yellow
        docker-compose build --no-cache event-service
        docker-compose up -d event-service
    }
    "8" {
        Write-Host "🔄 Rebuilding report service..." -ForegroundColor Yellow
        docker-compose build --no-cache report-service
        docker-compose up -d report-service
    }
    "9" {
        Write-Host "❌ Rebuild cancelled." -ForegroundColor Red
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Rebuild completed successfully!" -ForegroundColor Green
    Write-Host "📊 Checking service status..." -ForegroundColor Cyan
    docker-compose ps
} else {
    Write-Host "❌ Rebuild failed!" -ForegroundColor Red
    Write-Host "💡 You can restore from backup using: .\restore.sh <backup_file>" -ForegroundColor Yellow
    exit 1
} 