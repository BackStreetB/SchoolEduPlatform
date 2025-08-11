# Daily backup script for School Platform
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"

Write-Host "Starting backup at $(Get-Date)" -ForegroundColor Green

# Create backup directory
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Backup database
Write-Host "Backing up database..." -ForegroundColor Yellow
$dbBackupFile = "$backupDir\database_backup_$timestamp.sql"

docker exec school_postgres pg_dumpall -U postgres > $dbBackupFile

if ((Test-Path $dbBackupFile) -and ((Get-Item $dbBackupFile).Length -gt 1KB)) {
    $fileSizeMB = [math]::Round((Get-Item $dbBackupFile).Length / 1MB, 2)
    Write-Host "Database backup successful: $dbBackupFile ($fileSizeMB MB)" -ForegroundColor Green
} else {
    Write-Host "Database backup failed!" -ForegroundColor Red
    exit 1
}

# Clean up old backups (keep 7 days)
Write-Host "Cleaning up old backups..." -ForegroundColor Yellow
$oldBackups = Get-ChildItem "$backupDir\database_backup_*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }

foreach ($oldBackup in $oldBackups) {
    Remove-Item $oldBackup.FullName -Force
    Write-Host "Removed old backup: $($oldBackup.Name)" -ForegroundColor Cyan
}

Write-Host "Backup completed successfully!" -ForegroundColor Green
