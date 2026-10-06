# HyperGear

HyperGear là website thương mại điện tử tiếng Việt chuyên bán máy tính và linh kiện máy tính. Dự án sử dụng React, Node.js, MongoDB và kiến trúc microservices.

## Trạng thái hiện tại

Giai đoạn nền tảng đã có:

- Giao diện trang chủ, catalog, chi tiết sản phẩm, đăng nhập, đăng ký, giỏ hàng và admin dashboard preview.
- Catalog có tìm kiếm, lọc, bốn kiểu sắp xếp và pagination luôn hiển thị số trang.
- Sản phẩm mẫu có nhiều variant với giá và tồn kho độc lập.
- Giỏ hàng guest lưu bằng localStorage và cập nhật tổng tiền không reload.
- Khung microservices, Docker Compose, Redis, RabbitMQ, Elasticsearch và Nginx.
- GitHub Actions chạy lint, test và build.
- Backlog Issue/Milestone nằm trong `docs/BACKLOG.md`.

Các quyết định nghiệp vụ nằm trong `docs/DECISIONS.md`; sơ đồ service nằm trong `docs/ARCHITECTURE.md`; đối chiếu đủ 35 dòng chấm điểm nằm trong `docs/RUBRIC-MAP.md`.

## Chạy frontend để xem nhanh

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

Lần cài thành công đầu tiên sẽ sinh `package-lock.json`; hãy commit file này và sau đó đổi CI từ `npm install` sang `npm ci` để bản build có dependency cố định.

## Chạy toàn bộ bằng Docker

```bash
docker compose up -d
```

Mở `http://localhost:8080`.

## Tài khoản demo dự kiến

- Admin: `admin@gmail.com` / `HyperGear@2026`
- Customer: `customer@gmail.com` / `Customer@2026`

Không dùng các thông tin này cho môi trường thật.

## Lưu ý phạm vi

Nhóm quyết định không triển khai coupon. Quyết định này bỏ hai tiêu chí `Using discount code when making purchase` và `Discount Management`, tổng cộng 0,5 điểm rubric. Loyalty discount vẫn được giữ.
