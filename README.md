# TVD_School_Platform

Nền tảng quản lý trường học thống nhất với kiến trúc microservices, được xây dựng bằng Node.js, React và PostgreSQL.

## 🏗️ Kiến trúc Hệ thống

### Microservices Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Gateway       │    │   PostgreSQL    │
│   (React)       │◄──►│   (Nginx)       │◄──►│   Database      │
│   Port: 3000    │    │   Port: 80      │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
            ┌───────▼──────┐  │  ┌──────▼──────┐
            │ Auth Service │  │  │Community Svc│
            │ Port: 3001   │  │  │ Port: 3004  │
            └──────────────┘  │  └─────────────┘
                              │
            ┌───────▼──────┐  │  ┌──────▼──────┐
            │Diary Service │  │  │ Event Svc   │
            │ Port: 3003   │  │  │ Port: 3005  │
            └──────────────┘  │  └─────────────┘
                              │
            ┌───────▼──────┐  │  ┌──────▼──────┐
            │Report Service│  │  │Teacher Svc  │
            │ Port: 3006   │  │  │ Port: 3007  │
            └──────────────┘  │  └─────────────┘
```

## 📁 Cấu trúc Dự án

```
LOCAL/
├── auth-service/          # Xác thực và đăng nhập
├── community-service/     # Quản lý bài viết và bình luận
├── diary-service/         # Quản lý nhật ký cá nhân
├── event-service/         # Quản lý sự kiện và lịch
├── report-service/        # Báo cáo và thống kê
├── teacher-service/       # Quản lý hồ sơ giáo viên
├── frontend/             # Giao diện người dùng React
├── gateway/              # API Gateway với Nginx
├── uploads/              # Thư mục lưu trữ file
├── docker-compose.yml    # Cấu hình Docker Compose
└── README.md            # Tài liệu này
```

## 🚀 Cách Chạy Dự án

### Yêu cầu Hệ thống
- Docker & Docker Compose
- Node.js 18+ (cho development)
- Git

### Bước 1: Clone Repository
```bash
git clone <repository-url>
cd LOCAL
```

### Bước 2: Khởi động Hệ thống
```bash
# Khởi động tất cả services
docker-compose up -d

# Hoặc build lại từ đầu
docker-compose build --no-cache
docker-compose up -d
```

### Bước 3: Truy cập Ứng dụng
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:80

## 🔧 Các Services

### 1. Auth Service (Port: 3001)
- **Chức năng**: Xác thực, đăng ký, đăng nhập
- **Database**: `school_auth`
- **API Endpoints**:
  - `POST /api/auth/register` - Đăng ký
  - `POST /api/auth/login` - Đăng nhập
  - `GET /api/auth/profile` - Lấy thông tin profile

### 2. Community Service (Port: 3004)
- **Chức năng**: Quản lý bài viết, bình luận, reactions
- **Database**: `school_community`
- **API Endpoints**:
  - `GET /api/community` - Lấy danh sách bài viết
  - `POST /api/community` - Tạo bài viết mới
  - `POST /api/community/:id/comments` - Thêm bình luận

### 3. Diary Service (Port: 3003)
- **Chức năng**: Quản lý nhật ký cá nhân
- **Database**: `school_diary`
- **API Endpoints**:
  - `GET /api/diary` - Lấy danh sách nhật ký
  - `POST /api/diary` - Tạo nhật ký mới
  - `PUT /api/diary/:id` - Cập nhật nhật ký

### 4. Event Service (Port: 3005)
- **Chức năng**: Quản lý sự kiện và lịch
- **Database**: `school_events`
- **API Endpoints**:
  - `GET /api/events` - Lấy danh sách sự kiện
  - `POST /api/events` - Tạo sự kiện mới
  - `PUT /api/events/:id` - Cập nhật sự kiện

### 5. Report Service (Port: 3006)
- **Chức năng**: Báo cáo và thống kê
- **Database**: `school_reports`
- **API Endpoints**:
  - `GET /api/reports` - Lấy báo cáo
  - `POST /api/reports` - Tạo báo cáo mới

### 6. Teacher Service (Port: 3007)
- **Chức năng**: Quản lý hồ sơ giáo viên
- **Database**: `school_db`
- **API Endpoints**:
  - `GET /api/teacher/profile/:id` - Lấy profile giáo viên
  - `PUT /api/teacher/profile/:id` - Cập nhật profile

## 🗄️ Database Schema

### school_auth
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### school_community
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### school_diary
```sql
CREATE TABLE diary_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255),
  content TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

## 🔐 Authentication Flow

1. **Đăng ký**: User tạo tài khoản → Auth Service tạo user → Trả về JWT token
2. **Đăng nhập**: User đăng nhập → Auth Service xác thực → Trả về JWT token
3. **API Calls**: Frontend gửi JWT token trong header → Services xác thực token
4. **Token Refresh**: Token hết hạn → User đăng nhập lại

## 📱 Tính năng Chính

### 1. Dashboard
- Lịch tổng quan
- Thống kê hoạt động
- Truy cập nhanh các tính năng

### 2. Sự kiện
- Tạo, chỉnh sửa, xóa sự kiện
- Chỉnh sửa được sự kiện hiện tại và tương lai
- Xem chi tiết sự kiện
- Định dạng thời gian 24h

### 3. Nhật ký
- Viết nhật ký hàng ngày
- Chỉnh sửa nhật ký trong ngày
- Xem nhật ký các ngày trước
- Không bắt buộc điền các trường

### 4. Cộng đồng
- Đăng bài viết với media
- Bình luận và reactions
- Đếm bình luận chính xác
- Hiển thị tên người dùng đúng

### 5. Quản lý Profile
- Cập nhật thông tin cá nhân
- Upload avatar
- Xem profile người khác

## 🛠️ Development

### Cấu trúc Frontend
```
frontend/src/
├── App.js              # Component chính
├── App.css             # Styles
├── components/         # Các component con
├── services/          # API calls
├── utils/             # Utility functions
└── store/             # State management
```

### Environment Variables
Tạo file `.env` cho mỗi service:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
```

### Docker Commands
```bash
# Xem logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild service
docker-compose build --no-cache [service-name]

# Stop all services
docker-compose down

# Xem containers đang chạy
docker ps
```

## 🚀 Deployment

### Production Setup
1. Cấu hình environment variables
2. Setup SSL certificates
3. Cấu hình Nginx reverse proxy
4. Setup database backup
5. Monitoring và logging

### Backup Database
```bash
# Backup
docker exec school_postgres pg_dump -U postgres school_auth > backup_auth.sql

# Restore
docker exec -i school_postgres psql -U postgres school_auth < backup_auth.sql
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Tạo Pull Request

## 📝 Changelog

### Version 1.0.0
- ✅ Đổi tên ứng dụng thành TVD_School_Platform
- ✅ Bỏ AM/PM trong sự kiện (định dạng 24h)
- ✅ Thêm chức năng xem/chỉnh sửa/xóa sự kiện
- ✅ Bỏ bắt buộc điền các trường nhật ký
- ✅ Sửa lỗi đếm bình luận
- ✅ Cải thiện hiển thị tên người dùng
- ✅ Thêm nút refresh token

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 📞 Support

- **Email**: support@tvd-school.com
- **GitHub Issues**: [Tạo issue mới](https://github.com/BackStreetB/SchoolEduPlatform/issues)

---

**TVD_School_Platform** - Nền tảng quản lý trường học thống nhất 🏫 