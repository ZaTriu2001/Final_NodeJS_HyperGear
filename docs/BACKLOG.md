# Kế hoạch Issue, Project và Milestone

## Cách tổ chức GitHub

- Project: `HyperGear Final Project` dùng Board với các cột `Backlog`, `Ready`, `In progress`, `Review`, `Done`.
- Mỗi chức năng lớn: 1 Issue -> 1 branch `feature/<issue-number>-<ten-ngan>` -> 1 Pull Request.
- Người còn lại review PR trước khi merge.
- Không commit trực tiếp vào `main`.
- Mỗi người tối thiểu 2 commit/tuần từ 20/09/2026; chụp GitHub Insights hàng tuần làm bằng chứng Teamworking.

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
| M1 - Foundation & Storefront | 20/09-04/10 | Repo, CI, Docker, UI, landing, catalog, product detail, cart |
| M2 - Account & Commerce Core | 05/10-11/10 | Auth, profile, address, checkout, order, loyalty, email |
| M3 - Admin, Realtime & Scaling | 12/10-18/10 | Admin CRUD, dashboard, review/rating, Socket.IO, scaling |
| M4 - Bonus, QA & Submission | 19/10-24/10 | Elasticsearch, AI RAG, test, seed, evidence, README, video checklist |

## Danh sách Issue đề xuất

`TGT` = Trần Gia Triều (519H0245), `NAQ` = Nguyễn Anh Quốc (523H0086).

| # | Issue | Owner | Milestone | Rubric | Trạng thái code hiện tại |
|---:|---|---|---|---|---|
| 1 | Khởi tạo monorepo, quy ước Git và README | TGT | M1 | Teamworking | Đã dựng local |
| 2 | Docker Compose, Nginx và 2 gateway | TGT | M1 | Horizontal scaling | Đã dựng, cần chạy full stack |
| 3 | GitHub Actions lint/test/build | NAQ | M1 | Bonus CI/CD | Đã dựng, cần chạy trên GitHub |
| 4 | Design system, logo, header/footer responsive | NAQ | M1 | UI/UX, Responsive | Đã dựng preview |
| 5 | Landing page New/Best Seller/Category | NAQ | M1 | #8 | Đã dựng bằng fixture |
| 6 | Catalog theo danh mục và pagination 12 item | NAQ | M1 | #9-10 | Đã dựng bằng fixture |
| 7 | Product detail, 3 ảnh, 5 dòng mô tả, variant | NAQ | M1 | #11-12 | Đã dựng bằng fixture |
| 8 | Search, 3+ filter và 4 sort | NAQ | M1 | #13-15 | Đã dựng frontend; API Mongo đã có |
| 9 | Guest cart localStorage và cập nhật không reload | TGT | M1 | #16-17 | Đã dựng frontend |
| 10 | Auth register/login/JWT + validation bảo mật | TGT | M2 | Nền tảng account | Backend cơ bản đã có |
| 11 | Google OAuth và tự liên kết cùng email | TGT | M2 | #1 | Chưa làm |
| 12 | Profile, change password, recovery 15 phút | TGT | M2 | #2-4 | Chưa làm |
| 13 | Tối đa 3 địa chỉ và một địa chỉ mặc định | TGT | M2 | #5 | Chưa làm |
| 14 | Gộp cart guest vào cart MongoDB khi login | TGT | M2 | #16-17 | Chưa làm |
| 15 | Checkout nhiều bước và simulated payment | TGT | M2 | #18 | Chưa làm |
| 16 | Transaction trừ tồn kho và snapshot order | TGT | M2 | #18, #28-29 | Model sơ bộ; chưa làm transaction |
| 17 | Loyalty earn/redeem và business-rule tests | TGT | M2 | #24 | Công thức + unit test đã có |
| 18 | Order history, detail và status timeline | TGT | M2 | #6-7 | Chưa làm |
| 19 | RabbitMQ order event và email xác nhận | TGT | M2 | #20, Bonus microservices | Consumer sơ bộ; chưa gửi SMTP |
| 20 | Comment cho guest và CRUD comment của mình | NAQ | M3 | #21 | Chưa làm |
| 21 | Rating một lần/tài khoản và cho phép sửa | NAQ | M3 | #22 | Chưa làm |
| 22 | Socket.IO realtime + Redis adapter | NAQ | M3 | #23, scaling | Chưa làm |
| 23 | Admin user management và seed account | TGT | M3 | #25 | Chưa làm |
| 24 | Admin product/category/variant/inventory CRUD | NAQ | M3 | #26 | Chưa làm |
| 25 | Admin order list 20/trang và time filter | TGT | M3 | #28 | Chưa làm |
| 26 | Admin order detail và forward-only status | TGT | M3 | #29 | Chưa làm |
| 27 | Simple dashboard | NAQ | M3 | #30 | Đã có UI preview, metrics API sơ bộ |
| 28 | Advanced dashboard theo kỳ + Chart.js | NAQ | M3 | #31 | Chưa làm |
| 29 | Elasticsearch indexing và product search | NAQ | M4 | Bonus Elasticsearch | Container có; chưa index/search |
| 30 | AI PC Builder: compatibility rules + Gemini RAG | NAQ | M4 | Bonus AI | Contract endpoint có; chưa triển khai |
| 31 | Integration/E2E/Postman, security và responsive QA | Cả hai | M4 | UI/UX, Responsive | Collection health sơ bộ; test còn thiếu |
| 32 | Seed 40-50 products, demo accounts/orders | Cả hai | M4 | Demo toàn bộ | Hiện có 28 fixture frontend |
| 33 | Rubric self-assessment và GitHub evidence | TGT | M4 | Teamworking | Checklist đã map; chưa chụp evidence |
| 34 | README cuối, Docker clean-run và video checklist | Cả hai | M4 | Submission | Chưa hoàn tất |

## Hai Issue không triển khai theo quyết định nhóm

| Hạng mục | Điểm bỏ |
|---|---:|
| Using discount code when making purchase | 0,25 |
| Discount Management | 0,25 |

Tổng điểm rubric chủ động bỏ: **0,5 điểm**. Loyalty discount không thay thế hai tiêu chí coupon khi giảng viên đối chiếu đúng mô tả.

## Nhịp làm việc 2 người

- Thứ Hai 20:00: chọn Issue trong `Ready`, xác nhận owner và mục tiêu tuần.
- Mỗi người tạo ít nhất 2 commit có nội dung thật trong tuần; không chia một thay đổi giả tạo thành nhiều commit.
- Khi xong Issue: tự test -> mở PR -> người còn lại review -> sửa feedback -> merge.
- Cuối tuần: chụp Insights/Contributors, Project Board và PR review vào thư mục nộp `git/`.

