#!/bin/bash

# Backup script for School Platform
# This script creates backups of the database and uploads

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="school_postgres"
COMMUNITY_CONTAINER="school_community_service"
TEACHER_CONTAINER="school_teacher_service"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
docker exec $DB_CONTAINER pg_dumpall -U postgres > "$BACKUP_DIR/database_backup_$DATE.sql"

# Backup community uploads
echo "Backing up community uploads..."
if [ -d "./uploads" ]; then
    tar -czf "$BACKUP_DIR/community_uploads_$DATE.tar.gz" -C ./uploads .
else
    echo "Community uploads directory not found, skipping..."
fi

# Backup teacher uploads
echo "Backing up teacher uploads..."
if [ -d "./teacher-service/uploads" ]; then
    tar -czf "$BACKUP_DIR/teacher_uploads_$DATE.tar.gz" -C ./teacher-service/uploads .
else
    echo "Teacher uploads directory not found, skipping..."
fi

# Create a complete backup archive
echo "Creating complete backup archive..."
tar -czf "$BACKUP_DIR/complete_backup_$DATE.tar.gz" \
    "$BACKUP_DIR/database_backup_$DATE.sql" \
    "$BACKUP_DIR/community_uploads_$DATE.tar.gz" \
    "$BACKUP_DIR/teacher_uploads_$DATE.tar.gz"

# Clean up individual files
rm "$BACKUP_DIR/database_backup_$DATE.sql"
rm "$BACKUP_DIR/community_uploads_$DATE.tar.gz"
rm "$BACKUP_DIR/teacher_uploads_$DATE.tar.gz"

# Keep only the last 10 backups
echo "Cleaning up old backups (keeping last 10)..."
ls -t "$BACKUP_DIR"/complete_backup_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup completed successfully!"
echo "Backup file: $BACKUP_DIR/complete_backup_$DATE.tar.gz" 