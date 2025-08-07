# TVD_School_Platform

## Tổng quan dự án

TVD_School_Platform là một hệ thống quản lý trường học toàn diện được xây dựng với kiến trúc microservices, cung cấp các tính năng quản lý sinh viên, giáo viên, sự kiện, nhật ký cá nhân và cộng đồng học tập.

## Kiến trúc hệ thống

### Microservices Architecture
- **Auth Service**: Xác thực và quản lý người dùng
- **Community Service**: Quản lý bài đăng và tương tác cộng đồng
- **Diary Service**: Quản lý nhật ký cá nhân
- **Event Service**: Quản lý sự kiện và lịch
- **Report Service**: Báo cáo và thống kê
- **Teacher Service**: Quản lý thông tin giáo viên
- **Frontend**: Giao diện người dùng React
- **Gateway**: API Gateway với Nginx

### Công nghệ sử dụng
- **Backend**: Node.js, Express.js
- **Frontend**: React.js
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT (JSON Web Tokens)
- **API Gateway**: Nginx

## Tính năng chính

### 1. Quản lý người dùng
- Đăng ký và đăng nhập
- Quản lý thông tin cá nhân
- Phân quyền người dùng

### 2. Cộng đồng học tập
- Tạo và chia sẻ bài đăng
- Bình luận và tương tác
- Upload media (hình ảnh, video)
- Hiển thị tên người dùng thực tế

### 3. Nhật ký cá nhân
- Tạo nhật ký hàng ngày
- Chỉnh sửa nhật ký trong ngày hiện tại
- Xem nhật ký các ngày trước (chỉ xem)
- Không yêu cầu tiêu đề hoặc nội dung

### 4. Quản lý sự kiện
- Tạo sự kiện cá nhân và công khai
- Tham gia sự kiện của người khác
- Lịch hiển thị sự kiện đa ngày
- Chỉnh sửa/xóa sự kiện hiện tại và tương lai
- Hiển thị sự kiện theo màu sắc

### 5. Dashboard tổng quan
- Giao diện thống nhất không cần cuộn
- Banner chào mừng nhỏ gọn
- Thẻ tổng quan thu nhỏ
- Lịch chuyên nghiệp kiểu Google Calendar

## Cấu trúc thư mục

```
LOCAL/
├── auth-service/          # Dịch vụ xác thực
├── community-service/     # Dịch vụ cộng đồng
├── diary-service/         # Dịch vụ nhật ký
├── event-service/         # Dịch vụ sự kiện
├── report-service/        # Dịch vụ báo cáo
├── teacher-service/       # Dịch vụ giáo viên
├── frontend/             # Giao diện người dùng
├── gateway/              # API Gateway
├── docker-compose.yml    # Cấu hình Docker
└── README.md            # Tài liệu này
```

## Cài đặt và triển khai

### Yêu cầu hệ thống
- Docker và Docker Compose
- Git
- Node.js (để phát triển)

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd System_School_TVD/LOCAL
```

### Bước 2: Cấu hình môi trường
Tạo file `.env` cho từng service dựa trên `env.example`:

```bash
# Auth Service
cp auth-service/env.example auth-service/.env

# Community Service  
cp community-service/env.example community-service/.env

# Diary Service
cp diary-service/env.example diary-service/.env

# Event Service
cp event-service/env.example event-service/.env

# Report Service
cp report-service/env.example report-service/.env

# Teacher Service
cp teacher-service/env.example teacher-service/.env
```

### Bước 3: Khởi chạy hệ thống
```bash
# Khởi động tất cả services
docker-compose up -d

# Hoặc khởi động từng service
docker-compose up -d auth-service
docker-compose up -d community-service
docker-compose up -d diary-service
docker-compose up -d event-service
docker-compose up -d report-service
docker-compose up -d teacher-service
docker-compose up -d frontend
```

### Bước 4: Truy cập ứng dụng
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080

## Cấu hình cơ sở dữ liệu

### Tạo databases
```bash
# Chạy script tạo databases
psql -U postgres -f create-databases.sql

# Tạo database báo cáo
psql -U postgres -f create-reports-db.sql
```

### Backup và Restore
```bash
# Backup database
./backup.sh

# Restore database
./restore.sh
```

## API Endpoints

### Auth Service (Port 3001)
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `GET /auth/profile` - Thông tin profile

### Community Service (Port 3002)
- `GET /community/posts` - Lấy danh sách bài đăng
- `POST /community/posts` - Tạo bài đăng mới
- `POST /community/posts/:id/comments` - Thêm bình luận
- `POST /community/posts/:id/like` - Like bài đăng

### Diary Service (Port 3003)
- `GET /diary/entries` - Lấy nhật ký
- `POST /diary/entries` - Tạo nhật ký mới
- `PUT /diary/entries/:id` - Cập nhật nhật ký
- `DELETE /diary/entries/:id` - Xóa nhật ký

### Event Service (Port 3004)
- `GET /events` - Lấy sự kiện cá nhân
- `GET /events/public/all` - Lấy sự kiện công khai
- `POST /events` - Tạo sự kiện mới
- `POST /events/:id/join` - Tham gia sự kiện
- `DELETE /events/:id/leave` - Rời sự kiện

## Luồng hoạt động

### 1. Đăng ký và đăng nhập
1. Người dùng đăng ký tài khoản
2. Hệ thống chuyển hướng đến trang đăng nhập
3. Người dùng đăng nhập thủ công
4. JWT token được lưu trong localStorage

### 2. Dashboard
1. Hiển thị banner chào mừng với thời gian thực
2. Thẻ tổng quan hiển thị số liệu thống kê
3. Lịch hiển thị sự kiện và nhật ký theo ngày
4. Giao diện responsive không cần cuộn

### 3. Quản lý sự kiện
1. Tạo sự kiện cá nhân hoặc công khai
2. Sự kiện công khai hiển thị cho tất cả người dùng
3. Người dùng khác có thể tham gia sự kiện
4. Lịch hiển thị sự kiện với màu sắc tương ứng

### 4. Nhật ký cá nhân
1. Tạo nhật ký cho ngày hiện tại
2. Chỉnh sửa nhật ký trong cùng ngày
3. Xem nhật ký các ngày trước (chỉ xem)
4. Không yêu cầu tiêu đề hoặc nội dung

## Tính năng đặc biệt

### Hiển thị tên người dùng thực tế
- Sử dụng JWT để lấy thông tin người dùng hiện tại
- Kết nối database auth để lấy tên người dùng khác
- Cập nhật real-time khi thay đổi thông tin

### Lịch chuyên nghiệp
- Giao diện giống Google Calendar
- Hiển thị sự kiện đa ngày
- Màu sắc cho từng loại sự kiện
- Hiển thị số lượng sự kiện khi có nhiều sự kiện

### Quản lý sự kiện thông minh
- Chỉ cho phép chỉnh sửa sự kiện hiện tại và tương lai
- Sự kiện quá khứ chỉ có thể xem
- Hệ thống tham gia sự kiện công khai

## Troubleshooting

### Lỗi thường gặp

1. **Port đã được sử dụng**
```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :3000

# Dừng process
taskkill /PID <process_id> /F
```

2. **Database connection error**
```bash
# Restart database service
docker-compose restart postgres

# Kiểm tra logs
docker-compose logs postgres
```

3. **Frontend không cập nhật**
```bash
# Clear browser cache
# Hoặc restart frontend service
docker-compose restart frontend
```

### Logs và Debug
```bash
# Xem logs của tất cả services
docker-compose logs

# Xem logs của service cụ thể
docker-compose logs auth-service

# Xem logs real-time
docker-compose logs -f
```

## Phát triển

### Cấu trúc phát triển
- Volume mounting cho real-time code changes
- Hot reload cho frontend
- Database persistence với Docker volumes

### Thêm tính năng mới
1. Tạo service mới trong thư mục riêng
2. Cập nhật `docker-compose.yml`
3. Tạo database schema
4. Thêm API endpoints
5. Cập nhật frontend

## Bảo mật

### JWT Authentication
- Token expiration
- Secure token storage
- Middleware authentication

### Database Security
- Connection pooling
- Prepared statements
- Input validation

### File Upload Security
- File type validation
- Size limits
- Secure file storage

## Monitoring và Performance

### Health Checks
- API endpoints cho health check
- Database connection monitoring
- Service status monitoring

### Performance Optimization
- Database indexing
- Connection pooling
- Caching strategies

## License

Dự án này được phát triển cho mục đích giáo dục và học tập.

## Liên hệ

Để biết thêm thông tin hoặc hỗ trợ, vui lòng liên hệ team phát triển. 