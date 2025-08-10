# 🚀 Hướng dẫn Migrate hệ thống TVD School Platform lên VPS

## 📋 Thông tin VPS
- **IP:** 222.255.214.154
- **Username:** root
- **Password:** V6eUxFkPGGJXhKlrj0JM
- **Port SSH:** 22

## 🔄 Quy trình Migrate

### Bước 1: Backup dữ liệu hiện tại
Trước khi migrate, bạn cần backup toàn bộ dữ liệu:

```powershell
# Chạy script backup
.\backup-before-migration.ps1
```

Script này sẽ:
- Backup tất cả databases PostgreSQL
- Backup uploads từ community và teacher services
- Backup configuration files
- Backup source code
- Tạo file ZIP để dễ dàng transfer

### Bước 2: Deploy lên VPS
Sử dụng script deploy để chuẩn bị VPS:

```powershell
# Chạy script deploy
.\deploy-to-vps.ps1
```

Script này sẽ:
- Kiểm tra kết nối SSH
- Cài đặt Docker và Docker Compose trên VPS
- Tạo cấu trúc thư mục
- Copy toàn bộ services lên VPS
- Tạo docker-compose.yml cho production
- Tạo nginx config với SSL
- Tạo các script quản lý (start, stop, backup)

### Bước 3: Khởi động hệ thống trên VPS
SSH vào VPS và khởi động:

```bash
# SSH vào VPS
ssh -p 22 root@222.255.214.154

# Chuyển đến thư mục dự án
cd /opt/school-platform

# Chỉnh sửa file .env với các giá trị thực tế
nano .env

# Khởi động hệ thống
./start.sh
```

### Bước 4: Restore dữ liệu
Sau khi hệ thống chạy, restore dữ liệu:

```powershell
# Restore dữ liệu từ backup
.\restore-on-vps.ps1 -BackupPath ".\backups\migration-YYYYMMDD-HHMMSS"
```

## 📁 Cấu trúc thư mục trên VPS

```
/opt/school-platform/
├── services/                 # Chứa tất cả microservices
│   ├── auth-service/
│   ├── report-service/
│   ├── diary-service/
│   ├── community-service/
│   ├── event-service/
│   ├── teacher-service/
│   └── frontend/
├── config/                   # Cấu hình nginx và SSL
│   ├── nginx.conf
│   └── ssl/
├── data/                     # Dữ liệu PostgreSQL
├── logs/                     # Log files
├── docker-compose.yml        # Production docker-compose
├── .env                      # Biến môi trường
├── start.sh                  # Script khởi động
├── stop.sh                   # Script dừng
├── backup.sh                 # Script backup
└── README.md                 # Hướng dẫn
```

## 🔧 Cấu hình Production

### File .env
Chỉnh sửa các giá trị sau trong file `.env`:

```bash
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
```

### SSL Certificate
Script sẽ tạo SSL certificate tự ký. Để sử dụng SSL thật:
1. Mua domain và SSL certificate
2. Copy certificate vào `/opt/school-platform/config/ssl/`
3. Cập nhật nginx.conf

## 🚀 Quản lý hệ thống

### Khởi động
```bash
./start.sh
```

### Dừng
```bash
./stop.sh
```

### Backup
```bash
./backup.sh
```

### Xem logs
```bash
docker-compose logs -f [service_name]
```

### Restart service
```bash
docker-compose restart [service_name]
```

### Kiểm tra trạng thái
```bash
docker-compose ps
```

## 🌐 Truy cập hệ thống

- **Frontend:** https://222.255.214.154
- **API Services:** 
  - Auth: https://222.255.214.154/api/auth/
  - Reports: https://222.255.214.154/api/reports/
  - Diary: https://222.255.214.154/api/diary/
  - Community: https://222.255.214.154/api/community/
  - Events: https://222.255.214.154/api/events/
  - Teacher: https://222.255.214.154/api/teacher/

## 🔍 Troubleshooting

### Kiểm tra kết nối SSH
```bash
ssh -p 22 root@222.255.214.154
```

### Kiểm tra Docker
```bash
docker --version
docker-compose --version
```

### Kiểm tra services
```bash
cd /opt/school-platform
docker-compose ps
```

### Xem logs của service cụ thể
```bash
docker-compose logs -f auth-service
```

### Restart toàn bộ hệ thống
```bash
cd /opt/school-platform
docker-compose down
docker-compose up -d
```

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose logs -f [service_name]`
2. Kiểm tra trạng thái: `docker-compose ps`
3. Kiểm tra kết nối database: `docker exec -it school_postgres psql -U postgres`
4. Kiểm tra nginx: `docker exec -it school_nginx nginx -t`

## 🎯 Lưu ý quan trọng

1. **Backup trước khi migrate:** Luôn backup dữ liệu trước khi thực hiện bất kỳ thay đổi nào
2. **Mật khẩu mạnh:** Thay đổi tất cả mật khẩu mặc định trong file .env
3. **SSL thật:** Sử dụng SSL certificate thật cho production
4. **Monitoring:** Thiết lập monitoring và alerting cho hệ thống
5. **Backup định kỳ:** Thiết lập backup tự động hàng ngày

## 🚀 Bắt đầu ngay

1. Chạy `.\backup-before-migration.ps1`
2. Chạy `.\deploy-to-vps.ps1`
3. SSH vào VPS và chạy `./start.sh`
4. Restore dữ liệu với `.\restore-on-vps.ps1`

Chúc bạn migrate thành công! 🎉 