# Trọ Ơi

Ứng dụng React/Vite có hai chế độ dữ liệu:

- **Demo** (mặc định): giữ luồng xem trước hiện có với dữ liệu trên trình duyệt.
- **API**: dùng PostgreSQL/PostGIS cho tài khoản, phòng, yêu thích, đánh giá, báo cáo và danh mục; MongoDB cho diễn đàn và tin nhắn; Socket.IO cho sự kiện tin nhắn trực tiếp.

## Chạy chế độ demo

```powershell
pnpm install
pnpm dev
```

## Bật API và lưu trữ thật

1. Cài PostgreSQL cùng PostGIS, MongoDB, rồi tạo database và tài khoản ứng dụng.
2. Sao chép `.env.example` thành `.env`; điền `DATABASE_URL`, `MONGODB_URI`, `WEB_ORIGIN` và một `JWT_SECRET` ngẫu nhiên dài ít nhất 32 ký tự.
3. Áp dụng schema và danh mục ban đầu: `pnpm db:migrate`.
4. Tạo tài khoản quản trị đầu tiên bằng `pnpm admin:create` trong terminal tương tác.
5. Mở `.env` và đặt `VITE_DATA_MODE=api`. Khởi động cả máy chủ API và giao diện:

```powershell
pnpm dev:all
```

API dùng cổng 3001 và Vite chuyển tiếp `/api` cùng `/socket.io` tới đó. `/api/health` báo trạng thái PostgreSQL, MongoDB, JWT, email và lưu ảnh.

Đặt `SMTP_HOST`, `SMTP_FROM` và thông tin SMTP để bật đặt lại mật khẩu bằng email. Đặt bộ khóa `CLOUDINARY_*` để bật tải ảnh lên. API sẽ báo lỗi rõ ràng nếu một dịch vụ cần thiết chưa cấu hình.

Ma trận use case, lưu trữ và các giới hạn cấu hình nằm trong [docs/usecase-implementation-status.md](docs/usecase-implementation-status.md).
