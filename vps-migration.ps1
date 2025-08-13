# VPS Migration Script - Full Backup
# Tạo backup hoàn chỉnh trước khi migration

Write-Host "🚀 STARTING VPS MIGRATION BACKUP..." -ForegroundColor Green

# Tạo thư mục backup với timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "migration_backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force

Write-Host "📁 Created backup directory: $backupDir" -ForegroundColor Yellow

# 1. BACKUP DATABASE
Write-Host "🗄️  Backing up PostgreSQL database..." -ForegroundColor Cyan
docker exec school_postgres pg_dumpall -U postgres > "$backupDir/full_database_backup.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database backup completed" -ForegroundColor Green
} else {
    Write-Host "❌ Database backup failed!" -ForegroundColor Red
    exit 1
}

# 2. BACKUP DOCKER VOLUMES (User uploads, etc.)
Write-Host "📎 Backing up Docker volumes..." -ForegroundColor Cyan

# Community uploads
if (Test-Path "community_uploads") {
    Copy-Item -Path "community_uploads" -Destination "$backupDir/community_uploads" -Recurse -Force
    Write-Host "✅ Community uploads backed up" -ForegroundColor Green
}

# Teacher uploads  
if (Test-Path "teacher_uploads") {
    Copy-Item -Path "teacher_uploads" -Destination "$backupDir/teacher_uploads" -Recurse -Force
    Write-Host "✅ Teacher uploads backed up" -ForegroundColor Green
}

# Any other volumes
$volumes = docker volume ls --format "{{.Name}}"
foreach ($volume in $volumes) {
    if ($volume -like "*school*" -or $volume -like "*postgres*") {
        Write-Host "📦 Found volume: $volume" -ForegroundColor Yellow
    }
}

# 3. BACKUP CONFIGURATION FILES
Write-Host "⚙️  Backing up configuration files..." -ForegroundColor Cyan
Copy-Item -Path "docker-compose.yml" -Destination "$backupDir/" -Force
Copy-Item -Path ".env" -Destination "$backupDir/" -Force -ErrorAction SilentlyContinue

# Backup service configs
$services = @("auth-service", "teacher-service", "community-service", "event-service", "diary-service", "report-service", "frontend")
foreach ($service in $services) {
    if (Test-Path $service) {
        Copy-Item -Path $service -Destination "$backupDir/$service" -Recurse -Force
        Write-Host "✅ $service config backed up" -ForegroundColor Green
    }
}

# 4. CREATE MIGRATION INFO FILE
@"
VPS MIGRATION BACKUP
Created: $(Get-Date)
Source: Local Development Environment
Database: PostgreSQL with all tables and data
Volumes: community_uploads, teacher_uploads
Services: auth, teacher, community, event, diary, report, frontend

MIGRATION STEPS:
1. Setup VPS with Docker & Docker Compose
2. Clone GitHub repository
3. Restore database: psql -U postgres < full_database_backup.sql
4. Copy upload volumes
5. Configure production environment
6. Deploy with docker-compose

DATA VERIFICATION:
- Check user accounts exist
- Verify events and participants
- Test file uploads
- Confirm all services running
"@ | Out-File -FilePath "$backupDir/MIGRATION_README.txt" -Encoding UTF8

# 5. COMPRESS BACKUP
Write-Host "🗜️  Compressing backup..." -ForegroundColor Cyan
Compress-Archive -Path $backupDir -DestinationPath "VPS_MIGRATION_BACKUP_$timestamp.zip" -Force

$backupSize = (Get-Item "VPS_MIGRATION_BACKUP_$timestamp.zip").Length / 1MB
Write-Host "✅ Migration backup completed!" -ForegroundColor Green
Write-Host "📦 Backup file: VPS_MIGRATION_BACKUP_$timestamp.zip ($([math]::Round($backupSize, 2)) MB)" -ForegroundColor Yellow

Write-Host "NEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. Upload backup to VPS" -ForegroundColor White
Write-Host "2. Setup VPS environment" -ForegroundColor White  
Write-Host "3. Deploy and restore data" -ForegroundColor White
Write-Host "4. Verify all data intact" -ForegroundColor White

# Cleanup temp directory
Remove-Item -Path $backupDir -Recurse -Force
Write-Host "Cleaned up temporary files" -ForegroundColor Gray
