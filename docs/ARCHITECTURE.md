# Kiến trúc HyperGear (M1–M2)

Browser → Nginx :8080 → Gateway A/B → Auth / Catalog / Order.
React static web dùng cùng origin /api. Cookie HttpOnly/SameSite=Lax; API ghi yêu cầu header X-HyperGear-Client và kiểm tra Origin. JWT có session ID; MongoDB lưu phiên và trạng thái user, nên logout/ban/password reset có hiệu lực cả khi qua gateway khác.

## Ranh giới service

- Auth sở hữu account, addresses, session, Google callback, reset. Chỉ update field whitelist.
- Catalog cung cấp API sản phẩm public, search/filter/sort/pagination và ẩn costPrice.
- Order sở hữu cart/order/loyalty ledger; lấy giá và tồn từ MongoDB, không tin giá client.
- Notification chạy outbox relay và RabbitMQ consumer; SMTP worker xử lý riêng khỏi request checkout.
- Gateway stateless; Nginx least_conn tới hai gateway.
- packages/core chứa schema và validation dùng chung. Đây là microservices chạy tách process/container nhưng có **shared MongoDB/schema**, chưa phải database-per-service. Order transaction cập nhật User/Product/Cart/Order/Ledger/Outbox chung một replica set. Đây là lựa chọn để đảm bảo tính nguyên tử cho đồ án; chuyển database-per-service sau này cần reservation/saga và không thể giữ nguyên transaction này.

## Luồng thanh toán

1. Khách chọn địa chỉ, lượng điểm; server đọc account cart + giá/tồn mới nhất.
2. Quote trả snapshot public, phí ship và quoteHash để khách xem lại.
3. UI tạo Idempotency-Key và tái sử dụng khóa đó khi retry lỗi mạng.
4. Server xác thực user/address/points, so sánh quoteHash và mở MongoDB transaction.
5. Update tồn với điều kiện stock >= quantity, cập nhật balance, tạo order/snapshot/ledger/outbox, xóa cart.
6. Commit thành công mới trả order; transaction conflict tự retry. Duplicate key trả lại đúng order đã có.
7. Relay publish event persistent vào RabbitMQ bằng confirm channel, rồi đánh dấu outbox published.
8. Consumer gửi SMTP, ghi EmailDelivery sent và ACK. Retry queue TTL 5 giây, tối đa 5 lần rồi dead-letter.

Không tuyên bố exactly-once cho SMTP: nếu process chết sau SMTP đã nhận nhưng trước khi ghi sent, email có thể được gửi lại. Message-ID ổn định và delivery ledger chống phát lại thông thường, không tạo ra đảm bảo mà SMTP không cung cấp.

## Hạ tầng

MongoDB replica set 1 node dùng volume; RabbitMQ/mailpit có volume. Docker host chỉ publish loopback. Demo native có dữ liệu riêng trong .local/mongo, không dùng chung volume Docker.

Dữ liệu seed chỉ insert nếu chưa tồn tại. Khi nâng schema, dùng migration riêng; không chạy seed để reset hàng hoặc mật khẩu của người đã dùng.

## Phạm vi chưa nghiệm thu

Google OAuth cần credentials/consent/test user của nhóm. Redis cache/Socket.IO, ES indexing/search, Gemini/RAG và nhiều replica nghiệp vụ thuộc M3–M4. Hai gateway không thay thế bằng chứng scale đầy đủ của cả hệ thống.

