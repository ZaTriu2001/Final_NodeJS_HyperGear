# Kiến trúc HyperGear (M1–M4)

Browser → Nginx :8080 → Gateway A/B → Auth / Catalog A/B / Order / AI.
React static web dùng cùng origin /api. Cookie HttpOnly/SameSite=Lax; API ghi yêu cầu header X-HyperGear-Client và kiểm tra Origin. JWT có session ID; MongoDB lưu phiên và trạng thái user, nên logout/ban/password reset có hiệu lực cả khi qua gateway khác.

## Ranh giới service

- Auth sở hữu account, addresses, session, Google callback, reset. Chỉ update field whitelist.
- Catalog cung cấp API public/admin, search/filter/sort/pagination, review/rating và ẩn costPrice ở public. Hai replica dùng chung MongoDB và Redis Socket.IO adapter.
- AI đọc catalog public, chọn cấu hình bằng rule engine rồi gọi Gemini để diễn giải; không cho mô hình tự sửa giá, tồn hoặc tổng tiền. Chat lấy top-6 sản phẩm theo từ khóa MongoDB để làm RAG (không vector DB).
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

## Realtime, tìm kiếm và scaling

Nginx proxy HTTP/WebSocket tới hai gateway; mỗi gateway gắn một catalog replica. Socket.IO chỉ dùng WebSocket nên không cần sticky session cho polling. Sự kiện `reviews:changed` gửi qua Redis pub/sub, browser đọc lại dữ liệu HTTP có kiểm tra quyền. Kết nối lại cũng đọc lại để không phụ thuộc sự kiện bị bỏ lỡ. Comment guest nhận cookie HttpOnly ngẫu nhiên; DB chỉ lưu hash chủ sở hữu, API không trả hash/token.

Elasticsearch chỉ lưu name/searchText/active, không giá vốn hay dữ liệu tài khoản. Catalog đồng bộ thay đổi sau admin write và polling 5 giây, index riêng cho test. Search trả IDs, MongoDB lọc active và đọc giá/tồn mới nhất. Nếu ES lỗi, API trả `mongodb-fallback`, không tuyên bố đang dùng ES. Đổi tên category chuyển sản phẩm trong transaction, không sửa snapshot phân loại đơn cũ.

CI kiểm tra phân phối request qua hai gateway và session dùng lại được; test Redis khởi động hai catalog process độc lập. Auth/order/AI hiện một replica; chưa có HA MongoDB, autoscaling hoặc thử tải production. Giới hạn request lưu bucket trong MongoDB, dùng chung giữa process.

## Phần cần cấu hình ngoài source

Google OAuth cần credentials/consent/test user của nhóm. Gemini cần key server-side; thiếu key/HTTP lỗi trả trạng thái rules rõ ràng. PC compatibility dựa metadata demo và không bao quát mọi BIOS/cáp/connector/lane PCIe. Không xem đây là tư vấn lắp máy thương mại đã được xác minh.

