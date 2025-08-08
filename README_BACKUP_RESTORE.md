# 🔄 Backup & Restore Guide

## 📦 Backup System

### Tự động backup trước khi rebuild:
```powershell
# Windows PowerShell
.\rebuild-safe.ps1

# Linux/Mac
./rebuild-safe.sh
```

### Backup thủ công:
```bash
./backup.sh
```

### Restore từ backup:
```bash
./restore.sh complete_backup_YYYYMMDD_HHMMSS.tar.gz
```

## 🗂️ Files được backup:

### ✅ Database
- **PostgreSQL**: Toàn bộ database (users, profiles, events, diaries, posts, etc.)
- **Location**: `backups/database_backup_YYYYMMDD_HHMMSS.sql`

### ✅ Uploads
- **Community uploads**: Files từ community service
- **Teacher uploads**: Files từ teacher service (avatars, etc.)
- **Location**: `backups/community_uploads_YYYYMMDD_HHMMSS.tar.gz`

### ✅ Complete Archive
- **File**: `backups/complete_backup_YYYYMMDD_HHMMSS.tar.gz`
- **Contains**: Database + Community uploads + Teacher uploads

## 🔧 Vấn đề đã khắc phục:

### ❌ **Trước đây:**
- Teacher service thiếu volume mapping cho source code
- Khi rebuild, code mới không được mount vào container
- Dữ liệu hồ sơ cá nhân bị mất

### ✅ **Bây giờ:**
- Teacher service có volume mapping đầy đủ
- Database được backup tự động
- Script rebuild an toàn với backup trước khi rebuild

## 📋 Cách sử dụng:

### 1. **Rebuild an toàn (Khuyến nghị):**
```powershell
.\rebuild-safe.ps1
```
- Tự động backup trước khi rebuild
- Chọn service cần rebuild
- An toàn 100%

### 2. **Backup thủ công:**
```bash
./backup.sh
```

### 3. **Restore dữ liệu:**
```bash
# Xem danh sách backup
ls backups/

# Restore từ backup
./restore.sh complete_backup_20250808_201851.tar.gz
```

### 4. **Kiểm tra backup:**
```bash
# Xem nội dung backup
tar -tzf backups/complete_backup_YYYYMMDD_HHMMSS.tar.gz
```

## 🚨 Lưu ý quan trọng:

1. **Luôn dùng `rebuild-safe.ps1`** thay vì `docker-compose build` trực tiếp
2. **Backup tự động** trước mỗi lần rebuild
3. **Database được bảo vệ** bởi Docker volume `postgres_data`
4. **Uploads được backup** riêng biệt

## 📊 Kiểm tra trạng thái:

```bash
# Kiểm tra services
docker-compose ps

# Kiểm tra volumes
docker volume ls

# Kiểm tra backup files
ls -la backups/
```

## 🔄 Quy trình làm việc an toàn:

1. **Trước khi thay đổi code:**
   ```bash
   ./backup.sh
   ```

2. **Rebuild service:**
   ```powershell
   .\rebuild-safe.ps1
   ```

3. **Nếu có lỗi:**
   ```bash
   ./restore.sh <backup_file>
   ```

4. **Kiểm tra dữ liệu:**
   - Đăng nhập vào hệ thống
   - Kiểm tra hồ sơ cá nhân
   - Kiểm tra uploads

## 🎯 Kết quả:

- ✅ **Dữ liệu không bao giờ mất**
- ✅ **Backup tự động trước rebuild**
- ✅ **Restore dễ dàng**
- ✅ **Hồ sơ cá nhân được bảo vệ**
- ✅ **Uploads được backup** 