# HyperGear — tự chấm rubric ngày 03/11/2026

## Kết luận

**8,00/10 điểm phần rubric chính = 80% mức hoàn thành có trọng số.** Bonus kỹ thuật có bằng chứng: **2,00/2,00**. Tổng tự chấm thô: **8,00 + 2,00 = 10,00**, chưa áp đánh giá/chế tài của giảng viên. Bonus không biến các mục còn thiếu thành100%hoàn thành. Đây không phải điểm chính thức hoặc cam kết bài chắc chắn được chấp nhận.

Nguồn: `../NodeJS Final Rubric.xlsx` (Sheet3,35 tiêu chí, tổng10 điểm) và `../NodeJS Final Project.pdf` (đề/bonus/điều kiện nộp). Excel chỉ cho mức0% / 50% / 100%; bảng dưới tuân thủ đúng ba mức, không tự chấm90% từng hạng mục. Deadline/2 commit mỗi tuần được bỏ khỏi phép chấm theo cập nhật của nhóm; yêu cầu bằng chứng cộng tác hai người vẫn giữ.

## Điều kiện có thể làm điểm thực tế khác hẳn phép cộng

PDF trang1 yêu cầu tuân thủ nội dung màu tím và cảnh báo có thể không chấm nếu sai. Trang2 đánh tím guest mua không đăng nhập và form chỉ email/fullname/shippingAddress; bản hiện tại yêu cầu password/phone và bắt login/register trước trả tiền. Trang3 có coupon, nhóm đã chủ động bỏ. Vì vậy **không được dùng con số8 hoặc 10 để kết luận đủ điều kiện nộp**: cần giảng viên xác nhận các ngoại lệ, hoặc nhóm ra quyết định sửa lại đúng đề. Không tự thay đổi những business rule nhóm đã duyệt trong đợt audit này.

Loyalty hiện tích1.000 điểm / 100.000đ, 1 điểm = 1đ  → 1%; PDF ví dụ 1 triệu → giá trị 100.000đ (=10%). Đây là chênh lệch nghiệp vụ, không chỉ khác đơn vị point.

Video 1080p, hồ sơRubrik.docx theo mẫu lúc nộp và bằng chứng nhóm chưa được xác nhận hoàn thành. PDF có điều kiện không chấm nếu thiếu video/rubrik/deployment. Docker đã có bằng chứng chạy, nhưng chưa có demo.mp4 thực tế. Không áp phạt trễ hạn/commitweekly.

## Bảng35 tiêu chí

| # | Tiêu chí | Tối đa | Mức | Tạm đạt | Căn cứ/việc còn thiếu |
|---:|---|---:|---:|---:|---|
| 1 | Social Media Authentication | 0.25 | 0% | 0 | Có code nhưng thiếu OAuth credentials, chưa đăng nhập Google thật |
| 2 | View profile page | 0.25 | 100% | 0.25 | Profile whitelist, cookie/session, chống sửa role |
| 3 | Change password | 0.25 | 100% | 0.25 | Kiểm tra mật khẩu hiện tại, thu hồi mọi session |
| 4 | Password recovery | 0.25 | 100% | 0.25 | Token15 phút/một lần, email SMTP, anti-enumeration |
| 5 | Manage multiple delivery address | 0.25 | 100% | 0.25 | Tối đa 3, đúng 1 default, ownership |
| 6 | View purchase history | 0.25 | 100% | 0.25 | Lịch sử riêng từng user, mới nhất trước |
| 7 | View purchase details | 0.25 | 100% | 0.25 | Snapshot đơn, địa chỉ, timeline |
| 8 | Landing Page | 0.25 | 100% | 0.25 | New/Best Sellers/3category và pagination |
| 9 | Product Catalog | 0.25 | 100% | 0.25 | Catalog Mongo riêng, filter theo category |
| 10 | Pagination | 0.25 | 100% | 0.25 | 12/trang, số trang khi1trang, đủ dữ liệu demo |
| 11 | View product details | 0.25 | 100% | 0.25 | 3 ảnh minh họa, mô tả>=5 dòng, hãng/giá/detail |
| 12 | View product variants | 0.25 | 100% | 0.25 | 2 variant/product, tồn/giá/SKU riêng |
| 13 | Product search by keyword | 0.25 | 100% | 0.25 | Mongo không dấu; Elasticsearch exact-first/resync |
| 14 | Product filtering | 0.25 | 100% | 0.25 | Brand/min-maxprice/category/rating kết hợp |
| 15 | Product ordering | 0.25 | 100% | 0.25 | Tên A-Z/Z-A, giá tăng/giảm đã test |
| 16 | Display shopping cart | 0.25 | 100% | 0.25 | GuestlocalStorage, accountMongo |
| 17 | Update shopping cart | 0.25 | 100% | 0.25 | Không reload, validationqty, mergeretryidempotent |
| 18 | Checkout process | 0.25 | 50% | 0.125 | Đủ multistep/payment/transaction; guest phải login khác PDF |
| 19 | Using discount code | 0.25 | 0% | 0 | Chủ động bỏ coupon |
| 20 | Email notification | 0.25 | 100% | 0.25 | Receipt/confirmation/reset + RabbitMQ/SMTP |
| 21 | Product review | 0.25 | 100% | 0.25 | Guest/account, sửa/xóa đúng chủ |
| 22 | Product rating | 0.25 | 100% | 0.25 | Authvote, uniquevote/edit/trung bình đồng thời |
| 23 | Realtime review/rating | 0.25 | 100% | 0.25 | Socket.IO/Redis qua2 catalog, browser không reload |
| 24 | Loyalty Programs | 0.25 | 50% | 0.125 | Đúng rule nhóm nhưng earn1% thay 10% PDF; redeem không earn |
| 25 | User Management | 0.25 | 100% | 0.25 | Tìm/sửa/ban/revoke, không nâng quyền hoặc sửa admin |
| 26 | Product Management | 0.25 | 100% | 0.25 | CRUDcategory/product/variants/SKU/inventory, softarchive |
| 27 | Discount Management | 0.25 | 0% | 0 | Chủ động bỏ coupon admin |
| 28 | View order list | 0.25 | 100% | 0.25 | 20/trang, newestfirst, preset/customdateUTC+7 |
| 29 | View order details/status | 0.25 | 100% | 0.25 | Detailfinancials/snapshot/statusforward/history; đã vá delivered |
| 30 | Simple Dashboard | 0.25 | 100% | 0.25 | Users/newusers/orders/revenue/profit/bestsellerscharts |
| 31 | Advanced Dashboard | 0.5 | 100% | 0.5 | Chart.js, year/quarter/month/week/day/customrange |
| 32 | UI/UX | 0.5 | 50% | 0.25 | Tạm50%: UI nhất quán, còn ảnh/chi tiết nội dung và đánh giá chủ quan |
| 33 | Teamworking | 0.5 | 0% | 0 | Checkout hiện chỉ có một tác giả; chưa có bằng chứng Quốc đóng góp/Insights |
| 34 | Responsive | 0.5 | 50% | 0.25 | Tạm50%: Chromiumdesktop/mobile10flows đạt, chưaSafari/iPhone thật/toàn thiết bị |
| 35 | Horizontal scaling | 0.5 | 100% | 0.5 | Nginx2 gateway,2 catalog, Redisrooms, sessionMongo; CI scaleproof |
| | **Tổng rubric chính** | **10** | | **8,00** | **80%** |

UI/UX và Responsive là chấm bảo thủ50%, không phải kết luận giao diện đã mất chắc0,5điểm. Giảng viên có quyền đánh giá khác. Scaling đánh theo bằng chứng2 gateway/2 catalog/stateless session; không tuyên bố có HA/autoscaling/tải production.

## Bonus tách riêng

| Bonus | Tối đa | Tự chấm | Bằng chứng |
|---|---:|---:|---|
| CI/CD | 0,5 | 0,5 | Actions lint/audit/unit/integration/Docker/browser/messaging |
| Microservices + async | 0,5 | 0,5 | 6service tách process/container, RabbitMQ/outbox/retry; sharedMongo được ghi rõ |
| AI | 0,5 | 0,5 | Gemini thật trênUI/API, RAGcatalog + ruleenginePC; không giả AI khi thiếukey |
| Elasticsearch | 0,5 | 0,5 | Index/search/resync thật trongDockerCI, provider xác nhận khôngfallback |
| **Tổng** | **2** | **2** | Bonus phải đưa vào video/README/hồ sơ để giảng viên xem xét |

## Kiểm thử và phần còn lại

Xem [50 test case](TEST-CASES-50-2026-11-03.md), [báo cáo M3-M4](M3-M4-TEST-REPORT.md) và [hướng dẫn bàn giao](M3-M4-HANDOFF.md). 44 case đạt không tương đương88% hoàn thành dự án: testcase là coverage kiểm thử,80% là điểm rubric có trọng số.

Ưu tiên trước nộp:

1. Xác nhận/sửa form đăng ký, guest checkout, loyalty 10%, coupon theo đề. Những mục này có rủi ro tuân thủ, không tự suy luận bonus sẽ bù.
2. Cấu hình/nghiệm thu Google OAuth; thay Gemini key đã lộ trong chat.
3. Hai thành viên review/sửa/commit thật và chụp Insights; không tạo contribution giả.
4. Kiểm tra Safari/iPhone, thay ảnh/thông số PC demo bằng dữ liệu đã xác minh nếu muốn dùng thực tế.
5. Merge PR theo thứ tự, quay demo.mp4, điền Rubrik.docx/mẫu giảng viên, đóng gói sạch source/git/Bonus/Readme theo đề.

