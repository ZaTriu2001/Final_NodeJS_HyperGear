# HyperGear — Node.js ecommerce

Monorepo React/Vite + Node.js 24/Express + MongoDB: Gateway, Auth, Catalog (2 replicas), Order, Notification và AI. RabbitMQ chuyển sự kiện email; Redis đồng bộ Socket.IO; Elasticsearch tìm sản phẩm; Gemini diễn giải cấu hình PC từ catalog và rule engine.

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

Seed tự chạy: 50 sản phẩm, 11 danh mục, 2 phiên bản/sản phẩm và hai tài khoản demo. Chạy lại seed không ghi đè tài khoản, tồn kho, giá hoặc đơn đã có; metadata PC thiếu được bổ sung. Dữ liệu, thông số PC, giá và hình minh họa phục vụ bài tập, không phải danh mục thương mại đã xác minh. Các cổng chỉ bind loopback. Không dùng tài khoản demo để triển khai công khai. Khi không có JWT_SECRET, Docker tự tạo bí mật trong volume riêng, không dùng chuỗi mặc định công khai.

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

Để dùng bản frontend build ổn định khi demo (không phụ thuộc cache HMR), chạy `npm run demo:local -- --with-messaging --production`. Redis/Elasticsearch native là tùy chọn qua `NATIVE_REDIS_URL`/`NATIVE_ELASTICSEARCH_URL`; bỏ trống thì Socket.IO chạy một instance và tìm kiếm MongoDB. Nghiệm thu đầy đủ 2 replicas + Redis + Elasticsearch dùng Docker/CI.

Script tải MongoDB chính thức qua mongodb-memory-server nhưng dùng WiredTiger và lưu dữ liệu thật trong .local/mongo. Không giả lập cơ sở dữ liệu. Nếu không bật các tiến trình RabbitMQ/Mailpit/worker, sự kiện chỉ nằm trong outbox, chưa gửi email. Xem docs/M1-M2-HANDOFF.md để chạy phần email native.

## Kiểm thử

~~~sh
npm run lint
npm test
npm run build
npm run test:integration
npm run test:m3-m4
npm run test:smoke
npm run test:messaging
~~~

- Unit/frontend: Vitest + React Testing Library và Node test runner.
- Integration: khởi tạo MongoDB replica set riêng, kiểm tra auth, profile, addresses, catalog, transaction, idempotency, stock race, loyalty và quyền truy cập; không sửa dữ liệu demo.
- Smoke: cần full stack đang chạy; tạo một đơn thật trong database demo và ba email trong Mailpit.
- Messaging: cần RabbitMQ :5672 và Mailpit :8025/:1025; dùng database và queue kiểm thử riêng, kiểm tra SMTP/replay/retry/dead-letter.
- CI: lint → unit/frontend → build → integration → Docker full stack → smoke → M3/M4 (Redis + Elasticsearch thật) → scaling → 10 browser tests → messaging.
- Postman: import postman/HyperGear.postman_collection.json; chạy collection theo thứ tự. Cookie được Postman giữ tự động; body không gửi giá vốn/giá bán do client quyết định.

Browser E2E (cần stack đang chạy ở localhost:8080): chạy `npx playwright install chromium --only-shell`, sau đó `npm run test:browser`. Có hai viewport desktop 1440px và mobile 390px; kiểm tra menu/filter/phân trang, guest → đăng ký → checkout → tải lại đơn, comment realtime giữa hai browser, admin dashboard/order và PC Builder. GitHub Actions lưu ảnh/báo cáo trong artifact `browser-qa` (14 ngày). Chromium mobile viewport không thay thế Safari/iPhone thật.

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
- Admin: sửa/khóa khách hàng (thu hồi phiên), quản lý sản phẩm/variants/tồn kho/danh mục, ngừng bán giữ lịch sử, đơn 20/trang/lọc thời gian/chi tiết/chuyển tiếp trạng thái.
- Dashboard Chart.js: revenue/profit, users/new users/orders/quantity, nhóm năm/quý/tháng/tuần/ngày, khoảng ngày UTC+7, category và best sellers.
- Bình luận guest/account, sửa/xóa đúng chủ sở hữu; rating một vote/account được sửa; Socket.IO + Redis cập nhật giữa hai catalog replicas.
- Elasticsearch index đồng bộ thay đổi sản phẩm, ưu tiên khớp đúng rồi mới fuzzy; MongoDB vẫn quyết định giá/tồn/visibility. API báo rõ provider khi fallback.
- PC Builder: ngân sách cứng, 8 loại linh kiện (hoặc 7 nếu dùng iGPU), kiểm tra socket/RAM/nguồn/kích thước/tản nhiệt; Gemini giải thích từ catalog. Chat RAG lấy ngữ cảnh MongoDB, không phải vector search. Không có key/hết quota thì ghi rõ chỉ dùng rule engine, không giả AI thành công.
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

## Cấu hình Gemini

Đặt `GEMINI_API_KEY` và `GEMINI_MODEL=gemini-flash-lite-latest` trong `.env` (đã gitignore), không dán key vào frontend, collection, ảnh hay issue. Model alias có thể thay đổi phía Google; đổi GEMINI_MODEL nếu tài khoản không được hỗ trợ. Docker: `docker compose up -d --force-recreate ai-service`; native: khởi động lại demo. Vào `/build-pc` để thử. Kết quả chỉ là cấu hình dữ liệu demo, cần xác minh BIOS/đầu cắm/thông số hãng trước mua hoặc lắp máy thật.

## Kiến trúc và bàn giao

Xem docs/ARCHITECTURE.md, docs/M3-M4-HANDOFF.md, docs/M3-M4-TEST-REPORT.md và docs/BACKLOG.md. Redis/Elasticsearch/AI là thành phần full stack mặc định, không còn profile bonus. Google OAuth, ảnh/thông số model thực, video và bằng chứng đóng góp hai người cần hoàn tất trước nộp.

Nhóm: Trần Gia Triều — 519H0245; Nguyễn Anh Quốc — 523H0086. Deadline và điều kiện 2 commit/tuần không còn dùng làm điều kiện đánh giá tiến độ theo cập nhật của nhóm.
