# Kế hoạch Issue, Project và Milestone

## Cách tổ chức GitHub

- Project: `HyperGear Final Project` dùng Board với các cột `Backlog`, `Ready`, `In progress`, `Review`, `Done`.
- Mỗi chức năng lớn: 1 Issue -> 1 branch `feature/<issue-number>-<ten-ngan>` -> 1 Pull Request.
- Người còn lại review PR trước khi merge.
- Không commit trực tiếp vào `main`.
- Theo cập nhật 02/11/2026: không áp deadline cũ hoặc chỉ tiêu 2 commit/tuần. Vẫn lưu đóng góp, PR và review thật của hai người.

GitHub Insights không phải một tiêu chí độc lập trong file Excel, nhưng đề PDF và rubric số 33 yêu cầu bằng chứng GitHub Insights để chấm đủ 0,5 điểm Teamworking.

## Tên branch, commit và PR

Ví dụ Issue `#12 Cart guest và cập nhật realtime`:

- Branch: `feature/12-guest-cart`
- Commit: `feat(cart): persist guest cart in localStorage`
- Commit sửa lỗi: `fix(cart): clamp quantity to variant stock`
- PR: `[HG-12] Implement guest shopping cart`

Các prefix commit: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.

## Milestone

| Milestone | Thời gian | Mục tiêu |
|---|---|---|
| M1 - Foundation & Storefront | Theo thứ tự M1 | Repo, CI, Docker, UI, landing, catalog, product detail, cart |
| M2 - Account & Commerce Core | Sau M1 | Auth, profile, address, checkout, order, loyalty, email |
| M3 - Admin, Realtime & Scaling | Sau M2 | Admin CRUD, dashboard, review/rating, Socket.IO, scaling |
| M4 - Bonus, QA & Submission | Sau M3 | Elasticsearch, AI RAG, test, seed, evidence, README, video checklist |

## Danh sách Issue đề xuất

Số bên dưới là mã công việc nội bộ, không mặc định trùng số Issue GitHub. Owner là phân công đề xuất để hai người review/tiếp tục; không khẳng định ai đã viết code. Cập nhật tiến độ M1–M4 ngày 03/11/2026; xem M3-M4-TEST-REPORT.md để phân biệt code/test/hồ sơ chưa xong.

`TGT` = Trần Gia Triều (519H0245), `NAQ` = Nguyễn Anh Quốc (523H0086).

| # | Issue | Owner | Milestone | Rubric | Trạng thái code hiện tại |
|---:|---|---|---|---|---|
| 1 | Khởi tạo monorepo, quy ước Git và README | TGT | M1 | Teamworking | Có monorepo + README + PR #1 |
| 2 | Docker Compose, Nginx và 2 gateway | TGT | M1 | Horizontal scaling | Compose + 2 gateway; kiểm chứng trong CI, native demo chạy |
| 3 | GitHub Actions lint/test/build | NAQ | M1 | Bonus CI/CD | Có lint/test/build/integration + full-stack CI; xem PR |
| 4 | Design system, logo, header/footer responsive | NAQ | M1 | UI/UX, Responsive | Chromium desktop/mobile E2E đạt; menu mobile đóng sau chọn trang; còn QA Safari/toàn bộ trang |
| 5 | Landing page New/Best Seller/Category | NAQ | M1 | #8 | Mongo API, mới/bán chạy/3 danh mục, phân trang section |
| 6 | Catalog theo danh mục và pagination 12 item | NAQ | M1 | #9-10 | Mongo API, 12/trang, giữ filter trong URL |
| 7 | Product detail, 3 ảnh, 5 dòng mô tả, variant | NAQ | M1 | #11-12 | API + variants + 3 SVG minh họa; cần ảnh model thật nếu yêu cầu |
| 8 | Search, 3+ filter và 4 sort | NAQ | M1 | #13-15 | API thật, tìm không dấu, filter/sort kết hợp |
| 9 | Guest cart localStorage và cập nhật không reload | TGT | M1 | #16-17 | Đã làm + test quantity/persistence/retry |
| 10 | Auth register/login/JWT + validation bảo mật | TGT | M2 | Nền tảng account | Đã làm + test session/CSRF/rate-limit/ban |
| 11 | Google OAuth và tự liên kết cùng email | TGT | M2 | #1 | Code đã làm; chờ Google credentials + nghiệm thu thật |
| 12 | Profile, change password, recovery 15 phút | TGT | M2 | #2-4 | Đã làm + test revoke session/reset một lần/15 phút |
| 13 | Tối đa 3 địa chỉ và một địa chỉ mặc định | TGT | M2 | #5 | Đã làm + test giới hạn/default/ownership |
| 14 | Gộp cart guest vào cart MongoDB khi login | TGT | M2 | #16-17 | Đã làm + test merge idempotent và retry |
| 15 | Checkout nhiều bước và simulated payment | TGT | M2 | #18 | Đã làm + test success/failure/idempotency |
| 16 | Transaction trừ tồn kho và snapshot order | TGT | M2 | #18, #28-29 | Đã làm + test transaction/last-stock race/snapshot |
| 17 | Loyalty earn/redeem và business-rule tests | TGT | M2 | #24 | Đã làm ledger/earn/redeem + test; dùng điểm không earn |
| 18 | Order history, detail và status timeline | TGT | M2 | #6-7 | Đã làm history/detail/timeline + ownership tests |
| 19 | RabbitMQ order event và email xác nhận | TGT | M2 | #20, Bonus microservices | Đã chạy RabbitMQ/SMTP, retry/dead-letter/dedup tests |
| 20 | Comment cho guest và CRUD comment của mình | NAQ | M3 | #21 | Đã làm; guest/account ownership + CRUD tests |
| 21 | Rating một lần/tài khoản và cho phép sửa | NAQ | M3 | #22 | Đã làm; unique vote/edit/concurrent average tests |
| 22 | Socket.IO realtime + Redis adapter | NAQ | M3 | #23, scaling | Đã làm; Redis 2 catalog và browser realtime CI đạt |
| 23 | Admin user management và seed account | TGT | M3 | #25 | Đã làm; search/edit/ban/revoke session/RBAC tests |
| 24 | Admin product/category/variant/inventory CRUD | NAQ | M3 | #26 | Đã làm; product/category/variant/SKU/inventory/soft archive/rename transaction |
| 25 | Admin order list 20/trang và time filter | TGT | M3 | #28 | Đã làm; 20/trang, preset/custom date UTC+7, CI đạt |
| 26 | Admin order detail và forward-only status | TGT | M3 | #29 | Đã làm; UI detail + forward-only + concurrent confirmation; đã vá delivered/status thiếu |
| 27 | Simple dashboard | NAQ | M3 | #30 | Đã làm; metrics thật + Chart.js |
| 28 | Advanced dashboard theo kỳ + Chart.js | NAQ | M3 | #31 | Đã làm; year/quarter/month/week/day/custom date, browser CI đạt |
| 29 | Elasticsearch indexing và product search | NAQ | M4 | Bonus Elasticsearch | Đã làm; ES thật CI, exact-first/resync/rename/archive |
| 30 | AI PC Builder: compatibility rules + Gemini RAG | NAQ | M4 | Bonus AI | Đã làm; rule engine + Gemini thật + catalog RAG; metadata demo chưa xác minh hãng |
| 31 | Integration/E2E/Postman, security và responsive QA | Cả hai | M4 | UI/UX, Responsive | 58 test/test group + smoke/scaling; 39 request/49 assertion Postman; xem báo cáo 50 case |
| 32 | Seed 40-50 products, demo accounts/orders | Cả hai | M4 | Demo toàn bộ | 50 sản phẩm/11 danh mục, 2 variants/product; demo accounts; đơn được tạo bằng smoke |
| 33 | Rubric self-assessment và GitHub evidence | TGT | M4 | Teamworking | Có audit 03/11 và bằng chứng kỹ thuật; còn Insights/đóng góp hai người |
| 34 | README cuối, Docker clean-run và video checklist | Cả hai | M4 | Submission | README/handoff/clean Docker CI đã có; video/Rubrik.docx/bộ nộp cuối chưa xong |

## Hai Issue không triển khai theo quyết định nhóm

| Hạng mục | Điểm bỏ |
|---|---:|
| Using discount code when making purchase | 0,25 |
| Discount Management | 0,25 |

Tổng điểm rubric chủ động bỏ: **0,5 điểm**. Loyalty discount không thay thế hai tiêu chí coupon khi giảng viên đối chiếu đúng mô tả.

## Nhịp làm việc 2 người

- Thứ Hai 20:00: chọn Issue trong `Ready`, xác nhận owner và mục tiêu tuần.
- Commit theo thay đổi có ý nghĩa; không áp chỉ tiêu số lần mỗi tuần.
- Khi xong Issue: tự test -> mở PR -> người còn lại review -> sửa feedback -> merge.
- Cuối tuần: chụp Insights/Contributors, Project Board và PR review vào thư mục nộp `git/`.

