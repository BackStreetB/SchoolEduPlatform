# 🛡️ Hướng dẫn Phòng chống Mất Dữ liệu

## ❌ VẤN ĐỀ ĐÃ PHÁT HIỆN VÀ KHẮC PHỤC

### Nguyên nhân gây mất dữ liệu hồ sơ cá nhân:

**Lỗi trong `teacher-service/src/config/database.js`:**
```javascript
// ❌ NGUY HIỂM - Gây mất dữ liệu
await pool.query('DROP TABLE IF EXISTS teacher_profiles CASCADE');
```

**✅ ĐÃ SỬA THÀNH:**
```javascript
// ✅ AN TOÀN - Chỉ tạo bảng nếu chưa có
// Create teacher_profiles table (only if not exists)
// DO NOT DROP - this was causing data loss!
```

## 🔧 CÁC BIỆN PHÁP PHÒNG NGỪA

### 1. ✅ Kiểm tra tất cả Database Initialization
- **auth-service**: ✅ Sử dụng `CREATE TABLE IF NOT EXISTS`
- **community-service**: ✅ Sử dụng `CREATE TABLE IF NOT EXISTS`
- **diary-service**: ✅ Sử dụng `CREATE TABLE IF NOT EXISTS`
- **event-service**: ✅ Sử dụng `CREATE TABLE IF NOT EXISTS`
- **report-service**: ✅ Sử dụng `CREATE TABLE IF NOT EXISTS`
- **teacher-service**: ✅ ĐÃ SỬA - Bỏ DROP TABLE

### 2. ✅ Backup Tự động Hàng ngày
**File**: `daily-backup.ps1`
- Backup database mỗi ngày
- Tự động dọn dẹp backup cũ (giữ 7 ngày)
- Chạy bằng Windows Task Scheduler

**Cách thiết lập:**
```powershell
# Test backup thủ công
.\daily-backup.ps1

# Tạo task tự động (chạy hàng ngày lúc 2AM)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File 'D:\System_School_TVD\LOCAL\daily-backup.ps1'"
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "SchoolPlatform-DailyBackup" -Description "Daily backup for School Platform"
```

### 3. ✅ Docker Volumes được cấu hình đúng
```yaml
volumes:
  postgres_data:        # ✅ Database persistence
  community_uploads:    # ✅ Community files persistence  
  teacher_uploads:      # ✅ Teacher files persistence
```

## 🚨 QUY TẮC PHÁT TRIỂN

### ❌ TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM:
```javascript
// ❌ NGUY HIỂM
DROP TABLE tablename;
DROP TABLE IF EXISTS tablename;
DROP TABLE IF EXISTS tablename CASCADE;
TRUNCATE TABLE tablename;
DELETE FROM tablename; // Không có WHERE
```

### ✅ CHỈ ĐƯỢC DÙNG:
```javascript
// ✅ AN TOÀN
CREATE TABLE IF NOT EXISTS tablename (...);
ALTER TABLE tablename ADD COLUMN IF NOT EXISTS ...;
INSERT INTO tablename ... ON CONFLICT DO NOTHING;
UPDATE tablename SET ... WHERE condition;
DELETE FROM tablename WHERE condition; // Phải có WHERE
```

## 🔄 QUY TRÌNH LÀM VIỆC AN TOÀN

### Trước khi thay đổi Database Schema:
1. **Backup trước:**
   ```powershell
   .\daily-backup.ps1
   ```

2. **Test trên development:**
   - Không test trực tiếp trên production
   - Kiểm tra kỹ migration scripts

3. **Review code:**
   - Tìm kiếm từ khóa nguy hiểm: `DROP`, `TRUNCATE`, `DELETE FROM`
   - Đảm bảo tất cả đều có `IF NOT EXISTS`

### Sau khi deploy:
1. **Kiểm tra dữ liệu:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM teacher_profiles;
   ```

2. **Backup ngay lập tức:**
   ```powershell
   .\daily-backup.ps1
   ```

## 📊 MONITORING & ALERTS

### Kiểm tra hàng ngày:
```powershell
# Kiểm tra số lượng records
docker exec school_postgres psql -U postgres -d school_auth -c "SELECT COUNT(*) as users FROM users;"
docker exec school_postgres psql -U postgres -d school_teacher -c "SELECT COUNT(*) as profiles FROM teacher_profiles;"

# Kiểm tra backup files
Get-ChildItem backups\database_backup_*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### Cảnh báo khi:
- Số lượng users giảm đột ngột
- Teacher profiles = 0
- Backup file < 50KB
- Không có backup trong 2 ngày

## 🛠️ RECOVERY PLAN

### Nếu mất dữ liệu:
1. **Ngừng tất cả services:**
   ```powershell
   docker-compose down
   ```

2. **Restore từ backup gần nhất:**
   ```powershell
   # Xem danh sách backup
   dir backups\
   
   # Restore (Linux/WSL)
   bash restore.sh database_backup_YYYYMMDD_HHMMSS.sql
   
   # Hoặc restore thủ công (Windows)
   docker-compose up -d postgres
   docker exec -i school_postgres psql -U postgres < backups\database_backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Restart services:**
   ```powershell
   docker-compose up -d
   ```

4. **Kiểm tra dữ liệu:**
   - Đăng nhập vào hệ thống
   - Kiểm tra hồ sơ cá nhân
   - Kiểm tra tất cả chức năng

## 📝 CHECKLIST TRƯỚC KHI DEPLOY

- [ ] Không có `DROP TABLE` trong code mới
- [ ] Tất cả `CREATE TABLE` đều có `IF NOT EXISTS`
- [ ] Đã test migration script trên dev environment
- [ ] Đã tạo backup trước khi deploy
- [ ] Đã review code changes liên quan đến database
- [ ] Có plan rollback nếu deploy fail

## 🎯 KẾT QUẢ

Sau khi áp dụng các biện pháp trên:
- ✅ **Dữ liệu không bao giờ bị mất khi restart Docker**
- ✅ **Backup tự động hàng ngày**
- ✅ **Code review process để phòng ngừa lỗi**
- ✅ **Recovery plan rõ ràng**
- ✅ **Monitoring & alerts**

---
**Ngày cập nhật:** 11/08/2025  
**Tình trạng:** ✅ Đã khắc phục hoàn toàn
