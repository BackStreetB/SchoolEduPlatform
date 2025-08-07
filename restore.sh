#!/bin/bash

# Restore script for School Platform
# This script restores data from backup files

# Configuration
BACKUP_DIR="./backups"
DB_CONTAINER="school_postgres"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 complete_backup_20250807_143000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "Backup file $BACKUP_DIR/$BACKUP_FILE not found!"
    exit 1
fi

echo "Starting restore from $BACKUP_FILE at $(date)"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Extract backup file
echo "Extracting backup file..."
tar -xzf "$BACKUP_DIR/$BACKUP_FILE"

# Find the extracted files
DB_BACKUP=$(find . -name "database_backup_*.sql" | head -1)
COMMUNITY_UPLOADS=$(find . -name "community_uploads_*.tar.gz" | head -1)
TEACHER_UPLOADS=$(find . -name "teacher_uploads_*.tar.gz" | head -1)

# Restore database
if [ -n "$DB_BACKUP" ]; then
    echo "Restoring database..."
    docker exec -i $DB_CONTAINER psql -U postgres < "$DB_BACKUP"
    echo "Database restored successfully!"
else
    echo "No database backup found in archive!"
fi

# Restore community uploads
if [ -n "$COMMUNITY_UPLOADS" ]; then
    echo "Restoring community uploads..."
    mkdir -p ../uploads
    tar -xzf "$COMMUNITY_UPLOADS" -C ../uploads
    echo "Community uploads restored successfully!"
else
    echo "No community uploads backup found in archive!"
fi

# Restore teacher uploads
if [ -n "$TEACHER_UPLOADS" ]; then
    echo "Restoring teacher uploads..."
    mkdir -p ../teacher-service/uploads
    tar -xzf "$TEACHER_UPLOADS" -C ../teacher-service/uploads
    echo "Teacher uploads restored successfully!"
else
    echo "No teacher uploads backup found in archive!"
fi

# Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "Restore completed successfully!"
echo "You may need to restart the services: docker-compose restart" 