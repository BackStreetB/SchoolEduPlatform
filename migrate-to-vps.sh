#!/bin/bash

# Migration script for School Platform to VPS
# This script helps migrate the entire system to a VPS

echo "🚀 Starting migration to VPS..."

# Configuration
VPS_USER=""
VPS_IP=""
VPS_PATH="/home/user/school-platform"

# Get VPS details
echo "📋 Please provide VPS details:"
read -p "VPS Username: " VPS_USER
read -p "VPS IP Address: " VPS_IP
read -p "VPS Destination Path (default: /home/$VPS_USER/school-platform): " VPS_PATH

if [ -z "$VPS_PATH" ]; then
    VPS_PATH="/home/$VPS_USER/school-platform"
fi

echo "🔧 VPS Details:"
echo "  User: $VPS_USER"
echo "  IP: $VPS_IP"
echo "  Path: $VPS_PATH"

# Create final backup
echo "📦 Creating final backup before migration..."
./backup.sh

if [ $? -ne 0 ]; then
    echo "❌ Backup failed! Aborting migration..."
    exit 1
fi

# Find latest backup
LATEST_BACKUP=$(ls -t backups/complete_backup_*.tar.gz | head -1)
echo "📁 Latest backup: $LATEST_BACKUP"

# Test SSH connection
echo "🔌 Testing SSH connection..."
ssh -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'SSH connection successful'" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ SSH connection failed! Please check:"
    echo "  - VPS IP address"
    echo "  - Username"
    echo "  - SSH key or password"
    exit 1
fi

# Create directory on VPS
echo "📁 Creating directory on VPS..."
ssh $VPS_USER@$VPS_IP "mkdir -p $VPS_PATH"

# Upload project files
echo "📤 Uploading project files..."
rsync -avz --exclude 'node_modules' --exclude '.git' \
    --exclude 'uploads' --exclude 'backups' \
    ./ $VPS_USER@$VPS_IP:$VPS_PATH/

if [ $? -ne 0 ]; then
    echo "❌ Upload failed! Trying with scp..."
    scp -r ./* $VPS_USER@$VPS_IP:$VPS_PATH/
fi

# Upload backup
echo "📤 Uploading backup file..."
scp $LATEST_BACKUP $VPS_USER@$VPS_IP:$VPS_PATH/backups/

# Setup VPS
echo "🔧 Setting up VPS..."
ssh $VPS_USER@$VPS_IP << EOF
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
    ./restore.sh $(basename $LATEST_BACKUP)
    
    # Start services
    echo "🚀 Starting services..."
    docker-compose up -d
    
    echo "✅ Migration completed!"
    echo "🌐 Your application should be available at: http://$VPS_IP"
EOF

echo "🎉 Migration completed successfully!"
echo "📊 Next steps:"
echo "  1. Check if services are running: ssh $VPS_USER@$VPS_IP 'cd $VPS_PATH && docker-compose ps'"
echo "  2. Access your application: http://$VPS_IP"
echo "  3. Update DNS if needed"
echo "  4. Configure firewall rules"
echo ""
echo "🔧 Useful commands on VPS:"
echo "  - Check logs: docker-compose logs"
echo "  - Restart services: docker-compose restart"
echo "  - Update: git pull && docker-compose up -d --build" 