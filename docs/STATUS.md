# Trạng thái triển khai

Cập nhật: 02/11/2026, Asia/Ho_Chi_Minh.

## M1–M2 đã có code và test

- M1: monorepo Node 24, React/Vite/Bootstrap, Mongo catalog 42 sản phẩm/7 danh mục, trang chủ/phân trang/filter/search/sort, detail/variant/giỏ khách, logo HyperGear.
- M2: đăng ký/đăng nhập, profile, đổi/khôi phục mật khẩu, tối đa 3 địa chỉ, cart Mongo + merge guest, checkout nhiều bước, thanh toán mô phỏng, transaction tồn kho/loyalty, lịch sử/chi tiết đơn.
- Email thật qua SMTP local: transactional outbox → RabbitMQ → Mailpit; receipt, confirmation, reset; retry/dead-letter/deduplication.
- Admin tối thiểu có số liệu thật và chuyển trạng thái đơn để thử M2; chưa thay thế toàn bộ yêu cầu M3.
- Google OAuth đã viết luồng PKCE/state/nonce/ID-token, chưa nghiệm thu đăng nhập thật vì thiếu cấu hình Google của nhóm.
- Không coupon, không tax; doanh thu gốc, profit = revenue − loyaltyDiscount − costOfGoods. Đơn dùng điểm không được cộng điểm.
- Git: nhánh feature/m1-m2-completion, PR #1; chưa merge main, chưa thay đổi attribution của thành viên.

## Bằng chứng kiểm thử

- Local: 11 test frontend, 3 test finance, 12 nhóm integration trên Mongo replica set, 1 test RabbitMQ/SMTP đều đạt; smoke mua hàng/email đạt.
- Lint/build đạt. Có 11 test React dùng jsdom và 4 test browser Chromium (desktop/mobile) đạt trên CI; đây là hai bộ kiểm thử khác nhau.
- GitHub Actions của commit 4570fba đạt toàn bộ lint/test/build/integration, Docker Compose, smoke, browser và messaging: [run 41485320087](https://github.com/ZaTriu2001/Final_NodeJS_HyperGear/actions/runs/41485320087). Xem thay đổi ở [PR #1](https://github.com/ZaTriu2001/Final_NodeJS_HyperGear/pull/1).
- Đã thử trực tiếp trên giao diện: giỏ khách → đăng nhập → thất bại/thành công mô phỏng → đơn dùng loyalty → admin xác nhận → 2 email. Xem [báo cáo kiểm thử](M1-M2-TEST-REPORT.md).
- Không dùng kết quả test làm cam kết được 100% điểm rubric.

## Demo

[Website localhost](http://localhost:8080) — [Hộp thư Mailpit](http://localhost:8025).

Docker Desktop trên Mac chưa khởi động được khi desktop khóa. Có bản native dùng Node 24, MongoDB WiredTiger replica set, RabbitMQ, Mailpit; dữ liệu nằm trong .local/ và không vào Git.

~~~sh
npm run demo:setup
npm run demo:local -- --with-messaging
~~~

Native cần RabbitMQ/Mailpit đã cài. Ctrl+C dừng tiến trình; mở lại giữ dữ liệu. Không chạy đồng thời native và Docker vì trùng cổng. Localhost chỉ mở trên laptop, không phải link public cho iPhone.

## Phần còn lại

1. Google OAuth: tạo web client/consent/test users, đặt ID/secret vào .env, kiểm thử thật.
2. UI/responsive: đã có kiểm thử Chromium desktop/mobile trên CI và demo giao diện; còn Safari/iPhone thật và QA toàn bộ trang. Gallery hiện là SVG minh họa, chưa phải ảnh chính hãng từng model.
3. M3: comment/rating, Socket.IO/Redis, admin CRUD/filter đầy đủ, dashboard nâng cao và kiểm chứng scaling.
4. M4: Elasticsearch, Gemini/RAG/compatibility, QA/hồ sơ nộp/evidence/video.
5. Review PR với thành viên còn lại; phân công trong BACKLOG là đề xuất, không phải bằng chứng đóng góp đã hoàn thành.

Chi tiết: [M1-M2-HANDOFF.md](M1-M2-HANDOFF.md).
