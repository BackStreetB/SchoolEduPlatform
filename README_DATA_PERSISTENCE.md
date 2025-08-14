# Hướng dẫn Bảo vệ Dữ liệu - School Platform

## 🛡️ Tính Bền Vững Của Dữ Liệu

Hệ thống đã được cấu hình để **ĐẢM BẢO DỮ LIỆU KHÔNG BAO GIỜ BỊ MẤT**, ngay cả khi:
- Tắt Docker
- Xóa containers
- Build lại images
- Di chuyển lên VPS

## 📁 Cấu Trúc Lưu Trữ Dữ Liệu

### 1. Database (PostgreSQL)
- **Volume**: `postgres_data`
  - Tài khoản người dùng
  - Thông tin profile
  - Bài viết cộng đồng
  - Nhật ký
  - Báo cáo
  - Sự kiện

### 2. Uploads (Files)
- **Community Uploads**: `community_uploads` volume
- **Teacher Uploads**: `teacher_uploads` volume
- **Dữ liệu bao gồm**:
  - Ảnh đại diện
  - Media trong bài viết
  - Files đính kèm

## 🔄 Các Lệnh Quản Lý Dữ Liệu

### Khởi động hệ thống
```bash
docker-compose up -d
```

### Dừng hệ thống (dữ liệu vẫn được bảo vệ)
```bash
docker-compose down
```

### Xóa containers nhưng giữ dữ liệu
```bash
docker-compose down
docker-compose up -d
```

### Backup dữ liệu
```bash
# Tạo backup
./backup.sh

# Backup sẽ được lưu trong thư mục ./backups/
# Format: complete_backup_YYYYMMDD_HHMMSS.tar.gz
```

### Khôi phục dữ liệu
```bash
# Khôi phục từ backup
./restore.sh complete_backup_20250807_143000.tar.gz

# Sau đó restart services
docker-compose restart
```

### Xem danh sách volumes
```bash
docker volume ls
```

### Xem thông tin volume
```bash
docker volume inspect local_postgres_data
```

## ⚠️ Lưu Ý Quan Trọng

### ✅ AN TOÀN (Dữ liệu được bảo vệ)
- `docker-compose down`
- `docker-compose restart`
- `docker-compose up -d`
- Xóa containers
- Build lại images

### ❌ NGUY HIỂM (Có thể mất dữ liệu)
- `docker-compose down --volumes` (xóa volumes)
- `docker volume rm local_postgres_data`
- Xóa thư mục `/var/lib/docker/volumes/`

## 🚀 Di Chuyển Lên VPS

### Bước 1: Backup dữ liệu hiện tại
```bash
./backup.sh
```

### Bước 2: Copy files lên VPS
```bash
# Copy toàn bộ thư mục LOCAL
scp -r LOCAL/ user@your-vps:/path/to/destination/

# Hoặc copy backup file
scp backups/complete_backup_*.tar.gz user@your-vps:/path/to/backups/
```

### Bước 3: Trên VPS
```bash
# Cài đặt Docker và Docker Compose
# Copy files
# Chạy hệ thống
cd LOCAL
docker-compose up -d

# Nếu có backup file
./restore.sh complete_backup_*.tar.gz
docker-compose restart
```

## 📊 Kiểm Tra Dữ Liệu

### Kiểm tra database
```bash
# Kết nối vào PostgreSQL
docker exec -it school_postgres psql -U postgres -d school_auth

# Xem danh sách databases
\l

# Xem danh sách bảng
\dt

# Xem dữ liệu users
SELECT * FROM users;
```

### Kiểm tra uploads
```bash
# Xem community uploads
docker exec -it school_community_service ls -la /app/uploads

# Xem teacher uploads
docker exec -it school_teacher_service ls -la /app/uploads
```

## 🔧 Troubleshooting

### Nếu dữ liệu bị mất
1. Kiểm tra volumes còn tồn tại không:
   ```bash
   docker volume ls | grep postgres_data
   ```

2. Nếu có backup, khôi phục:
   ```bash
   ./restore.sh latest_backup_file.tar.gz
   ```

3. Nếu không có backup, kiểm tra volume:
   ```bash
   docker volume inspect local_postgres_data
   ```

### Nếu services không start
1. Kiểm tra logs:
   ```bash
   docker-compose logs postgres
   ```

2. Kiểm tra quyền truy cập volume:
   ```bash
   docker exec -it school_postgres ls -la /var/lib/postgresql/data
   ```

## 📝 Lịch Sử Thay Đổi

- **2025-08-07**: Cấu hình volumes cho uploads
- **2025-08-07**: Tạo scripts backup/restore
- **2025-08-07**: Cải thiện tính bền vững dữ liệu

---

**⚠️ QUAN TRỌNG**: Luôn backup dữ liệu trước khi thực hiện các thay đổi lớn! 