# HyperGear — Node.js ecommerce

Monorepo React/Vite + Node.js 24/Express + MongoDB, API Gateway, Auth, Catalog, Order và Notification. RabbitMQ chuyển sự kiện email bất đồng bộ. Nhánh M1–M2 bổ sung storefront đọc MongoDB và luồng tài khoản → giỏ → thanh toán mô phỏng → lịch sử đơn.

## Chạy đầy đủ bằng Docker

Yêu cầu Node.js 24, Docker Desktop/Engine và Docker Compose v2.

~~~sh
npm ci --ignore-scripts
npm run demo:setup
docker compose up -d --build --wait --wait-timeout 180
~~~

- Website: http://localhost:8080
- Hộp thư demo Mailpit: http://localhost:8025
- RabbitMQ management: http://localhost:15672 — guest / guest
- Admin: admin@gmail.com / HyperGear@2026
- Customer: customer@gmail.com / Customer@2026

Seed tự chạy: 42 sản phẩm, 7 danh mục, 2 phiên bản/sản phẩm và hai tài khoản demo. Chạy lại seed không ghi đè tài khoản, tồn kho, giá hoặc đơn đã có. Dữ liệu, giá và hình minh họa phục vụ bài tập, không phải danh mục thương mại đã xác minh. Các cổng chỉ bind loopback. Không dùng tài khoản demo để triển khai công khai.

~~~sh
docker compose ps
docker compose logs -f auth-service order-service notification-service
docker compose down
~~~

Lệnh down giữ volume. Không dùng down -v nếu cần giữ đơn/tài khoản. MongoDB dùng replica set một node để chạy transaction; đây không phải cấu hình HA production.

## Demo native khi Docker Desktop chưa mở được

Trên máy Mac hiện tại có Node.js 24, RabbitMQ và Mailpit. Chạy:

~~~sh
npm run demo:setup
npm run demo:local
~~~

Script tải MongoDB chính thức qua mongodb-memory-server nhưng dùng WiredTiger và lưu dữ liệu thật trong .local/mongo. Không giả lập cơ sở dữ liệu. Nếu không bật các tiến trình RabbitMQ/Mailpit/worker, sự kiện chỉ nằm trong outbox, chưa gửi email. Xem docs/M1-M2-HANDOFF.md để chạy phần email native.

## Kiểm thử

~~~sh
npm run lint
npm test
npm run build
npm run test:integration
npm run test:smoke
npm run test:messaging
~~~

- Unit/frontend: Vitest + React Testing Library và Node test runner.
- Integration: khởi tạo MongoDB replica set riêng, kiểm tra auth, profile, addresses, catalog, transaction, idempotency, stock race, loyalty và quyền truy cập; không sửa dữ liệu demo.
- Smoke: cần full stack đang chạy; tạo một đơn thật trong database demo và ba email trong Mailpit.
- Messaging: cần RabbitMQ :5672 và Mailpit :8025/:1025; dùng database và queue kiểm thử riêng, kiểm tra SMTP/replay/retry/dead-letter.
- CI: lint → unit/frontend → build → integration → Docker full stack → smoke → messaging.
- Postman: import postman/HyperGear.postman_collection.json; chạy collection theo thứ tự. Cookie được Postman giữ tự động; body không gửi giá vốn/giá bán do client quyết định.

## Các chức năng hiện có

- Home: mới nhất, bán chạy và 3 danh mục riêng; phân trang từng khu vực.
- Catalog: 12/trang, tìm tiếng Việt không dấu, danh mục/hãng/giá/rating, 4 sort cơ bản và sort mới/bán chạy; hết hàng ở cuối.
- Product: gallery, mô tả, SKU/giá/tồn theo phiên bản; giá vốn không xuất hiện trong API public.
- Guest cart localStorage; account cart MongoDB; merge idempotent khi login.
- Register/login, HttpOnly cookie, profile, password/reset 15 phút một lần; đổi/reset thu hồi phiên; tài khoản bị khóa bị chặn trên mọi API.
- Tối đa 3 địa chỉ, đúng 1 mặc định khi danh sách không rỗng.
- Checkout 3 bước; server báo giá, chống quote cũ, chống gửi thanh toán trùng, MongoDB transaction cho tồn/đơn/điểm/ledger/outbox/cart.
- Loyalty: mỗi 100.000đ tiền hàng → 1.000 điểm; 1 điểm = 1đ; dùng điểm thì không tích mới.
- Revenue là tiền hàng trước loyalty, không tính ship; profit = revenue - loyaltyDiscount - costOfGoods. TotalPaid = revenue - loyaltyDiscount + shippingFee.
- Ship 30.000đ tại Hồ Chí Minh, 50.000đ tỉnh/thành khác; không thuế/coupon.
- Lịch sử/chi tiết đơn của đúng tài khoản; snapshot giá và địa chỉ; timeline pending → confirmed → shipping → delivered.
- Admin tối thiểu cho M2: 20 đơn gần nhất, chuyển tiếp trạng thái và totals revenue/profit thật. CRUD/filter/dashboard mở rộng thuộc M3.
- Receipt sau thanh toán; confirmation sau admin confirmed; email reset qua RabbitMQ + SMTP.
- Google OAuth code flow + PKCE/state/nonce và ID token verification đã có. Cần Google client ID/secret để dùng thực tế; chưa được tính là đã nghiệm thu Google.

## Cấu hình Google OAuth

Trong Google Cloud Console, tạo OAuth web client cho dự án của nhóm, thêm redirect URI chính xác:

~~~text
http://localhost:8080/api/auth/google/callback
~~~

Điền GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env (không commit), cấu hình consent screen/test users nếu ở chế độ testing, rồi:

~~~sh
docker compose up -d --force-recreate auth-service
~~~

Không dùng mã/token tự tạo để giả lập Google thành công. Chỉ email do Google có thẩm quyền xác nhận (Gmail hoặc managed Workspace) được tự liên kết tài khoản cùng email; email Google bên ngoài hai loại này không tự gộp vào tài khoản đã tồn tại.

## Kiến trúc và phạm vi tiếp theo

Xem docs/ARCHITECTURE.md, docs/M1-M2-HANDOFF.md và docs/BACKLOG.md. M3: admin đầy đủ, review/rating/realtime/scale nghiệp vụ. M4: Elasticsearch, Gemini RAG, QA cuối và hồ sơ nộp.

Redis, Elasticsearch, AI skeleton nằm trong Compose profile bonus; M1–M2 không khởi động chúng để tiết kiệm RAM. Các container này chưa tương đương việc đã hoàn thành chức năng bonus.

Nhóm: Trần Gia Triều — 519H0245; Nguyễn Anh Quốc — 523H0086. Deadline và điều kiện 2 commit/tuần không còn dùng làm điều kiện đánh giá tiến độ theo cập nhật của nhóm.
