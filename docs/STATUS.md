# Trạng thái triển khai HyperGear

Cập nhật 03/11/2026, Asia/Ho_Chi_Minh.

## M1–M4 có code và bằng chứng kiểm thử

- Storefront MongoDB: 50 sản phẩm/11 danh mục, landing/catalog/detail/variants/cart; Node24, React/Vite/Bootstrap.
- Account/commerce: profile, password/reset, địa chỉ, cart merge, checkout mô phỏng, transaction tồn/đơn/điểm/outbox, lịch sử đơn.
- Email: RabbitMQ + SMTP Mailpit, retry/dead-letter/deduplication.
- Admin: khách hàng, sản phẩm/variants/tồn kho/danh mục, đơn 20/trang/date filter/status/detail, Chart.js revenue/profit theo kỳ.
- Comment guest/account, ownership; rating một vote/account có thể sửa; Socket.IO + Redis qua 2 catalog instances.
- Elasticsearch index/search/resync; AI PC Builder rule engine + Gemini thật, chat RAG từ catalog MongoDB.
- Nginx 2 gateway, 2 catalog; session và rate-limit bucket dùng chung MongoDB. Không tuyên bố HA/autoscaling/tải production.
- CI code commit 2df8475 xanh: [run41598615745](https://github.com/ZaTriu2001/Final_NodeJS_HyperGear/actions/runs/41598615745). 58 test/test group tự động, ngoài smoke/scaling/Postman; xem báo cáo để phân biệt local/CI.

## Tự chấm và kiểm thử

- [Rubric35 tiêu chí](RUBRIC-AUDIT-2026-11-03.md): 8,00/10 =80% phần chính; bonus tự chấm2/2. Không phải điểm chính thức.
- [50 case nghiệm thu](TEST-CASES-50-2026-11-03.md): 44 đạt, 3 lệch đề, 1 Google chưa nghiệm thu,2 coupon không triển khai.
- [Báo cáo và lỗi đã sửa](M3-M4-TEST-REPORT.md): lỗi status thiếu trên delivered, PC thiếu thông số, ES fuzzy rộng và nhãn dashboard.
- Test PASS theo rule nhóm không chứng minh đã tuân thủ mọi yêu cầu PDF.

## Demo

[Website](http://localhost:8080), [Admin](http://localhost:8080/admin), [PC Builder](http://localhost:8080/build-pc), [Mailpit](http://localhost:8025).

Docker full stack đã chạy trên GitHub CI Linux. Docker Desktop trên Mac hiện chưa hoạt động; localhost dùng native Node/Mongo WiredTiger replica set/RabbitMQ/Mailpit/Redis. ES native bị sandbox macOS từ chối nên local search dùng MongoDB, không giả provider ES.

~~~sh
npm run demo:setup
NATIVE_REDIS_URL=redis://127.0.0.1:6379 npm run demo:local -- --with-messaging --production
~~~

Redis phải đang chạy; bỏ biến NATIVE_REDIS_URL nếu không dùng Redis native. Ctrl+C giữ dữ liệu .local/mongo. Không chạy cùng Docker vì trùng cổng. Localhost trên laptop không phải URL public cho iPhone.

## Chưa thể coi toàn bộ hồ sơ nộp đã xong

1. Google OAuth cần cấu hình và đăng nhập thật.
2. Form đăng ký và guest checkout khác phần đánh tím của PDF; loyalty 1% khác 10%; coupon đã chủ động bỏ. Cần xác nhận ngoại lệ với giảng viên hoặc quyết định sửa.
3. UI/Responsive cần QA Safari/iPhone thật; ảnh/thông số PC còn demo.
4. Video 1080p, Rubrik.docx theo mẫu lúc nộp, thư mục git/Bonus và bằng chứng hai thành viên chưa đủ.
5. Nhánh M1–M2 PR#1 chưa merge; M3–M4 ở feature/m3-m4-completion. Không tự merge main hoặc tạo contribution cho Quốc.

Deadline và yêu cầu2 commit/tuần không tính theo cập nhật của nhóm. Xem [bàn giao M3-M4](M3-M4-HANDOFF.md).
