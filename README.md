# Trọ Ơi

Ứng dụng React/Vite có hai chế độ dữ liệu:

- **Demo**: giữ luồng xem trước hiện có với dữ liệu trên trình duyệt.
- **API**: dùng PostgreSQL/PostGIS cho tài khoản, quyền hạn, phòng, chuyển nhượng, diễn đàn, yêu thích, đánh giá, báo cáo, cảnh báo, tương tác và danh mục; MongoDB cho thông báo, cuộc hội thoại và tin nhắn; Socket.IO cho sự kiện tin nhắn trực tiếp.

File `.env.example` được đặt sẵn `VITE_DATA_MODE=api`. Ở chế độ này, dữ liệu nằm trong dịch vụ PostgreSQL và MongoDB bên ngoài frontend, nên không mất khi xóa bộ nhớ trình duyệt hoặc tải lại trang.

## Chạy chế độ demo

```powershell
pnpm install
pnpm dev
```

## Bật API và lưu trữ thật

1. Cài PostgreSQL cùng PostGIS, MongoDB, rồi tạo database và tài khoản ứng dụng.
2. Kết nối database PostgreSQL bằng tài khoản `postgres` và chạy `CREATE EXTENSION IF NOT EXISTS postgis;` một lần. Tài khoản ứng dụng không cần quyền tạo extension.
3. Sao chép `.env.example` thành `.env`; điền `DATABASE_URL`, `MONGODB_URI`, `WEB_ORIGIN` và một `JWT_SECRET` ngẫu nhiên dài ít nhất 32 ký tự.
4. Áp dụng schema: `pnpm db:migrate`.
5. Nạp bộ dữ liệu phát triển vào PostgreSQL và MongoDB: `pnpm db:seed`. Có thể chạy gộp hai bước bằng `pnpm db:setup`.
6. Nếu không dùng bộ dữ liệu phát triển, tạo tài khoản quản trị đầu tiên bằng `pnpm admin:create` trong terminal tương tác.
7. Mở `.env` và đặt `VITE_DATA_MODE=api`. Khởi động cả máy chủ API và giao diện:

```powershell
pnpm dev:all
```

API dùng cổng 3001 và Vite chuyển tiếp `/api` cùng `/socket.io` tới đó. `/api/health` báo trạng thái PostgreSQL, MongoDB, JWT, email và lưu ảnh.
Nếu môi trường preview đã chạy Vite ở cổng 8443, chỉ khởi động thêm API bằng `pnpm dev:api` và khởi động lại preview sau khi đổi `VITE_DATA_MODE`; chạy `dev:all` cùng lúc sẽ tranh cổng 8443.
`pnpm db:seed` tạo dữ liệu có mã cố định và có thể chạy lại, không xóa các bản ghi khác. Các tài khoản phát triển gồm:

- Người thuê: `trang.nguyen@example.com`
- Chủ trọ: `minhngoc@example.com`
- Quản trị: `admin@phongtroplus.vn`

Mật khẩu lấy từ `SEED_PASSWORD`. Nếu biến này để trống ở môi trường phát triển, script dùng `PhongTro@123`; môi trường production bắt buộc phải khai báo mật khẩu riêng. Không chạy seed phát triển trên database production đang có dữ liệu thật.

Migration `003_transfers.sql` tạo bảng tin chuyển nhượng riêng. Người đăng và quản trị viên dùng API để kiểm tra quyền sở hữu/trạng thái; cuộc trò chuyện liên hệ lưu `transferId` trong MongoDB để hiển thị ngữ cảnh tin.
`GET /api/transfers` chỉ trả tin `active`, nhận các bộ lọc `q`, `minPrice`, `maxPrice`, `maxFee`, `minArea`, `maxArea` và phân trang bằng `page`, `limit` (tối đa 200 tin/trang). Kết quả gồm `items`, `page`, `limit`, `total`. Quyết định kiểm duyệt và bản ghi outbox được lưu cùng transaction PostgreSQL; worker chuyển thông báo sang MongoDB bằng mã nguồn duy nhất để có thể thử lại an toàn.

Migration `004_project_data_model.sql` bám theo lược đồ Chương 3 của báo cáo: thêm `roles`, `permissions`, `locations`, `amenities`, `listing_images`, `listing_amenities`, `forum_posts`, `forum_comments`, `forum_reactions`, `property_interactions`, `system_warnings` và `notification_outbox`. Các cột cũ được giữ để migration không xóa dữ liệu đang có.
Trang thống kê quản trị lấy số liệu theo kỳ từ `/api/admin/stats`, gồm cả tin chuyển nhượng; API xuất Excel/PDF dùng cùng nguồn số liệu.

Đặt `SMTP_HOST`, `SMTP_FROM` và thông tin SMTP để bật đặt lại mật khẩu bằng email. Đặt bộ khóa `CLOUDINARY_*` để bật tải ảnh lên. API sẽ báo lỗi rõ ràng nếu một dịch vụ cần thiết chưa cấu hình.

Ma trận use case, lưu trữ và các giới hạn cấu hình nằm trong [docs/usecase-implementation-status.md](docs/usecase-implementation-status.md).
