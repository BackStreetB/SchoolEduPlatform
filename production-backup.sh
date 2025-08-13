#!/bin/bash
# Production Backup Script - Run này trên VPS để backup định kỳ

echo "🔄 Starting production backup..."

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="production_backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📁 Created backup directory: $BACKUP_DIR"

# 1. Backup database
echo "🗄️ Backing up database..."
docker exec school_postgres_prod pg_dumpall -U postgres > "$BACKUP_DIR/database_backup.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed"
else
    echo "❌ Database backup failed!"
    exit 1
fi

# 2. Backup file uploads
echo "📁 Backing up file uploads..."
if [ -d "community_uploads" ]; then
    cp -r community_uploads "$BACKUP_DIR/"
    echo "✅ Community uploads backed up"
fi

if [ -d "teacher_uploads" ]; then
    cp -r teacher_uploads "$BACKUP_DIR/"
    echo "✅ Teacher uploads backed up"
fi

# 3. Backup configuration
echo "⚙️ Backing up configurations..."
cp docker-compose.prod.yml "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/env.backup"

# 4. Create backup info
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
Production Backup
Created: $(date)
Server: $(hostname)
Database: PostgreSQL - school_management
Services: auth, teacher, community, event, diary, report, frontend

To restore:
1. Extract this backup
2. Run: docker exec -i postgres_container psql -U postgres < database_backup.sql
3. Copy upload directories
4. Restart services
EOF

# 5. Compress backup
echo "🗜️ Compressing backup..."
tar -czf "production_backup_$TIMESTAMP.tar.gz" "$BACKUP_DIR"

# 6. Calculate size
BACKUP_SIZE=$(du -sh "production_backup_$TIMESTAMP.tar.gz" | cut -f1)
echo "✅ Backup completed: production_backup_$TIMESTAMP.tar.gz ($BACKUP_SIZE)"

# 7. Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find . -name "production_backup_*.tar.gz" -mtime +7 -delete
find . -name "production_backup_*" -type d -mtime +1 -exec rm -rf {} +

echo "🎉 Production backup completed successfully!"
echo "📦 Backup file: production_backup_$TIMESTAMP.tar.gz"
