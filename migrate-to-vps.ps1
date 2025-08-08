# Migration script for School Platform to VPS (PowerShell)
# This script helps migrate the entire system to a VPS

Write-Host "🚀 Starting migration to VPS..." -ForegroundColor Green

# Configuration
$VPS_USER = ""
$VPS_IP = ""
$VPS_PATH = "/home/user/school-platform"

# Get VPS details
Write-Host "📋 Please provide VPS details:" -ForegroundColor Cyan
$VPS_USER = Read-Host "VPS Username"
$VPS_IP = Read-Host "VPS IP Address"
$VPS_PATH_INPUT = Read-Host "VPS Destination Path (default: /home/$VPS_USER/school-platform)"

if ($VPS_PATH_INPUT) {
    $VPS_PATH = $VPS_PATH_INPUT
} else {
    $VPS_PATH = "/home/$VPS_USER/school-platform"
}

Write-Host "🔧 VPS Details:" -ForegroundColor Yellow
Write-Host "  User: $VPS_USER"
Write-Host "  IP: $VPS_IP"
Write-Host "  Path: $VPS_PATH"

# Create final backup
Write-Host "📦 Creating final backup before migration..." -ForegroundColor Yellow
& .\backup.sh

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backup failed! Aborting migration..." -ForegroundColor Red
    exit 1
}

# Find latest backup
$LATEST_BACKUP = Get-ChildItem "backups/complete_backup_*.tar.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host "📁 Latest backup: $($LATEST_BACKUP.Name)" -ForegroundColor Green

# Test SSH connection
Write-Host "🔌 Testing SSH connection..." -ForegroundColor Yellow
try {
    $sshTest = ssh -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "echo 'SSH connection successful'" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH connection successful!" -ForegroundColor Green
    } else {
        throw "SSH connection failed"
    }
} catch {
    Write-Host "❌ SSH connection failed! Please check:" -ForegroundColor Red
    Write-Host "  - VPS IP address" -ForegroundColor Red
    Write-Host "  - Username" -ForegroundColor Red
    Write-Host "  - SSH key or password" -ForegroundColor Red
    exit 1
}

# Create directory on VPS
Write-Host "📁 Creating directory on VPS..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" "mkdir -p $VPS_PATH"

# Upload project files
Write-Host "📤 Uploading project files..." -ForegroundColor Yellow
try {
    # Try rsync first (if available)
    rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'uploads' --exclude 'backups' ./ "$VPS_USER@$VPS_IP`:$VPS_PATH/"
    if ($LASTEXITCODE -ne 0) {
        throw "rsync failed"
    }
} catch {
    Write-Host "📤 Trying with scp..." -ForegroundColor Yellow
    scp -r ./* "$VPS_USER@$VPS_IP`:$VPS_PATH/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Upload failed!" -ForegroundColor Red
        exit 1
    }
}

# Upload backup
Write-Host "📤 Uploading backup file..." -ForegroundColor Yellow
scp $LATEST_BACKUP.FullName "$VPS_USER@$VPS_IP`:$VPS_PATH/backups/"

# Setup VPS
Write-Host "🔧 Setting up VPS..." -ForegroundColor Yellow
$setupCommands = @"
cd $VPS_PATH

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker \$USER
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Make scripts executable
chmod +x *.sh

# Restore data
echo "🔄 Restoring data..."
./restore.sh $($LATEST_BACKUP.Name)

# Start services
echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Migration completed!"
echo "🌐 Your application should be available at: http://$VPS_IP"
"@

ssh "$VPS_USER@$VPS_IP" $setupCommands

Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host "📊 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check if services are running: ssh $VPS_USER@$VPS_IP 'cd $VPS_PATH && docker-compose ps'" -ForegroundColor White
Write-Host "  2. Access your application: http://$VPS_IP" -ForegroundColor White
Write-Host "  3. Update DNS if needed" -ForegroundColor White
Write-Host "  4. Configure firewall rules" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful commands on VPS:" -ForegroundColor Yellow
Write-Host "  - Check logs: docker-compose logs" -ForegroundColor White
Write-Host "  - Restart services: docker-compose restart" -ForegroundColor White
Write-Host "  - Update: git pull && docker-compose up -d --build" -ForegroundColor White 