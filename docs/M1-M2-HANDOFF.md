# Bàn giao M1–M2 — 02/11/2026

## Đã triển khai và kiểm chứng

| Phạm vi | Kết quả |
|---|---|
| Storefront | Catalog lấy MongoDB, home mới/bán chạy/3 danh mục, phân trang từng section, 12 sản phẩm/trang catalog |
| Sản phẩm | 42 sản phẩm/7 danh mục, variants/giá/tồn riêng, tìm không dấu, filter kết hợp và sort; giá vốn bị ẩn |
| Tài khoản | Register/login/profile/password/reset; cookie HttpOnly; rate limit Mongo; revoke session; ban guard |
| Địa chỉ | CRUD tối đa 3, duy nhất 1 mặc định, không quận/huyện |
| Giỏ | Guest localStorage, account MongoDB, merge idempotent, số lượng nguyên/tồn kho |
| Checkout | Địa chỉ → thanh toán mô phỏng → review; quote server; idempotency; snapshot; Mongo transaction |
| Loyalty | Cộng/trừ/ledger đúng công thức; đơn dùng điểm không sinh điểm |
| Đơn | Customer history/detail/timeline, ownership; admin tối thiểu để xác nhận/chuyển tiến trạng thái |
| Email | Outbox → RabbitMQ → SMTP Mailpit; receipt + admin confirmation + recovery; retry 5 lần và dead-letter |
| Tests local | 11 frontend + 3 finance + 12 integration + 1 messaging đều đạt; live smoke đạt; lint/build đạt |
| GitHub/Docker | Full Compose + smoke/messaging đạt trên GitHub Actions (run 41482656356); bản cập nhật cuối tiếp tục được CI kiểm tra |
| Postman | Đã chạy collection bằng Newman: 18 request, 19 assertions, 0 lỗi |

Không tính OAuth là đã hoàn thành nghiệm thu: code authorization-code/PKCE/state/nonce/ID-token đã triển khai, nhưng chưa có GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET của nhóm để chạy đăng nhập Google thật. Nút Google chỉ xuất hiện khi cấu hình đủ. Không giả lập Google để ghi hoàn tất.

Gallery hiện dùng 3 ảnh minh họa SVG cho bài tập, chưa phải ảnh chụp chính hãng riêng cho từng model. Giá, rating, sold và variant demo không phải catalogue thị trường đã kiểm chứng. Trước nộp nên thay gallery/spec bằng bộ ảnh/thông số nhóm xác nhận nếu giảng viên yêu cầu sản phẩm thực.

## Demo trên máy hiện tại

Website: http://localhost:8080

Mailpit: http://localhost:8025

RabbitMQ: http://localhost:15672 (guest / guest)

Customer: customer@gmail.com / Customer@2026

Admin: admin@gmail.com / HyperGear@2026

Đã tạo một đơn demo và email để kiểm chứng. SMTP Mailpit nhận thư tại máy, không gửi tới tài khoản Gmail thật.

Docker Desktop trên máy chưa mở được; ứng dụng điều khiển UI báo Mac đang khóa. Đã chạy native Node.js **24.19.0**, MongoDB **8.0.16** replica set, RabbitMQ **4.4.0**, Mailpit **1.33.0**. Có cài RabbitMQ/Mailpit và dependency qua Homebrew. Không tạo dịch vụ tự khởi động khi login, không mở tunnel/public hosting.

Để chạy lại native (sau khi dừng phiên cũ, tránh trùng cổng):

~~~sh
npm run demo:setup
npm run demo:local -- --with-messaging
~~~

Nhấn Ctrl+C để dừng tiến trình do script tạo. MongoDB nằm ở .local/mongo; RabbitMQ .local/rabbitmq-data; Mailpit .local/mailpit.db. Dữ liệu native và volume Docker là hai bộ khác nhau.

Giữ nguyên .local/mongo-port đi cùng .local/mongo: replica set lưu địa chỉ cổng trong cấu hình. Script phát hiện cổng bị chiếm và yêu cầu dừng demo cũ, không tự xóa dữ liệu.

Nếu chỉ cần web/API mà không cần email: npm run demo:local. Khi đó email nằm trong outbox, chưa được gửi. Lần đầu cần mạng để tải binary MongoDB chính thức.

## Kịch bản tự kiểm tra

1. Mở catalog; thử “man hinh”, hãng/giá/rating/sort và trang 2.
2. Chọn variant và thêm giỏ khi chưa đăng nhập; đăng nhập customer để kiểm tra gộp giỏ.
3. Trong tài khoản, sửa hồ sơ, thêm/xóa/đặt mặc định địa chỉ; thử địa chỉ thứ tư.
4. Checkout, chọn địa chỉ HCM/Hà Nội để xem ship 30k/50k. Thử payment failure trước, sau đó success.
5. Xem đơn/điểm trong tài khoản. Mua tiếp bằng điểm và kiểm tra earnedPoints = 0.
6. Mở Mailpit, xem receipt. Đăng nhập admin → xác nhận đơn → xem confirmation email.
7. Khôi phục mật khẩu tài khoản kiểm thử (không đổi demo credentials nếu còn cần chạy smoke); mở email và link, thử dùng lại link để thấy bị từ chối.
8. Import Postman collection mới, chạy lần lượt 18 request có assertions.

## Google OAuth — việc cần tài khoản chủ dự án

Tạo Google OAuth web client, redirect http://localhost:8080/api/auth/google/callback, cấu hình consent/test users, đặt hai biến GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env. Không gửi secret vào issue/PR/Git. Restart auth-service hoặc native demo sau thay đổi. Chi tiết trong README.

Code liên kết tự động Gmail/Workspace cùng email. Email bên ngoài hai nhóm này không tự liên kết tài khoản hiện có vì Google không luôn là bên quản lý email đó.

## Giới hạn và bước kế tiếp

- Trình duyệt thật/responsive cần kiểm tra lại khi Mac được mở khóa; các test React chạy trong jsdom, không được coi là screenshot QA.
- SMTP không có exactly-once tuyệt đối: crash sau gửi trước khi ghi sent vẫn có thể tạo bản lặp. Ledger/Message-ID xử lý replay thông thường; test đã kiểm chứng.
- M3 chưa hoàn tất: admin CRUD/filter đầy đủ, review/rating/Socket.IO/Redis, dashboard nâng cao, scale nghiệp vụ.
- M4 chưa hoàn tất: Elasticsearch indexing/search, AI Gemini/RAG, QA cuối, video/evidence.
- Giữ ngoài scope coupon theo quyết định nhóm. Không áp deadline/2 commit mỗi tuần.
- Shared MongoDB là lựa chọn transaction hiện tại, không phải database-per-service.
