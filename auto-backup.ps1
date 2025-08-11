# Auto backup script for School Platform
# Chạy script này hàng ngày để backup dữ liệu

param(
    [string]$BackupType = "daily"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"

Write-Host "🔄 Bắt đầu backup tự động lúc $(Get-Date)" -ForegroundColor Green

# Tạo thư mục backup nếu chưa có
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

try {
    # 1. Backup database
    Write-Host "📊 Backup database..." -ForegroundColor Yellow
    $dbBackupFile = "$backupDir/database_backup_$timestamp.sql"
    docker exec school_postgres pg_dumpall -U postgres > $dbBackupFile
    
    if (Test-Path $dbBackupFile -and (Get-Item $dbBackupFile).Length -gt 1KB) {
        Write-Host "✅ Database backup thành công: $dbBackupFile" -ForegroundColor Green
    } else {
        throw "Database backup failed hoặc file quá nhỏ"
    }
    
    # 2. Backup uploads (nếu có)
    $communityUploadsFile = "$backupDir/community_uploads_$timestamp.tar"
    $teacherUploadsFile = "$backupDir/teacher_uploads_$timestamp.tar"
    
    # Community uploads
    try {
        docker exec school_community_service test -d /app/uploads 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "📁 Backup community uploads..." -ForegroundColor Yellow
            docker exec school_community_service tar -cf /tmp/community_uploads.tar -C /app uploads/ 2>$null
            docker cp school_community_service:/tmp/community_uploads.tar $communityUploadsFile 2>$null
            Write-Host "✅ Community uploads backup thành công" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Community uploads không có hoặc lỗi" -ForegroundColor Yellow
    }
    
    # Teacher uploads  
    try {
        docker exec school_teacher_service test -d /app/uploads 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "📁 Backup teacher uploads..." -ForegroundColor Yellow
            docker exec school_teacher_service tar -cf /tmp/teacher_uploads.tar -C /app uploads/ 2>$null
            docker cp school_teacher_service:/tmp/teacher_uploads.tar $teacherUploadsFile 2>$null
            Write-Host "✅ Teacher uploads backup thành công" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Teacher uploads không có hoặc lỗi" -ForegroundColor Yellow
    }
    
    # 3. Tạo complete backup archive
    Write-Host "📦 Tạo complete backup archive..." -ForegroundColor Yellow
    $completeBackupFile = "$backupDir/complete_backup_$timestamp.tar.gz"
    
    # Sử dụng 7zip để tạo archive (nếu có)
    if (Get-Command "7z" -ErrorAction SilentlyContinue) {
        $filesToCompress = @($dbBackupFile)
        if (Test-Path $communityUploadsFile) { $filesToCompress += $communityUploadsFile }
        if (Test-Path $teacherUploadsFile) { $filesToCompress += $teacherUploadsFile }
        
        7z a $completeBackupFile $filesToCompress | Out-Null
        
        # Xóa các file backup riêng lẻ
        Remove-Item $dbBackupFile -Force
        if (Test-Path $communityUploadsFile) { Remove-Item $communityUploadsFile -Force }
        if (Test-Path $teacherUploadsFile) { Remove-Item $teacherUploadsFile -Force }
        
        Write-Host "✅ Complete backup thành công: $completeBackupFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 7zip không có, giữ nguyên file database backup: $dbBackupFile" -ForegroundColor Yellow
    }
    
    # 4. Dọn dẹp backup cũ (giữ lại 7 ngày gần nhất)
    Write-Host "🧹 Dọn dẹp backup cũ..." -ForegroundColor Yellow
    $oldBackups = Get-ChildItem "$backupDir/database_backup_*.sql", "$backupDir/complete_backup_*.tar.gz" | 
                  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
    
    foreach ($oldBackup in $oldBackups) {
        Remove-Item $oldBackup.FullName -Force
        Write-Host "🗑️ Đã xóa backup cũ: $($oldBackup.Name)" -ForegroundColor Cyan
    }
    
    Write-Host "🎉 Backup hoàn thành thành công!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Lỗi backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
