# Database Trọ Ơi

Project dùng hai dịch vụ database độc lập với frontend:

- PostgreSQL/PostGIS: tài khoản, vai trò, quyền hạn, vị trí, tiện ích, tin phòng, ảnh, tin chuyển nhượng, diễn đàn, yêu thích, đánh giá, báo cáo, cảnh báo và tương tác phòng.
- MongoDB: thông báo, cuộc hội thoại và tin nhắn.

## Khởi tạo

1. Tạo database và tài khoản ứng dụng PostgreSQL; tạo database MongoDB theo `MONGODB_URI`.
2. Kết nối database PostgreSQL bằng tài khoản quản trị `postgres` và bật PostGIS một lần:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

   Extension cần quyền quản trị. Sau đó dùng tài khoản ứng dụng trong `DATABASE_URL` để chạy migration.
3. Tạo `.env` từ `.env.example` và điền `DATABASE_URL`, `MONGODB_URI`, `JWT_SECRET`.
4. Đặt `VITE_DATA_MODE=api`.
5. Chạy `pnpm db:setup` để áp dụng migration và nạp dữ liệu phát triển.
6. Chạy API bằng `pnpm dev:api`.

Migration chỉ tạo hoặc nâng cấp cấu trúc. `database/seed.js` nạp dữ liệu hiển thị ban đầu. Hai bước được tách riêng để production có thể chạy migration mà không nhận tài khoản hoặc nội dung mẫu.

Seed có thể chạy lại và chỉ cập nhật các bản ghi có mã cố định của bộ dữ liệu phát triển. Script không xóa dữ liệu do người dùng tạo.
