# Kiến trúc HyperGear

## Sơ đồ luồng chính

```text
Browser
  |
  v
Nginx :8080
  |-- /             -> React static web
  |-- /api/*        -> API Gateway A / API Gateway B (least_conn)
                           |-- Auth Service --------> MongoDB
                           |-- Catalog Service -----> MongoDB + Elasticsearch
                           |-- Order Service -------> MongoDB -> RabbitMQ
                           |                              |
                           |                              v
                           |                       Notification Service
                           |-- AI Service ----------> Elasticsearch + Gemini API

Redis: cache, rate-limit state và Socket.IO adapter khi realtime được triển khai.
```

## Trách nhiệm từng service

| Thành phần | Trách nhiệm | Trạng thái giai đoạn 1 |
|---|---|---|
| Web | Giao diện khách hàng/admin | Có bản preview và dữ liệu mẫu |
| API Gateway | Một cổng `/api`, proxy stateless | Đã có health check và route proxy |
| Auth Service | Đăng ký, đăng nhập, JWT, OAuth, profile | Đã có đăng ký/đăng nhập cơ bản; OAuth/profile ở giai đoạn 2 |
| Catalog Service | Product, variant, search/filter/sort | Đã có model và API đọc MongoDB |
| Order Service | Checkout, tồn kho, loyalty, order, dashboard | Đã có model tài chính, test và metrics; transaction checkout ở giai đoạn 2 |
| Notification Service | Nhận sự kiện RabbitMQ, gửi email | Đã có consumer; SMTP ở giai đoạn 2 |
| AI Service | RAG PC Builder | Đã có endpoint contract; retrieval/Gemini ở giai đoạn 2 |

## Nguyên tắc horizontal scaling

- Gateway không lưu session trong bộ nhớ; xác thực dùng JWT.
- Hai gateway chạy sau Nginx `least_conn`.
- File ảnh dùng URL/object storage, không ghi lên ổ đĩa của container.
- Dữ liệu lâu dài nằm trong MongoDB; cache/realtime state nằm ở Redis.
- Sự kiện order gửi qua RabbitMQ để Order Service không phụ thuộc trực tiếp vào email.

## Quy tắc AI PC Builder

RAG không được tự quyết tính tương thích phần cứng. Luồng đúng là:

1. Elasticsearch lấy sản phẩm theo nhu cầu và ngân sách.
2. Rule engine kiểm tra socket CPU/mainboard, chuẩn RAM, công suất PSU, kích thước case/GPU và tổng chi phí.
3. Chỉ các cấu hình hợp lệ mới đưa cho Gemini để giải thích bằng tiếng Việt.
4. Mọi sản phẩm/giá/tồn kho trong câu trả lời phải trích từ catalog hiện tại.

