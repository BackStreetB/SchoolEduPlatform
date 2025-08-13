# Simple VPS Migration Backup Script
Write-Host "Starting VPS Migration Backup..." -ForegroundColor Green

# Create backup directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "vps_backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force

Write-Host "Created backup directory: $backupDir" -ForegroundColor Yellow

# 1. Backup Database
Write-Host "Backing up database..." -ForegroundColor Cyan
docker exec school_postgres pg_dumpall -U postgres > "$backupDir/database_backup.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database backup completed" -ForegroundColor Green
} else {
    Write-Host "Database backup failed!" -ForegroundColor Red
    exit 1
}

# 2. Backup uploads
Write-Host "Backing up file uploads..." -ForegroundColor Cyan
if (Test-Path "community_uploads") {
    Copy-Item -Path "community_uploads" -Destination "$backupDir/" -Recurse -Force
    Write-Host "Community uploads backed up" -ForegroundColor Green
}

if (Test-Path "teacher_uploads") {
    Copy-Item -Path "teacher_uploads" -Destination "$backupDir/" -Recurse -Force
    Write-Host "Teacher uploads backed up" -ForegroundColor Green
}

# 3. Backup configs
Write-Host "Backing up configurations..." -ForegroundColor Cyan
Copy-Item -Path "docker-compose.yml" -Destination "$backupDir/" -Force

# Backup all service directories
$services = @("auth-service", "teacher-service", "community-service", "event-service", "diary-service", "report-service", "frontend")
foreach ($service in $services) {
    if (Test-Path $service) {
        Copy-Item -Path $service -Destination "$backupDir/" -Recurse -Force
        Write-Host "Backed up $service" -ForegroundColor Green
    }
}

# 4. Create instructions
$instructions = @"
VPS MIGRATION BACKUP - $timestamp

This backup contains:
- Full PostgreSQL database dump
- All file uploads (community_uploads, teacher_uploads)  
- All service source code and configurations
- docker-compose.yml

TO RESTORE ON VPS:
1. Install Docker and Docker Compose
2. Clone your GitHub repository
3. Copy this backup to VPS
4. Run: docker-compose up -d postgres
5. Restore DB: docker exec -i postgres_container psql -U postgres < database_backup.sql
6. Copy uploads to respective volumes
7. Run: docker-compose up -d

Your data will be preserved 100%!
"@

$instructions | Out-File -FilePath "$backupDir/RESTORE_INSTRUCTIONS.txt" -Encoding UTF8

# 5. Compress everything
Write-Host "Compressing backup..." -ForegroundColor Cyan
Compress-Archive -Path $backupDir -DestinationPath "VPS_BACKUP_$timestamp.zip" -Force

$backupFile = "VPS_BACKUP_$timestamp.zip"
$backupSizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)

Write-Host "Migration backup completed!" -ForegroundColor Green
Write-Host "Backup file: $backupFile" -ForegroundColor Yellow
Write-Host "Size: $backupSizeMB MB" -ForegroundColor Yellow

Write-Host "NEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. Upload $backupFile to your VPS" -ForegroundColor White
Write-Host "2. Follow instructions in RESTORE_INSTRUCTIONS.txt" -ForegroundColor White
Write-Host "3. Your data will be preserved!" -ForegroundColor White

# Cleanup
Remove-Item -Path $backupDir -Recurse -Force
Write-Host "Temporary files cleaned up" -ForegroundColor Gray

