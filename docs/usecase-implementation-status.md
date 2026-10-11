# Đối chiếu use case Trọ Ơi

## Trạng thái triển khai

| Vai trò | Use case trong báo cáo | Màn hình/luồng | API và nơi lưu | Trạng thái |
|---|---|---|---|---|
| Khách | Đăng ký, đăng nhập, đăng xuất | Đăng ký/đăng nhập | `/api/auth/*`, PostgreSQL `users`, bcrypt, JWT | Có API; cần cấu hình PostgreSQL và `JWT_SECRET` |
| Khách | Quên/đặt lại mật khẩu | Khôi phục tài khoản | `/api/auth/password-reset/*`, token băm trong PostgreSQL, SMTP | Có API; cần SMTP để gửi mã thật |
| Khách | Tìm theo khu vực, GPS, giá, diện tích, tiện ích; sắp xếp/phân trang | Trang chủ, tìm phòng, bộ lọc mobile/desktop | `/api/listings`, PostgreSQL/PostGIS | Có API; GPS chỉ tìm các tin có tọa độ do chủ trọ cung cấp |
| Khách | Xem chi tiết tin | Ảnh, giá, cọc, tiện ích, vị trí, liên hệ | `/api/listings/:id`, PostgreSQL; bản đồ Leaflet/OpenStreetMap | Có API; ảnh và tọa độ lấy từ dữ liệu tin |
| Người thuê | Hồ sơ, đổi mật khẩu | Tài khoản | `/api/auth/me`, `/api/auth/change-password`, PostgreSQL | Có API |
| Người thuê | Lưu/bỏ lưu tin, danh sách yêu thích | Tin yêu thích, nút lưu trên tin | `/api/favorites`, PostgreSQL | Có API |
| Người thuê | Tạo/sửa/xóa đánh giá phòng | Chi tiết phòng | `/api/listings/:id/reviews`, PostgreSQL | Có API; chỉ người thuê được chủ trọ ghi nhận cho phòng đã thuê mới được đánh giá |
| Người thuê | Bài viết, thích, bình luận; sửa/xóa nội dung của mình | Diễn đàn | `/api/forum`, MongoDB/Mongoose | Có API và kiểm tra quyền sở hữu |
| Người thuê | Nhắn tin trực tiếp, đã đọc, tắt thông báo | Tin nhắn | `/api/messages`, Socket.IO, MongoDB | Có lưu bền vững và phát sự kiện real-time; cần cả PostgreSQL lẫn MongoDB |
| Người thuê | Gửi báo cáo, xem kết quả | Báo cáo của tôi | `/api/reports`, PostgreSQL; kiểm tra bài/bình luận trong MongoDB | Có API |
| Chủ trọ | Đăng/sửa/xóa, tìm tin của mình | Quản lý tin, biểu mẫu đăng tin | `/api/listings`, PostgreSQL | Có API; tin mới ở trạng thái chờ duyệt |
| Chủ trọ | Ẩn/hiện, đánh dấu đã thuê; chọn người thuê | Quản lý tin | `/api/listings/:id/status`, PostgreSQL | Có API; server kiểm tra quyền sở hữu, trạng thái và người thuê |
| Chủ trọ | Lượt xem, liên hệ, thống kê | Quản lý tin, thống kê chủ trọ | PostgreSQL `listings.views/contacts` | Có API; lượt xem/liên hệ được ghi từ thao tác trên server |
| Chủ trọ | Tham gia diễn đàn, nhắn tin, báo cáo | Diễn đàn, tin nhắn, báo cáo | MongoDB và PostgreSQL qua API | Có API theo role |
| Quản trị viên | Quản lý tài khoản, vai trò, khóa/mở khóa | Khu quản trị | `/api/admin/users`, PostgreSQL | Có API; không cho tự khóa/xóa hoặc gỡ quản trị viên hoạt động cuối cùng |
| Quản trị viên | Duyệt/từ chối/ẩn/gỡ tin | Khu quản trị tin | `/api/admin/listings`, `/api/listings/:id/status` | Có API |
| Quản trị viên | Kiểm duyệt bài viết và bình luận | Khu quản trị diễn đàn | `/api/admin/forum`, `/api/forum/:id/status` và API bình luận, MongoDB | Có API |
| Quản trị viên | Quản lý danh mục | Khu quản trị danh mục | `/api/admin/categories`, PostgreSQL | Có API; migration khởi tạo các loại phòng/tiện ích cơ bản |
| Quản trị viên | Nhận/xử lý báo cáo, gửi cảnh báo | Khu quản trị báo cáo, thông báo | `/api/reports`, `/api/notifications`, PostgreSQL | Có API |
| Quản trị viên | Thống kê người dùng, tin, tương tác; xuất Excel/PDF | Khu quản trị thống kê | `/api/admin/stats`, `/api/admin/stats/export`, PostgreSQL và MongoDB | Có API; bản xuất tổng hợp số liệu hiện có |

## Phạm vi và cấu hình

- `VITE_DATA_MODE=api` bật chế độ gọi máy chủ. Mặc định project giữ chế độ demo cũ trên trình duyệt để preview vẫn mở khi dịch vụ chưa cấu hình; chế độ API không nạp các bản ghi demo vào giao diện.
- Chạy các migration trong `database/migrations/` bằng `pnpm db:migrate`. Máy PostgreSQL cần cài được extension PostGIS và `unaccent`.
- Tạo tài khoản admin đầu tiên bằng `pnpm admin:create`; không có mật khẩu admin mặc định trong mã nguồn.
- Tạo `.env` dựa trên `.env.example`. Cần `DATABASE_URL`, `MONGODB_URI`, `JWT_SECRET` tối thiểu 32 ký tự, `WEB_ORIGIN`.
- Cần cấu hình SMTP để dùng đặt lại mật khẩu thật và Cloudinary để tải ảnh lên. Khi thiếu, API trả lỗi cấu hình thay vì giả vờ hoàn thành thao tác.
- Không có bảng/tính năng chuyển nhượng riêng. Bài “sang lại” dùng bài viết diễn đàn và liên hệ qua tin nhắn; đường dẫn cũ vẫn giữ redirect sang tìm phòng.

## Giới hạn cần biết

- Chưa có dữ liệu phòng thật trong PostgreSQL mới; trang tìm phòng sẽ rỗng cho đến khi chủ trọ đăng tin và quản trị viên duyệt.
- Chế độ demo vẫn dùng dữ liệu mẫu và `localStorage`; không dùng làm dữ liệu triển khai.
- JWT hiện được xóa ở trình duyệt khi đăng xuất; token đã bị lộ vẫn có hiệu lực đến khi hết hạn, trừ khi tài khoản bị khóa hoặc xóa.
- Không thể xác nhận end-to-end việc ghi PostgreSQL, gửi email, tải Cloudinary hoặc nhắn tin hai trình duyệt trước khi có cấu hình dịch vụ tương ứng.
