# Script deploy hệ thống lên VPS
# Sử dụng: .\deploy-to-vps.ps1

param(
    [string]$VPS_IP = "222.255.214.154",
    [string]$VPS_USER = "root",
    [string]$VPS_PASSWORD = "V6eUxFkPGGJXhKlrj0JM",
    [int]$VPS_PORT = 22
)

Write-Host "🚀 Bắt đầu deploy hệ thống lên VPS..." -ForegroundColor Green
Write-Host "📍 VPS: $VPS_IP" -ForegroundColor Cyan
Write-Host "👤 User: $VPS_USER" -ForegroundColor Cyan

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

# Tạo thư mục trên VPS
Write-Host "`n📁 Tạo cấu trúc thư mục trên VPS..." -ForegroundColor Yellow
$remoteDir = "/opt/school-platform"
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $remoteDir/{services,config,data,logs}"

# Cài đặt Docker và Docker Compose trên VPS
Write-Host "`n🐳 Cài đặt Docker trên VPS..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP @"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
usermod -aG docker root
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
"@

# Tạo file docker-compose.yml cho production
Write-Host "`n📝 Tạo docker-compose.yml cho production..." -ForegroundColor Yellow
$productionCompose = @"
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: school_postgres
    environment:
      POSTGRES_DB: school_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_secure_password_here}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - school_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Auth Service
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    container_name: school_auth_service
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_auth
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - JWT_EXPIRES_IN=1d
      - JWT_REFRESH_EXPIRES_IN=7d
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - FRONTEND_URL=https://$VPS_IP
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_SECURE=${SMTP_SECURE:-true}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM_NAME=${SMTP_FROM_NAME:-TVD School Platform}
      - SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL:-no-reply@tvd.school}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped

  # Report Service
  report-service:
    build:
      context: ./services/report-service
      dockerfile: Dockerfile
    container_name: school_report_service
    environment:
      - NODE_ENV=production
      - PORT=3002
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_reports
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - FRONTEND_URL=https://$VPS_IP
      - STREAK_WARNING_HOURS=20
      - STREAK_RESET_HOURS=24
    ports:
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped

  # Diary Service
  diary-service:
    build:
      context: ./services/diary-service
      dockerfile: Dockerfile
    container_name: school_diary_service
    environment:
      - NODE_ENV=production
      - PORT=3003
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_diary
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - FRONTEND_URL=https://$VPS_IP
      - DIARY_LOCK_HOURS=24
    ports:
      - "3003:3003"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped

  # Community Service
  community-service:
    build:
      context: ./services/community-service
      dockerfile: Dockerfile
    container_name: school_community_service
    environment:
      - NODE_ENV=production
      - PORT=3004
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_community
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - FRONTEND_URL=https://$VPS_IP
      - UPLOAD_PATH=./uploads
      - MAX_FILE_SIZE=5242880
    ports:
      - "3004:3004"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped
    volumes:
      - community_uploads:/app/uploads

  # Event Service
  event-service:
    build:
      context: ./services/event-service
      dockerfile: Dockerfile
    container_name: school_event_service
    environment:
      - NODE_ENV=production
      - PORT=3005
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_events
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      - FRONTEND_URL=https://$VPS_IP
      - EVENT_REMINDER_MINUTES=15
    ports:
      - "3005:3005"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped

  # Teacher Service
  teacher-service:
    build:
      context: ./services/teacher-service
      dockerfile: Dockerfile
    container_name: school_teacher_service
    environment:
      - NODE_ENV=production
      - PORT=3006
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=school_teacher
      - DB_USER=postgres
      - DB_PASSWORD=${POSTGRES_PASSWORD:-your_secure_password_here}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
    ports:
      - "3006:3006"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - school_network
    restart: unless-stopped
    volumes:
      - teacher_uploads:/app/uploads

  # Frontend React App
  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile
    container_name: school_frontend
    environment:
      - REACT_APP_API_URL=https://$VPS_IP:3001
      - REACT_APP_AUTH_SERVICE_URL=https://$VPS_IP:3001
      - REACT_APP_REPORT_SERVICE_URL=https://$VPS_IP:3002
      - REACT_APP_DIARY_SERVICE_URL=https://$VPS_IP:3003
      - REACT_APP_COMMUNITY_SERVICE_URL=https://$VPS_IP:3004
      - REACT_APP_EVENT_SERVICE_URL=https://$VPS_IP:3005
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - report-service
      - diary-service
      - community-service
      - event-service
      - teacher-service
    networks:
      - school_network
    restart: unless-stopped

  # Nginx Gateway
  nginx:
    image: nginx:alpine
    container_name: school_nginx
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf
      - ./config/ssl:/etc/nginx/ssl
    depends_on:
      - auth-service
      - report-service
      - diary-service
      - community-service
      - event-service
      - teacher-service
      - frontend
    networks:
      - school_network
    restart: unless-stopped

volumes:
  postgres_data:
  community_uploads:
  teacher_uploads:

networks:
  school_network:
    driver: bridge
"@

# Gửi file docker-compose.yml lên VPS
$productionCompose | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/docker-compose.yml"

# Tạo file .env cho production
Write-Host "`n🔐 Tạo file .env cho production..." -ForegroundColor Yellow
$envContent = @"
# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here_change_this

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth (nếu sử dụng)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP Configuration (nếu sử dụng email thật)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=TVD School Platform
SMTP_FROM_EMAIL=no-reply@tvd.school
"@

$envContent | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/.env"

# Tạo script khởi động
Write-Host "`n🚀 Tạo script khởi động..." -ForegroundColor Yellow
$startScript = @"
#!/bin/bash
cd $remoteDir

echo "Starting School Platform..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "Waiting for services to start..."
sleep 30

echo "Checking service status..."
docker-compose ps

echo "School Platform is starting up!"
echo "Frontend: http://$VPS_IP"
echo "API Services: http://$VPS_IP:3001-3006"
"@

$startScript | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/start.sh && chmod +x $remoteDir/start.sh"

# Tạo script dừng
$stopScript = @"
#!/bin/bash
cd $remoteDir
echo "Stopping School Platform..."
docker-compose down
echo "All services stopped."
"@

$stopScript | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/stop.sh && chmod +x $remoteDir/stop.sh"

# Tạo script backup
$backupScript = @"
#!/bin/bash
cd $remoteDir
BACKUP_DIR="/opt/backups"
mkdir -p \$BACKUP_DIR

echo "Creating backup..."
docker exec school_postgres pg_dumpall -U postgres > \$BACKUP_DIR/school_platform_\$(date +%Y%m%d_%H%M%S).sql

echo "Backup completed: \$BACKUP_DIR/school_platform_\$(date +%Y%m%d_%H%M%S).sql"
"@

$backupScript | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/backup.sh && chmod +x $remoteDir/backup.sh"

# Tạo thư mục services trên VPS
Write-Host "`n📁 Tạo thư mục services trên VPS..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $remoteDir/services"

# Copy các service lên VPS
Write-Host "`n📤 Copy các service lên VPS..." -ForegroundColor Yellow
$services = @("auth-service", "report-service", "diary-service", "community-service", "event-service", "teacher-service", "frontend")

foreach ($service in $services) {
    Write-Host "Copying $service..." -ForegroundColor Cyan
    scp -r -P $VPS_PORT "./$service" "$VPS_USER@$VPS_IP:$remoteDir/services/"
}

# Copy nginx config
Write-Host "`n📤 Copy nginx config..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $remoteDir/config"
scp -r -P $VPS_PORT "./gateway" "$VPS_USER@$VPS_IP:$remoteDir/config/"

# Tạo nginx config cho production
$nginxConfig = @"
events {
    worker_connections 1024;
}

http {
    upstream auth_service {
        server auth-service:3001;
    }
    
    upstream report_service {
        server report-service:3002;
    }
    
    upstream diary_service {
        server diary-service:3003;
    }
    
    upstream community_service {
        server community-service:3004;
    }
    
    upstream event_service {
        server event-service:3005;
    }
    
    upstream teacher_service {
        server teacher-service:3006;
    }
    
    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name $VPS_IP;
        
        # Redirect HTTP to HTTPS
        return 301 https://\$server_name\$request_uri;
    }

    server {
        listen 443 ssl;
        server_name $VPS_IP;
        
        # SSL Configuration (self-signed for now)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # API Routes
        location /api/auth/ {
            proxy_pass http://auth_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/reports/ {
            proxy_pass http://report_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/diary/ {
            proxy_pass http://diary_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/community/ {
            proxy_pass http://community_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/events/ {
            proxy_pass http://event_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/teacher/ {
            proxy_pass http://teacher_service/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
"@

$nginxConfig | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/config/nginx.conf"

# Tạo SSL certificate tự ký
Write-Host "`n🔒 Tạo SSL certificate tự ký..." -ForegroundColor Yellow
ssh -p $VPS_PORT $VPS_USER@$VPS_IP @"
mkdir -p $remoteDir/config/ssl
cd $remoteDir/config/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "/C=VN/ST=Hanoi/L=Hanoi/O=TVD School/CN=$VPS_IP"
"@

# Tạo README
Write-Host "`n📖 Tạo README..." -ForegroundColor Yellow
$readme = @"
# TVD School Platform - VPS Deployment

## Cấu trúc thư mục
- \`services/\`: Chứa tất cả microservices
- \`config/\`: Cấu hình nginx và SSL
- \`data/\`: Dữ liệu PostgreSQL
- \`logs/\`: Log files

## Các lệnh cơ bản

### Khởi động hệ thống
\`\`\`bash
./start.sh
\`\`\`

### Dừng hệ thống
\`\`\`bash
./stop.sh
\`\`\`

### Backup database
\`\`\`bash
./backup.sh
\`\`\`

### Xem logs
\`\`\`bash
docker-compose logs -f [service_name]
\`\`\`

### Restart service
\`\`\`bash
docker-compose restart [service_name]
\`\`\`

## Truy cập
- Frontend: https://$VPS_IP
- API Services: https://$VPS_IP/api/[service]

## Cấu hình
Chỉnh sửa file \`.env\` để thay đổi các biến môi trường.
"@

$readme | ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cat > $remoteDir/README.md"

Write-Host "`n✅ Hoàn thành! Hệ thống đã được chuẩn bị trên VPS." -ForegroundColor Green
Write-Host "`n📋 Các bước tiếp theo:" -ForegroundColor Yellow
Write-Host "1. SSH vào VPS: ssh -p $VPS_PORT $VPS_USER@$VPS_IP" -ForegroundColor White
Write-Host "2. Chỉnh sửa file .env với các giá trị thực tế" -ForegroundColor White
Write-Host "3. Chạy: cd $remoteDir && ./start.sh" -ForegroundColor White
Write-Host "4. Kiểm tra: docker-compose ps" -ForegroundColor White

Write-Host "`n🚀 Bạn có muốn tôi giúp khởi động hệ thống ngay bây giờ không?" -ForegroundColor Cyan 