# Trạng thái triển khai

Cập nhật: 01/10/2026, múi giờ Asia/Ho_Chi_Minh.

## Đã hoàn thành ở giai đoạn 1

- Khởi tạo monorepo local và remote `ZaTriu2001/Final_NodeJS_HyperGear`.
- React storefront preview: home, catalog, product detail, cart, login/register shell, admin dashboard preview.
- 28 sản phẩm fixture thuộc 7 danh mục; mỗi sản phẩm có 2 variant, giá vốn, giá bán và tồn kho riêng.
- Search, brand/category/price/rating filter, 4 sort mode, 12 item/page và page number luôn hiển thị.
- Guest cart dùng localStorage, thay đổi số lượng/tổng tiền không reload.
- API Gateway và 5 business/support services: Auth, Catalog, Order, Notification, AI.
- Auth register/login cơ bản với bcrypt + JWT; MongoDB model cho user/địa chỉ.
- Catalog model và API list/detail có filter/sort/pagination.
- Order financial rules và metrics skeleton; unit test cho profit và loyalty points.
- Docker Compose với MongoDB, Redis, RabbitMQ, Elasticsearch, Nginx và 2 gateway instance.
- GitHub Actions, Postman collection và tài liệu kiến trúc/backlog/rubric.

## Đã kiểm tra

- Tất cả file JavaScript backend qua `node --check`.
- Tất cả file JSX qua TypeScript parser.
- 3/3 unit test business rule đạt.
- `docker compose config --quiet` đạt.
- `git diff --check` đạt.

## Chưa thể kiểm tra trong môi trường hiện tại

- `npm install` không tải được dependency từ npm registry, nên chưa sinh `package-lock.json` và chưa chạy Vite build/ESLint.
- Sandbox không cho truy cập Docker daemon socket, nên chưa chạy `docker compose up -d` end-to-end.

Hai vấn đề trên không phải yêu cầu phê duyệt đang chờ. Người dùng có thể chạy các lệnh sau trong Terminal máy thật:

```bash
cd "/Users/zatriu/Downloads/Learning/WebApp Development Using NodeJS/Final/Final_NodeJS_HyperGear"
npm install
npm run lint
npm test
npm run build
docker compose up -d
```

## Phần giai đoạn 2 còn lại

- Nối form frontend vào Auth/Catalog API; Google OAuth, profile, change/recover password, address CRUD.
- Cart MongoDB và merge guest cart.
- Checkout nhiều bước, mô phỏng thanh toán, transaction tồn kho và order status history.
- Loyalty persistence, email SMTP, order history/detail.
- Comment/rating và Socket.IO + Redis adapter.
- Admin CRUD thật và Chart.js dashboard thật.
- Elasticsearch indexing/search, Gemini RAG + compatibility rule engine.
- Seed 40-50 sản phẩm, demo accounts/orders, integration/E2E tests và hồ sơ nộp bài.
