# Script restore dữ liệu lên VPS sau khi deploy
# Sử dụng: .\restore-on-vps.ps1 -BackupPath "path\to\backup\folder"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [string]$VPS_IP = "222.255.214.154",
    [string]$VPS_USER = "root",
    [string]$VPS_PASSWORD = "V6eUxFkPGGJXhKlrj0JM",
    [int]$VPS_PORT = 22
)

Write-Host "🔄 Bắt đầu restore dữ liệu lên VPS..." -ForegroundColor Green
Write-Host "📁 Backup path: $BackupPath" -ForegroundColor Cyan
Write-Host "📍 VPS: $VPS_IP" -ForegroundColor Cyan

# Kiểm tra backup path
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Backup path không tồn tại: $BackupPath" -ForegroundColor Red
    exit 1
}

# Kiểm tra kết nối SSH
Write-Host "`n🔍 Kiểm tra kết nối SSH..." -ForegroundColor Yellow
try {
    $sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes -p $VPS_PORT $VPS_USER@$VPS_IP "echo 'SSH connection successful'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Kết nối SSH thành công!" -ForegroundColor Green
    } else {
        Write-Host "❌ Kết nối SSH thất bại!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Không thể kết nối SSH: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$remoteDir = "/opt/school-platform"

# Kiểm tra xem hệ thống có đang chạy không
Write-Host "`n🔍 Kiểm tra trạng thái hệ thống trên VPS..." -ForegroundColor Yellow
$systemStatus = ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && docker-compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'"

if ($systemStatus -match "school_postgres.*Up") {
    Write-Host "✅ PostgreSQL đang chạy trên VPS" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL không chạy trên VPS. Hãy khởi động hệ thống trước!" -ForegroundColor Red
    Write-Host "Chạy: ssh -p $VPS_PORT $VPS_USER@$VPS_IP 'cd $remoteDir && ./start.sh'" -ForegroundColor Yellow
    exit 1
}

# Tạo thư mục restore trên VPS
Write-Host "`n📁 Tạo thư mục restore trên VPS..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $remoteDir/restore"

# Copy backup lên VPS
Write-Host "`n📤 Copy backup lên VPS..." -ForegroundColor Yellow
$backupName = Split-Path $BackupPath -Leaf
scp -r -P $VPS_PORT $BackupPath "$VPS_USER@$VPS_IP:$remoteDir/restore/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Copy backup thành công!" -ForegroundColor Green
} else {
    Write-Host "❌ Copy backup thất bại!" -ForegroundColor Red
    exit 1
}

# Restore databases
Write-Host "`n🗄️ Restore databases..." -ForegroundColor Yellow
$dbBackupFiles = Get-ChildItem $BackupPath -Filter "*.sql"

foreach ($dbFile in $dbBackupFiles) {
    $fileName = $dbFile.Name
    Write-Host "Restore database: $fileName" -ForegroundColor Cyan
    
    # Copy file SQL lên VPS
    scp -P $VPS_PORT $dbFile.FullName "$VPS_USER@$VPS_IP:$remoteDir/restore/"
    
    # Restore database
    if ($fileName -match "full_backup") {
        Write-Host "Restore full backup..." -ForegroundColor Yellow
        ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && cat restore/$fileName | docker exec -i school_postgres psql -U postgres"
    } else {
        # Xác định database name từ tên file
        $dbName = $fileName -replace "_.*\.sql$", ""
        Write-Host "Restore database: $dbName" -ForegroundColor Yellow
        
        # Tạo database nếu chưa có
        ssh -p $VPS_PORT $VPS_USER@$VPS_IP "docker exec -i school_postgres psql -U postgres -c 'CREATE DATABASE $($dbName);' 2>/dev/null || true"
        
        # Restore database
        ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && cat restore/$fileName | docker exec -i school_postgres psql -U postgres -d $($dbName)"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Restore $fileName thành công!" -ForegroundColor Green
    } else {
        Write-Host "❌ Restore $fileName thất bại!" -ForegroundColor Red
    }
}

# Restore uploads
Write-Host "`n📁 Restore uploads..." -ForegroundColor Yellow
$uploadBackupDir = Join-Path $BackupPath "uploads"
if (Test-Path $uploadBackupDir) {
    $uploadDirs = Get-ChildItem $uploadBackupDir -Directory
    
    foreach ($uploadDir in $uploadDirs) {
        $serviceName = $uploadDir.Name
        Write-Host "Restore uploads cho $serviceName..." -ForegroundColor Cyan
        
        # Copy uploads lên VPS
        scp -r -P $VPS_PORT $uploadDir.FullName "$VPS_USER@$VPS_IP:$remoteDir/restore/"
        
        # Restore uploads vào container
        $containerName = "school_$($serviceName)_service"
        ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && docker cp restore/$serviceName/. $containerName:/app/uploads/"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Restore uploads $serviceName thành công!" -ForegroundColor Green
        } else {
            Write-Host "❌ Restore uploads $serviceName thất bại!" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠️ Không có thư mục uploads để restore" -ForegroundColor Yellow
}

# Restore configuration files (nếu cần)
Write-Host "`n⚙️ Restore configuration files..." -ForegroundColor Yellow
$configBackupDir = Join-Path $BackupPath "config"
if (Test-Path $configBackupDir) {
    $configFiles = Get-ChildItem $configBackupDir -File
    
    foreach ($configFile in $configFiles) {
        $fileName = $configFile.Name
        Write-Host "Restore config: $fileName" -ForegroundColor Cyan
        
        # Copy config file lên VPS
        scp -P $VPS_PORT $configFile.FullName "$VPS_USER@$VPS_IP:$remoteDir/restore/"
        
        # Restore config file (chỉ restore các file .env nếu cần)
        if ($fileName -match "\.env$") {
            Write-Host "⚠️ File .env được giữ nguyên để tránh ghi đè cấu hình production" -ForegroundColor Yellow
        } else {
            ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && cp restore/$fileName config/"
            Write-Host "✅ Restore config $fileName thành công!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠️ Không có thư mục config để restore" -ForegroundColor Yellow
}

# Restart services để áp dụng thay đổi
Write-Host "`n🔄 Restart services..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && docker-compose restart"

# Kiểm tra trạng thái sau restore
Write-Host "`n🔍 Kiểm tra trạng thái sau restore..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && docker-compose ps"

# Dọn dẹp
Write-Host "`n🧹 Dọn dẹp..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $remoteDir && rm -rf restore"

Write-Host "`n🎉 Restore hoàn thành!" -ForegroundColor Green
Write-Host "`n📋 Tổng kết restore:" -ForegroundColor Yellow
Write-Host "Databases: $($dbBackupFiles.Count) files" -ForegroundColor White

if (Test-Path $uploadBackupDir) {
    $uploadDirs = Get-ChildItem $uploadBackupDir -Directory
    Write-Host "Uploads: $($uploadDirs.Count) services" -ForegroundColor White
}

if (Test-Path $configBackupDir) {
    $configFiles = Get-ChildItem $configBackupDir -File
    Write-Host "Configs: $($configFiles.Count) files" -ForegroundColor White
}

Write-Host "`n🌐 Kiểm tra hệ thống:" -ForegroundColor Yellow
Write-Host "Frontend: https://$VPS_IP" -ForegroundColor White
Write-Host "API Status: ssh -p $VPS_PORT $VPS_USER@$VPS_IP 'cd $remoteDir && docker-compose ps'" -ForegroundColor White

Write-Host "`n✅ Dữ liệu đã được restore thành công lên VPS!" -ForegroundColor Green 