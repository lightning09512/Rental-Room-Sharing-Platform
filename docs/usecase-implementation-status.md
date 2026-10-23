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
| Người thuê (UC-18) | Xem và lọc tin chuyển nhượng theo khu vực, giá thuê, phí sang nhượng và diện tích | Danh sách/chi tiết chuyển nhượng | `/api/transfers`, PostgreSQL `transfers`; demo lưu `localStorage` | Có API lọc/phân trang và giao diện; chỉ tin `active` được trả về; chưa xác nhận end-to-end trên PostgreSQL thật |
| Người thuê (UC-19) | Đăng tin phòng và điều kiện hợp đồng/chuyển nhượng | Biểu mẫu đăng tin chuyển nhượng | `POST /api/transfers`, PostgreSQL `transfers`; demo lưu `localStorage` | Có API/giao diện; tin mới chờ duyệt; chưa xác nhận ghi PostgreSQL thật |
| Người thuê (UC-20, UC-21) | Xem tin của mình, sửa, đóng tin sau xác nhận | Tin chuyển nhượng của tôi | `GET /api/transfers/mine`, `PATCH/DELETE /api/transfers/:id` | Có API/giao diện; server xác thực vai trò/chủ sở hữu và chặn cập nhật khi trạng thái thay đổi đồng thời; chưa xác nhận end-to-end |
| Người thuê (UC-22) | Gửi nội dung liên hệ cho người đăng | Chi tiết tin, tin nhắn | `POST /api/messages/conversations` với `transferId`, MongoDB `Conversation` | Có API/giao diện; cuộc trò chuyện lưu ngữ cảnh tin; chưa xác nhận nhắn tin qua hai tài khoản thật |
| Người thuê | Bài viết, thích, bình luận; sửa/xóa nội dung của mình | Diễn đàn | `/api/forum`, PostgreSQL `forum_posts`, `forum_comments`, `forum_reactions` | Có API và kiểm tra quyền sở hữu |
| Người thuê | Nhắn tin trực tiếp, đã đọc, tắt thông báo | Tin nhắn | `/api/messages`, Socket.IO, MongoDB | Có lưu bền vững và phát sự kiện real-time; cần cả PostgreSQL lẫn MongoDB |
| Người thuê | Gửi báo cáo, xem kết quả | Báo cáo của tôi | `/api/reports`, PostgreSQL; kiểm tra bài/bình luận bằng khóa ngoại nghiệp vụ trong PostgreSQL | Có API |
| Chủ trọ | Đăng/sửa/xóa, tìm tin của mình | Quản lý tin, biểu mẫu đăng tin | `/api/listings`, PostgreSQL | Có API; tin mới và nội dung vừa sửa chờ duyệt; chưa xác nhận end-to-end |
| Chủ trọ | Ẩn/hiện, đánh dấu đã thuê; chọn người thuê | Quản lý tin | `/api/listings/:id/status`, PostgreSQL | Có API; server kiểm tra quyền sở hữu và chỉ cho đổi trạng thái từ tin đã duyệt; chưa xác nhận end-to-end |
| Chủ trọ | Lượt xem, liên hệ, thống kê | Quản lý tin, thống kê chủ trọ | PostgreSQL `listings.views/contacts` | Có API; lượt xem/liên hệ được ghi từ thao tác trên server |
| Chủ trọ | Tham gia diễn đàn, nhắn tin, báo cáo | Diễn đàn, tin nhắn, báo cáo | MongoDB và PostgreSQL qua API | Có API theo role |
| Quản trị viên | Quản lý tài khoản, vai trò, khóa/mở khóa | Khu quản trị | `/api/admin/users`, PostgreSQL | Có API; không cho tự khóa/xóa hoặc gỡ quản trị viên hoạt động cuối cùng |
| Quản trị viên | Duyệt/từ chối/ẩn/gỡ tin | Khu quản trị tin | `/api/admin/listings`, `/api/listings/:id/status` | Có API; quyết định duyệt/từ chối và thông báo được lưu cùng transaction; chưa xác nhận end-to-end |
| Quản trị viên (UC-A16) | Xem, tìm kiếm và lọc tin chuyển nhượng theo trạng thái | Quản trị → Tin chuyển nhượng | `GET /api/admin/transfers`, PostgreSQL `transfers` | Có API/giao diện với role admin; chưa xác nhận end-to-end |
| Quản trị viên (UC-A17) | Duyệt hoặc từ chối tin, ghi lý do và báo cho người đăng | Quản trị → Tin chuyển nhượng | `PATCH /api/admin/transfers/:id/status`, PostgreSQL outbox và MongoDB `notifications` | Có API/giao diện; quyết định và outbox cùng transaction, thông báo được chuyển sang MongoDB; chưa xác nhận end-to-end |
| Quản trị viên (UC-A19) | Gỡ tin chuyển nhượng sau xác nhận | Quản trị → Tin chuyển nhượng | `DELETE /api/admin/transfers/:id`, PostgreSQL `transfers.status` | Có API/giao diện; gỡ mềm bằng `removed`; chưa xác nhận end-to-end |
| Quản trị viên | Kiểm duyệt bài viết và bình luận | Khu quản trị diễn đàn | `/api/admin/forum`, `/api/forum/:id/status` và API bình luận, PostgreSQL | Có API |
| Quản trị viên | Quản lý danh mục | Khu quản trị danh mục | `/api/admin/categories`, PostgreSQL | Có API; migration khởi tạo các loại phòng/tiện ích cơ bản |
| Quản trị viên | Nhận/xử lý báo cáo, gửi cảnh báo | Khu quản trị báo cáo, thông báo | PostgreSQL `reports`, `system_warnings`, `notification_outbox`; MongoDB `notifications` | Có API |
| Quản trị viên (UC-A31–A34) | Thống kê người dùng, tin cho thuê, tin chuyển nhượng, tương tác; xuất Excel/PDF | Khu quản trị thống kê | `/api/admin/stats`, `/api/admin/stats/export`, PostgreSQL và MongoDB | Có API/giao diện theo khoảng thời gian; bản xuất gồm tin chuyển nhượng; chưa xác nhận end-to-end |

## Phạm vi và cấu hình

- `VITE_DATA_MODE=api` bật chế độ gọi máy chủ và là giá trị được đề xuất trong `.env.example`. Chế độ API không đọc dữ liệu nghiệp vụ từ `localStorage`.
- Chạy các migration trong `database/migrations/` bằng `pnpm db:migrate`. Máy PostgreSQL cần cài được extension PostGIS và `unaccent`.
- Chạy `pnpm db:seed` để chủ động nạp bộ dữ liệu phát triển vào PostgreSQL và MongoDB; `pnpm db:setup` chạy cả migration và seed. Seed không tự chạy khi khởi động server và không xóa dữ liệu khác.
- Tạo tài khoản admin đầu tiên bằng `pnpm admin:create`; không có mật khẩu admin mặc định trong mã nguồn.
- Tạo `.env` dựa trên `.env.example`. Cần `DATABASE_URL`, `MONGODB_URI`, `JWT_SECRET` tối thiểu 32 ký tự, `WEB_ORIGIN`.
- Cần cấu hình SMTP để dùng đặt lại mật khẩu thật và Cloudinary để tải ảnh lên. Khi thiếu, API trả lỗi cấu hình thay vì giả vờ hoàn thành thao tác.
- Tin chuyển nhượng dùng bảng riêng `transfers`, được tạo bởi migration `003_transfers.sql`; nội dung không lưu trong diễn đàn. Chạy `pnpm db:migrate` để áp dụng migration. Thông tin liên hệ dùng cuộc trò chuyện MongoDB có `transferId` để giữ ngữ cảnh tin.
- Trong chế độ demo, tin chuyển nhượng, trạng thái kiểm duyệt và cuộc trò chuyện được lưu trên `localStorage` để tiếp tục sau khi tải lại trang.
- Rà soát backend: endpoint thống kê admin đã sửa lỗi đọc kết quả truy vấn và thêm tin chuyển nhượng; kiểm tra giới hạn quản trị viên cuối cùng, xử lý báo cáo và mã đặt lại mật khẩu đã dùng transaction PostgreSQL. Cột `date` của tin chuyển nhượng được giữ ở dạng `YYYY-MM-DD` theo ngày Việt Nam. Không cần migration mới cho các sửa đổi này.

## Giới hạn cần biết

- PostgreSQL/MongoDB mới sẽ rỗng cho tới khi chạy `pnpm db:seed` hoặc người dùng tạo dữ liệu qua API. Sau khi seed, trang tìm phòng, chuyển nhượng, diễn đàn và tin nhắn đọc dữ liệu từ hai dịch vụ database bên ngoài frontend.
- Chế độ demo vẫn dùng dữ liệu mẫu và `localStorage`; không dùng làm dữ liệu triển khai.
- JWT hiện được xóa ở trình duyệt khi đăng xuất; token đã bị lộ vẫn có hiệu lực đến khi hết hạn, trừ khi tài khoản bị khóa hoặc xóa.
- Không thể xác nhận end-to-end việc ghi PostgreSQL, gửi email, tải Cloudinary hoặc nhắn tin hai trình duyệt trước khi có cấu hình dịch vụ tương ứng.
