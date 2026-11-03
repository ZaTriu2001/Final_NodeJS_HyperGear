# Bàn giao M3–M4 HyperGear

Cập nhật 03/11/2026. Đây là hướng dẫn chạy/review, không phải xác nhận điểm số của giảng viên.

## Những gì đã triển khai

| Nhóm | Rubric | Đường dẫn kiểm tra |
|---|---|---|
| Comment guest/account, sửa/xóa đúng chủ sở hữu | 21 | Product → Bình luận và đánh giá |
| Rating một vote/account, sửa sao và cập nhật điểm trung bình | 22 | Đăng nhập customer → Product |
| Socket.IO WebSocket + Redis qua 2 catalog replicas | 23, 35 | Mở cùng sản phẩm ở 2 trình duyệt; gửi comment |
| Khách hàng: tìm/sửa/khóa, không nâng quyền hoặc sửa admin | 25 | `/admin?tab=users` |
| Product/category/variant/inventory, soft archive, rename category | 26 | `/admin?tab=products`, `/admin?tab=categories` |
| Đơn 20/trang, time filter, detail và forward-only status | 28–29 | `/admin?tab=orders` |
| Chart.js, revenue/profit, kỳ năm/quý/tháng/tuần/ngày, best sellers | 30–31 | `/admin` |
| Elasticsearch tự index/resync, exact-first/fuzzy, Mongo fallback | Bonus ES | `/api/catalog/products?q=man%20hinh` |
| Rule-based PC Builder + Gemini, chat catalog-grounded RAG | Bonus AI | `/build-pc` |
| Docker clean start, 2 gateway, Redis, RabbitMQ, tests và CI | 35, bonus | `.github/workflows/ci.yml` |

## Chạy lại

Node 24; `npm ci --ignore-scripts`, `npm run demo:setup`, `docker compose up -d --build --wait --wait-timeout 180`. Docker tự sinh JWT secret nếu không cấu hình. Không chạy native cùng lúc vì trùng cổng.

Mac chưa mở Docker: `NATIVE_REDIS_URL=redis://127.0.0.1:6379 npm run demo:local -- --with-messaging --production`. Redis phải đang chạy; nếu chưa cài/chưa chạy thì bỏ biến NATIVE_REDIS_URL, socket chỉ trong một instance. `--production` build frontend rồi preview, tránh cache HMR khi demo. Native Mongo lưu `.local/mongo`; Ctrl+C giữ dữ liệu. RabbitMQ/Mailpit cần runtime đã cài theo M1-M2-HANDOFF.

Trong phiên nghiệm thu này, Docker Desktop trên Mac chưa tạo được daemon; ES native bị sandbox macOS từ chối. Không vô hiệu hóa sandbox. Full-stack Redis/ES/scaling được kiểm thử trên Linux Docker trong GitHub Actions, tách biệt với localhost native.

## Gemini và bảo mật

- Chỉ đặt GEMINI_API_KEY trong `.env` (gitignored). Không đưa vào VITE_*, collection, issue, ảnh hoặc GitHub.
- Đã gọi thật thành công bằng `gemini-flash-lite-latest`. `gemini-flash-latest` từng HTTP 503; API lỗi sẽ báo fallback rules, không giả AI.
- Nếu key từng dán vào chat, chủ key cần thu hồi/tạo key mới rồi cập nhật `.env`. Không cần gửi key lại trong chat.
- Docker: recreate ai-service sau đổi env; native: restart demo.
- Chỉ gửi catalog/nhu cầu tư vấn cho Google, không gửi key cho browser hoặc lịch sử đơn/hồ sơ người mua cho mô hình.

RAG ở đây là retrieval từ catalog MongoDB + context + generation, **không embeddings/vector search**. Rule engine quyết định cấu hình/giá/budget; LLM chỉ giải thích. Không đảm bảo tương thích thương mại: dữ liệu PC là demo; cần thông số hãng, BIOS, connector, lane PCIe và kiểm tra lắp thực tế trước sử dụng thật.

## Postman và debug

Import cả `postman/HyperGear.postman_collection.json` (M1–M2) và `postman/HyperGear-M3-M4.postman_collection.json`. Chạy theo thứ tự trên database demo; collection M3–M4 tạo rồi ngừng bán sản phẩm thử, tạo danh mục thử và tắt; không dùng trên production. Cookie Postman giữ tự động, header X-HyperGear-Client bắt buộc với API ghi.

- 401: login lại, kiểm tra cookie, trạng thái blocked và session bị thu hồi.
- 403: dùng admin cho `/admin/*`, không tự sửa role ở client.
- 409 sản phẩm: kiểm tra slug/SKU trùng; category còn sản phẩm active không thể ngừng.
- ES fallback: `docker compose logs catalog-service catalog-replica elasticsearch`; kiểm tra searchProvider, chờ poll 5 giây. Test cấu hình ES không được tự pass khi fallback.
- Realtime: WebSocket `/socket.io`, Redis health và room product ID; reconnect phải tải lại reviews.
- Không có biểu đồ: kiểm tra kỳ ngày hiện tại có đơn paid; không seed số liệu tài chính giả để lấp biểu đồ.

## Phân công hai người để hoàn tất hồ sơ

Đây là đề xuất việc còn lại, không tạo bằng chứng đóng góp giả:

| Người | Việc cần tự thực hiện/review | Điều kiện xong |
|---|---|---|
| Trần Gia Triều — 519H0245 | Tạo Google OAuth web client, cấu hình consent/test user và kiểm thử login/link; review RBAC, revenue/profit/loyalty; quay phần account/checkout/admin | Login Google thật + video luồng và review PR thật |
| Nguyễn Anh Quốc — 523H0086 | Chạy lại frontend/PC Builder/realtime trên máy thứ hai; kiểm tra ảnh và thông số linh kiện; QA Safari/iPhone; quay phần catalog/search/AI | Có ghi nhận lỗi/sửa/commit hoặc review thật |
| Cả hai | Review PR M1-M2 trước, rồi PR M3-M4; merge theo thứ tự; chụp Contributors/Insights/Board; đóng gói theo đề | Code main đã merge và bằng chứng nhóm thực tế |

Không áp điều kiện 2 commit/tuần hoặc deadline cũ. Hai tiêu chí coupon #19/#27 chủ động không triển khai theo quyết định nhóm, mất tổng 0,5 điểm nếu giảng viên chấm đúng mô tả. Loyalty không thay thế coupon.

## Checklist video/nộp

1. Mở repo/README, chạy Docker từ checkout sạch; không quay `.env`, token hoặc màn hình key.
2. Demo catalog/search/filter/pagination, variants/giỏ khách, đăng ký/Google/profile/địa chỉ.
3. Checkout thất bại/thành công mô phỏng, tồn kho, loyalty không earn khi redeem, lịch sử đơn và email Mailpit.
4. Hai cửa sổ bình luận/rating realtime, quyền sửa của chủ sở hữu.
5. Admin khách hàng/sản phẩm/danh mục/đơn và dashboard theo kỳ; nêu công thức profit.
6. ES searchProvider + GitHub Actions; PC Builder đủ bộ trong ngân sách, Gemini thật và cảnh báo dữ liệu demo.
7. Nộp source không node_modules/.local/.env; README, video và thư mục evidence/git theo đề. Video và bằng chứng nhóm phải do nhóm chuẩn bị, không được xem checklist này là video đã hoàn thành.
