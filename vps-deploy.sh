#!/bin/bash
# VPS Deployment Script - Run AFTER VPS setup and reboot
# This script deploys your School Management System

echo "🚀 Deploying School Management System to VPS..."

# Check if backup file exists
if [ ! -f "VPS_BACKUP_*.zip" ]; then
    echo "❌ Backup file not found! Please upload your backup first."
    echo "Expected: VPS_BACKUP_YYYYMMDD_HHMMSS.zip"
    exit 1
fi

# Extract backup
BACKUP_FILE=$(ls VPS_BACKUP_*.zip | head -1)
echo "📦 Extracting backup: $BACKUP_FILE"
unzip -q "$BACKUP_FILE"
BACKUP_DIR=$(ls -d vps_backup_*/ | head -1)

# Clone repository (if not exists)
if [ ! -d "System_School_TVD" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/YOUR_USERNAME/System_School_TVD.git
fi

# Copy source code from backup
echo "📋 Copying source code..."
cp -r "$BACKUP_DIR"/* System_School_TVD/LOCAL/

# Navigate to project directory
cd System_School_TVD/LOCAL

# Create production environment file
echo "⚙️ Creating production environment..."
cat > .env << EOF
# Production Environment
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_change_this_in_production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=school_management
DB_USER=postgres
DB_PASS=secure_postgres_password_change_this
PORT=3000
EOF

# Update docker-compose for production
echo "🐳 Updating Docker Compose for production..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: school_postgres_prod
    environment:
      POSTGRES_DB: school_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secure_postgres_password_change_this
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./community_uploads:/var/lib/postgresql/uploads/community
      - ./teacher_uploads:/var/lib/postgresql/uploads/teacher
    restart: unless-stopped
    ports:
      - "5432:5432"

  auth-service:
    build: ./auth-service
    container_name: school_auth_prod
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3001:3000"

  teacher-service:
    build: ./teacher-service
    container_name: school_teacher_prod
    depends_on:
      - postgres
    volumes:
      - ./teacher_uploads:/app/uploads
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3002:3000"

  community-service:
    build: ./community-service
    container_name: school_community_prod
    depends_on:
      - postgres
    volumes:
      - ./community_uploads:/app/uploads
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3003:3000"

  event-service:
    build: ./event-service
    container_name: school_event_prod
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3004:3000"

  diary-service:
    build: ./diary-service
    container_name: school_diary_prod
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3005:3000"

  report-service:
    build: ./report-service
    container_name: school_report_prod
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    ports:
      - "3006:3000"

  frontend:
    build: ./frontend
    container_name: school_frontend_prod
    depends_on:
      - auth-service
      - teacher-service
      - community-service
      - event-service
      - diary-service
      - report-service
    restart: unless-stopped
    ports:
      - "80:80"

volumes:
  postgres_data:
EOF

# Start PostgreSQL first
echo "🗄️ Starting PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to start..."
sleep 30

# Restore database
echo "📊 Restoring database..."
docker exec -i school_postgres_prod psql -U postgres < "$BACKUP_DIR/database_backup.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Database restore failed!"
    exit 1
fi

# Copy upload directories
echo "📁 Copying upload files..."
if [ -d "$BACKUP_DIR/community_uploads" ]; then
    cp -r "$BACKUP_DIR/community_uploads" ./
    echo "✅ Community uploads copied"
fi

if [ -d "$BACKUP_DIR/teacher_uploads" ]; then
    cp -r "$BACKUP_DIR/teacher_uploads" ./
    echo "✅ Teacher uploads copied"
fi

# Build and start all services
echo "🚀 Building and starting all services..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 60

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Setup firewall (basic)
echo "🔐 Setting up basic firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "================================"
echo "✅ Your School Management System is now running on:"
echo "🌐 Frontend: http://YOUR_VPS_IP"
echo "🗄️ Database: Restored with all your data"
echo "📁 File uploads: Preserved"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Point your domain to this VPS IP"
echo "2. Setup SSL certificate (Let's Encrypt)"
echo "3. Configure backup automation"
echo "4. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🚨 SECURITY REMINDERS:"
echo "- Change default passwords in .env file"
echo "- Setup regular backups"
echo "- Keep system updated"
echo ""

# Cleanup
rm -rf "$BACKUP_DIR"
echo "🧹 Cleaned up temporary files"
