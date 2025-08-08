# 🚀 Hướng dẫn di chuyển hệ thống lên VPS

## 📋 Tổng quan

Hướng dẫn chi tiết cách di chuyển toàn bộ hệ thống School Platform từ máy local lên VPS mà **KHÔNG MẤT DỮ LIỆU**.

## ✅ Dữ liệu được bảo vệ

### 🗄️ Database
- **Users**: Tài khoản người dùng, thông tin đăng nhập
- **Teacher Profiles**: Hồ sơ cá nhân giáo viên
- **Events**: Sự kiện, lịch trình
- **Diaries**: Nhật ký cá nhân
- **Posts**: Bài viết cộng đồng
- **Comments**: Bình luận
- **Likes/Reactions**: Tương tác
- **Reports**: Báo cáo, thống kê

### 📁 Files & Uploads
- **Avatars**: Ảnh đại diện người dùng
- **Community Uploads**: Files từ bài viết cộng đồng
- **Teacher Uploads**: Files từ hồ sơ giáo viên
- **Media Files**: Hình ảnh, video, documents

### ⚙️ Cấu hình
- **Environment Variables**: Cấu hình môi trường
- **Docker Volumes**: Dữ liệu persistent
- **Network Settings**: Cấu hình mạng
- **SSL Certificates**: Chứng chỉ bảo mật

## 🛠️ Chuẩn bị VPS

### 1. Yêu cầu hệ thống
```bash
# Minimum requirements
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- OS: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
```

### 2. Cài đặt cơ bản
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git unzip

# Install SSH server (if not installed)
sudo apt install -y openssh-server
sudo systemctl enable ssh
sudo systemctl start ssh
```

### 3. Cấu hình firewall
```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports
sudo ufw allow 3000  # Frontend
sudo ufw allow 3001  # Auth Service
sudo ufw allow 3002  # Report Service
sudo ufw allow 3003  # Diary Service
sudo ufw allow 3004  # Community Service
sudo ufw allow 3005  # Event Service
sudo ufw allow 3006  # Teacher Service

# Enable firewall
sudo ufw enable
```

## 🚀 Di chuyển tự động (Khuyến nghị)

### Windows PowerShell
```powershell
# Chạy script tự động
.\migrate-to-vps.ps1
```

### Linux/Mac
```bash
# Chạy script tự động
./migrate-to-vps.sh
```

### Quy trình tự động:
1. **Backup** dữ liệu cuối cùng
2. **Test SSH** connection
3. **Upload** toàn bộ project
4. **Cài đặt** Docker trên VPS
5. **Restore** dữ liệu
6. **Khởi động** services

## 📤 Di chuyển thủ công

### Bước 1: Backup dữ liệu local
```bash
# Tạo backup cuối cùng
./backup.sh

# Kiểm tra backup
ls -la backups/
# Output: complete_backup_20250808_201851.tar.gz
```

### Bước 2: Chuẩn bị VPS
```bash
# SSH vào VPS
ssh user@your-vps-ip

# Tạo thư mục project
mkdir -p /home/user/school-platform
cd /home/user/school-platform
```

### Bước 3: Cài đặt Docker trên VPS
```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout và login lại để áp dụng group
exit
ssh user@your-vps-ip
```

### Bước 4: Upload files
```bash
# Từ máy local, upload project
scp -r LOCAL/* user@your-vps-ip:/home/user/school-platform/

# Upload backup
scp backups/complete_backup_*.tar.gz user@your-vps-ip:/home/user/school-platform/backups/
```

### Bước 5: Restore và khởi động
```bash
# SSH vào VPS
ssh user@your-vps-ip
cd /home/user/school-platform

# Restore dữ liệu
./restore.sh complete_backup_YYYYMMDD_HHMMSS.tar.gz

# Khởi động services
docker-compose up -d

# Kiểm tra trạng thái
docker-compose ps
```

## 🔧 Cấu hình sau khi di chuyển

### 1. Cập nhật domain (nếu có)
```bash
# Chỉnh sửa nginx.conf
sudo nano gateway/nginx.conf

# Thêm domain
server_name your-domain.com www.your-domain.com;
```

### 2. Cấu hình SSL (Let's Encrypt)
```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Thêm: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Cấu hình email thật
```bash
# Chỉnh sửa docker-compose.yml
environment:
  - SMTP_HOST=smtp.gmail.com
  - SMTP_PORT=587
  - SMTP_SECURE=false
  - SMTP_USER=your-email@gmail.com
  - SMTP_PASS=your-app-password
  - SMTP_FROM_NAME=TVD School Platform
  - SMTP_FROM_EMAIL=your-email@gmail.com
```

### 4. Cấu hình backup tự động
```bash
# Tạo cron job cho backup
crontab -e

# Backup hàng ngày lúc 2:00 AM
0 2 * * * cd /home/user/school-platform && ./backup.sh

# Backup hàng tuần
0 2 * * 0 cd /home/user/school-platform && ./backup.sh
```

## 📊 Kiểm tra và monitoring

### 1. Kiểm tra services
```bash
# Trạng thái services
docker-compose ps

# Logs real-time
docker-compose logs -f

# Logs của service cụ thể
docker-compose logs -f auth-service
docker-compose logs -f frontend
```

### 2. Kiểm tra database
```bash
# Kết nối database
docker exec -it school_postgres psql -U postgres

# Liệt kê databases
\l

# Kết nối database cụ thể
\c school_auth
\dt
```

### 3. Kiểm tra volumes
```bash
# Liệt kê volumes
docker volume ls

# Kiểm tra volume data
docker volume inspect local_postgres_data
```

## 🔄 Quản lý và bảo trì

### 1. Update hệ thống
```bash
# Pull code mới
git pull origin main

# Rebuild và restart
./rebuild-safe.sh

# Hoặc rebuild thủ công
docker-compose build --no-cache
docker-compose up -d
```

### 2. Backup định kỳ
```bash
# Backup thủ công
./backup.sh

# Kiểm tra backup
ls -la backups/

# Restore nếu cần
./restore.sh complete_backup_YYYYMMDD_HHMMSS.tar.gz
```

### 3. Monitoring logs
```bash
# Tạo script monitoring
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
docker-compose ps
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Recent Logs ==="
docker-compose logs --tail=20
EOF

chmod +x monitor.sh
```

## 🚨 Troubleshooting

### 1. Services không start
```bash
# Kiểm tra logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild services
docker-compose build --no-cache
docker-compose up -d
```

### 2. Database connection error
```bash
# Kiểm tra database container
docker exec -it school_postgres pg_isready -U postgres

# Restart database
docker-compose restart postgres

# Kiểm tra volumes
docker volume ls
```

### 3. Port conflicts
```bash
# Kiểm tra ports đang sử dụng
netstat -tulpn | grep :300

# Thay đổi ports trong docker-compose.yml
ports:
  - "3001:3001"  # Thay đổi port bên trái
```

### 4. Memory issues
```bash
# Kiểm tra memory usage
docker stats

# Tăng swap nếu cần
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📞 Hỗ trợ

### Logs quan trọng
```bash
# Application logs
docker-compose logs -f

# System logs
sudo journalctl -f

# Nginx logs
docker-compose logs nginx
```

### Thông tin hệ thống
```bash
# System info
uname -a
cat /etc/os-release

# Docker info
docker version
docker-compose version

# Disk space
df -h
```

## 🎯 Checklist hoàn thành

- [ ] VPS đã được cài đặt và cấu hình
- [ ] Docker và Docker Compose đã được cài đặt
- [ ] Firewall đã được cấu hình
- [ ] Backup đã được tạo từ local
- [ ] Files đã được upload lên VPS
- [ ] Dữ liệu đã được restore
- [ ] Services đã được khởi động
- [ ] Domain đã được cấu hình (nếu có)
- [ ] SSL đã được cài đặt (nếu có)
- [ ] Email đã được cấu hình
- [ ] Backup tự động đã được thiết lập
- [ ] Monitoring đã được cấu hình

## 🎉 Kết quả

Sau khi hoàn thành, bạn sẽ có:
- ✅ **Hệ thống chạy ổn định trên VPS**
- ✅ **Dữ liệu 100% nguyên vẹn**
- ✅ **Backup system hoạt động**
- ✅ **SSL certificate (nếu cấu hình)**
- ✅ **Email thật hoạt động**
- ✅ **Monitoring và alerting**
- ✅ **Auto-backup hàng ngày**

**Hệ thống sẵn sàng phục vụ người dùng thật!** 🚀 