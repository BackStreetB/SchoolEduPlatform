#!/bin/bash

# Safe rebuild script for School Platform
# This script creates a backup before rebuilding containers

echo "🚀 Starting safe rebuild process..."

# Create backup before rebuilding
echo "📦 Creating backup before rebuild..."
./backup.sh

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
else
    echo "❌ Backup failed! Aborting rebuild..."
    exit 1
fi

# Ask user which services to rebuild
echo ""
echo "🔧 Which services do you want to rebuild?"
echo "1) All services"
echo "2) Frontend only"
echo "3) Auth service only"
echo "4) Teacher service only"
echo "5) Community service only"
echo "6) Diary service only"
echo "7) Event service only"
echo "8) Report service only"
echo "9) Cancel"
echo ""
read -p "Enter your choice (1-9): " choice

case $choice in
    1)
        echo "🔄 Rebuilding all services..."
        docker-compose build --no-cache
        docker-compose up -d
        ;;
    2)
        echo "🔄 Rebuilding frontend..."
        docker-compose build --no-cache frontend
        docker-compose up -d frontend
        ;;
    3)
        echo "🔄 Rebuilding auth service..."
        docker-compose build --no-cache auth-service
        docker-compose up -d auth-service
        ;;
    4)
        echo "🔄 Rebuilding teacher service..."
        docker-compose build --no-cache teacher-service
        docker-compose up -d teacher-service
        ;;
    5)
        echo "🔄 Rebuilding community service..."
        docker-compose build --no-cache community-service
        docker-compose up -d community-service
        ;;
    6)
        echo "🔄 Rebuilding diary service..."
        docker-compose build --no-cache diary-service
        docker-compose up -d diary-service
        ;;
    7)
        echo "🔄 Rebuilding event service..."
        docker-compose build --no-cache event-service
        docker-compose up -d event-service
        ;;
    8)
        echo "🔄 Rebuilding report service..."
        docker-compose build --no-cache report-service
        docker-compose up -d report-service
        ;;
    9)
        echo "❌ Rebuild cancelled."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting..."
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ Rebuild completed successfully!"
    echo "📊 Checking service status..."
    docker-compose ps
else
    echo "❌ Rebuild failed!"
    echo "💡 You can restore from backup using: ./restore.sh <backup_file>"
    exit 1
fi 