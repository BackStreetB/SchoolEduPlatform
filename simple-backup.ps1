# Simple backup script for School Platform
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"

Write-Host "🔄 Tạo backup database lúc $(Get-Date)" -ForegroundColor Green

# Tạo thư mục backup
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Backup database
Write-Host "📊 Backup database..." -ForegroundColor Yellow
$dbBackupFile = "$backupDir\database_backup_$timestamp.sql"

docker exec school_postgres pg_dumpall -U postgres > $dbBackupFile

if (Test-Path $dbBackupFile -and (Get-Item $dbBackupFile).Length -gt 1KB) {
    $fileSizeMB = [math]::Round((Get-Item $dbBackupFile).Length / 1MB, 2)
    Write-Host "✅ Database backup thành công: $dbBackupFile ($fileSizeMB MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Database backup thất bại!" -ForegroundColor Red
    exit 1
}

# Dọn dẹp backup cũ (giữ lại 7 ngày)
Write-Host "🧹 Dọn dẹp backup cũ hơn 7 ngày..." -ForegroundColor Yellow
$oldBackups = Get-ChildItem "$backupDir\database_backup_*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }

foreach ($oldBackup in $oldBackups) {
    Remove-Item $oldBackup.FullName -Force
    Write-Host "🗑️ Đã xóa: $($oldBackup.Name)" -ForegroundColor Cyan
}

Write-Host "🎉 Backup hoàn thành!" -ForegroundColor Green
