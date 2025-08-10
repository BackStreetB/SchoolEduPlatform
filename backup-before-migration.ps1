# Script backup dữ liệu trước khi migrate lên VPS
# Sử dụng: .\backup-before-migration.ps1

Write-Host "🔄 Bắt đầu backup dữ liệu trước khi migrate..." -ForegroundColor Green

# Tạo thư mục backup
$backupDir = ".\backups\migration-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "📁 Thư mục backup: $backupDir" -ForegroundColor Cyan

# Backup PostgreSQL data
Write-Host "`n🗄️ Backup PostgreSQL data..." -ForegroundColor Yellow
try {
    # Kiểm tra xem PostgreSQL có đang chạy không
    $postgresContainer = docker ps --filter "name=school_postgres" --format "{{.Names}}"
    
    if ($postgresContainer) {
        Write-Host "✅ PostgreSQL container đang chạy, tạo backup..." -ForegroundColor Green
        
        # Tạo backup cho từng database
        $databases = @("school_auth", "school_reports", "school_diary", "school_community", "school_events", "school_teacher")
        
        foreach ($db in $databases) {
            Write-Host "Backup database: $db" -ForegroundColor Cyan
            $backupFile = "$backupDir\${db}_$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
            
            docker exec school_postgres pg_dump -U postgres -d $db > $backupFile
            
            if (Test-Path $backupFile) {
                $fileSize = (Get-Item $backupFile).Length
                Write-Host "✅ Backup $db thành công: $backupFile ($([math]::Round($fileSize/1MB, 2)) MB)" -ForegroundColor Green
            } else {
                Write-Host "❌ Backup $db thất bại!" -ForegroundColor Red
            }
        }
        
        # Tạo full backup
        Write-Host "`n📦 Tạo full backup..." -ForegroundColor Yellow
        $fullBackupFile = "$backupDir\full_backup_$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
        docker exec school_postgres pg_dumpall -U postgres > $fullBackupFile
        
        if (Test-Path $fullBackupFile) {
            $fileSize = (Get-Item $fullBackupFile).Length
            Write-Host "✅ Full backup thành công: $fullBackupFile ($([math]::Round($fileSize/1MB, 2)) MB)" -ForegroundColor Green
        }
        
    } else {
        Write-Host "⚠️ PostgreSQL container không chạy, bỏ qua backup database" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Lỗi khi backup PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
}

# Backup uploads
Write-Host "`n📁 Backup uploads..." -ForegroundColor Yellow
$uploadDirs = @("community-service/uploads", "teacher-service/uploads")

foreach ($uploadDir in $uploadDirs) {
    if (Test-Path $uploadDir) {
        $uploadBackupDir = "$backupDir\uploads\$($uploadDir.Split('/')[-1])"
        New-Item -ItemType Directory -Path $uploadBackupDir -Force | Out-Null
        
        Write-Host "Backup uploads từ: $uploadDir" -ForegroundColor Cyan
        Copy-Item -Path "$uploadDir\*" -Destination $uploadBackupDir -Recurse -Force
        
        $fileCount = (Get-ChildItem $uploadBackupDir -Recurse -File).Count
        Write-Host "✅ Backup uploads thành công: $fileCount files" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Thư mục uploads không tồn tại: $uploadDir" -ForegroundColor Yellow
    }
}

# Backup configuration files
Write-Host "`n⚙️ Backup configuration files..." -ForegroundColor Yellow
$configFiles = @(
    "docker-compose.yml",
    "auth-service/.env",
    "report-service/.env", 
    "diary-service/.env",
    "community-service/.env",
    "event-service/.env",
    "teacher-service/.env",
    "frontend/.env"
)

foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        $configBackupDir = "$backupDir\config"
        New-Item -ItemType Directory -Path $configBackupDir -Force | Out-Null
        
        Copy-Item -Path $configFile -Destination "$configBackupDir\$(Split-Path $configFile -Leaf)" -Force
        Write-Host "✅ Backup config: $configFile" -ForegroundColor Green
    }
}

# Backup source code (nếu cần)
Write-Host "`n💻 Backup source code..." -ForegroundColor Yellow
$sourceBackupDir = "$backupDir\source"
New-Item -ItemType Directory -Path $sourceBackupDir -Force | Out-Null

$sourceDirs = @("auth-service", "report-service", "diary-service", "community-service", "event-service", "teacher-service", "frontend")

foreach ($sourceDir in $sourceDirs) {
    if (Test-Path $sourceDir) {
        $targetDir = "$sourceBackupDir\$sourceDir"
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        
        # Copy source code, loại trừ node_modules và các file không cần thiết
        Get-ChildItem -Path $sourceDir -Exclude "node_modules", ".git", "*.log" | Copy-Item -Destination $targetDir -Recurse -Force
        
        $fileCount = (Get-ChildItem $targetDir -Recurse -File).Count
        Write-Host "✅ Backup source $sourceDir: $fileCount files" -ForegroundColor Green
    }
}

# Tạo file manifest
Write-Host "`n📋 Tạo file manifest..." -ForegroundColor Yellow
$manifest = @"
# TVD School Platform - Migration Backup Manifest
# Tạo lúc: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Thông tin backup
- Thư mục: $backupDir
- Tổng kích thước: $([math]::Round((Get-ChildItem $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB

## Databases
$(Get-ChildItem $backupDir -Filter "*.sql" | ForEach-Object { "- $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" })

## Uploads
$(Get-ChildItem "$backupDir\uploads" -Directory -ErrorAction SilentlyContinue | ForEach-Object { "- $($_.Name)" })

## Configuration
$(Get-ChildItem "$backupDir\config" -File -ErrorAction SilentlyContinue | ForEach-Object { "- $($_.Name)" })

## Source Code
$(Get-ChildItem "$backupDir\source" -Directory -ErrorAction SilentlyContinue | ForEach-Object { "- $($_.Name)" })

## Hướng dẫn restore
1. Copy toàn bộ thư mục này lên VPS
2. Restore databases: cat backup_file.sql | docker exec -i school_postgres psql -U postgres
3. Copy uploads vào thư mục tương ứng
4. Copy configuration files vào vị trí đúng
"@

$manifest | Out-File -FilePath "$backupDir\MANIFEST.txt" -Encoding UTF8

# Tạo file ZIP
Write-Host "`n📦 Tạo file ZIP..." -ForegroundColor Yellow
$zipFile = "$backupDir.zip"
if (Get-Command "Compress-Archive" -ErrorAction SilentlyContinue) {
    Compress-Archive -Path $backupDir -DestinationPath $zipFile -Force
    Write-Host "✅ File ZIP được tạo: $zipFile" -ForegroundColor Green
} else {
    Write-Host "⚠️ Compress-Archive không khả dụng, sử dụng 7-Zip hoặc WinRAR để nén thủ công" -ForegroundColor Yellow
}

# Hiển thị tổng kết
Write-Host "`n🎉 Backup hoàn thành!" -ForegroundColor Green
Write-Host "📁 Thư mục backup: $backupDir" -ForegroundColor Cyan
if (Test-Path $zipFile) {
    Write-Host "📦 File ZIP: $zipFile" -ForegroundColor Cyan
}

Write-Host "`n📋 Tổng kết:" -ForegroundColor Yellow
$totalSize = (Get-ChildItem $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host "Tổng kích thước: $([math]::Round($totalSize/1MB, 2)) MB" -ForegroundColor White

$dbFiles = Get-ChildItem $backupDir -Filter "*.sql"
Write-Host "Database backups: $($dbFiles.Count) files" -ForegroundColor White

$uploadDirs = Get-ChildItem "$backupDir\uploads" -Directory -ErrorAction SilentlyContinue
Write-Host "Upload directories: $($uploadDirs.Count)" -ForegroundColor White

Write-Host "`n🚀 Bây giờ bạn có thể chạy script deploy: .\deploy-to-vps.ps1" -ForegroundColor Green 