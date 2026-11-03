# Báo cáo kiểm thử HyperGear M3–M4 và regression toàn dự án

Ngày 03/11/2026. Bản code đã kiểm chứng: `2df8475`, nhánh `feature/m3-m4-completion`.

Thay đổi ở [PR #2](https://github.com/ZaTriu2001/Final_NodeJS_HyperGear/pull/2), base là nhánh M1–M2 của PR #1; chưa merge main. Demo [dashboard](evidence/m3-admin-demo.jpg) được chụp sau khi áp dụng thống kê theo quý.

## Kết quả có bằng chứng

[GitHub Actions 41598615745](https://github.com/ZaTriu2001/Final_NodeJS_HyperGear/actions/runs/41598615745) đạt toàn bộ workflow, bao gồm bộ kiểm tra logic mới. Bản trước `3a8d3bc` cũng đã đạt 10 browser flows. Artifact `browser-qa` chứa screenshots/report/trace, giữ 14 ngày; cần tải trước khi artifact hết hạn nếu dùng làm hồ sơ nộp.

| Bộ kiểm thử | Kết quả | Môi trường |
|---|---|---|
| Lint + production build | Đạt | Local và CI |
| npm audit production, mức high | 0 vulnerability trong run đã kiểm chứng | CI |
| Frontend Vitest | 11/11 | jsdom; không thay thế browser |
| Finance unit | 3/3 | Node test runner |
| M1–M2 integration | 12/12 nhóm | MongoDB WiredTiger replica set riêng |
| M3–M4 integration | 8/8 nhóm trong CI | Redis và Elasticsearch thật |
| M3–M4 local | 7 đạt, 1 ES skip | Redis native; ES không chạy được trên Mac hiện tại |
| Logic regression mới | 13/13 | Local và CI, gồm các lỗi đã tái hiện trước sửa |
| Browser E2E | 10/10 | Chromium desktop 1440px + mobile 390px trên Docker CI |
| Messaging | 1/1 nhóm | RabbitMQ + SMTP Mailpit, replay/retry/dead-letter |
| Checkout/SMTP smoke | Đạt | Tạo đơn demo, receipt/confirmation/reset |
| Nginx scaling/session smoke | Đạt | 40 health requests qua 2 gateway + 20 phiên xác thực |
| Postman M1–M2 | 18 request, 19 assertion, 0 lỗi | Newman trên localhost |
| Postman M3–M4 | 21 request, 30 assertion, 0 lỗi | Newman trên localhost, Gemini thật |

Tổng các test/test group tự động trong các hàng unit/integration/logic/browser/messaging: **58**, ngoài smoke/scaling/Postman. Không đánh đồng số group với số case nghiệp vụ. Bảng [50 case nghiệm thu](TEST-CASES-50-2026-11-03.md) chọn 50 tình huống từ các assertion/luồng trên và chỉ rõ 3 lệch đề + 3 mục chưa có nghiệm thu/không triển khai.

## Các lỗi đã tìm thấy

| Lỗi | Cách tái hiện | Trước sửa | Sau sửa |
|---|---|---|---|
| Trạng thái cuối nhận status thiếu | PATCH `{}` vào đơn delivered | L01 thất bại, endpoint nhận request không hợp lệ | 400/409, status/history không đổi |
| PC thiếu thông số vẫn compatible | Bỏ wattage nguồn hoặc trường số bắt buộc | L05 thất bại do so sánh undefined/NaN | Fail closed, 7 trường thiếu đều bị phát hiện |
| Tìm kiếm fuzzy quá rộng | Search man hinh | 36 kết quả, CI ES thất bại | Exact-first trả 8 màn hình, rename/archive test đạt |
| Filter biểu đồ khó xác định nhãn | Browser select nhóm quý | Admin test desktop/mobile timeout | aria-label rõ ràng; 10 browser tests đạt |
| Module React dev cũ trong browser | Reload sau cập nhật thư viện/HMR | Native dev màn hình trắng trong IAB | Demo --production build mới hiển thị; React dedupe bật |

Không tuyên bố hệ thống không còn mọi lỗi. Kiểm thử có giới hạn phạm vi và dữ liệu.

## Gemini thật

- Key được người dùng cung cấp và chỉ lưu `.env` gitignored. Không đưa key vào bằng chứng.
- `gemini-flash-latest` từng trả HTTP 503; `gemini-flash-lite-latest` đã trả thành công, model version tại lần nghiệm thu là `gemini-3.5-flash-lite`.
- Luồng PC Builder thật: budget 25.000.000đ → 8 phần, total 22.760.000đ, compatible theo metadata demo; UI hiển thị giải thích CPU/GPU/RAM từ Gemini.
- Postman chat trả catalog sources và answer provider. Khi không có key, test kỳ vọng rules/aiAvailable=false, không giả Gemini thành công.
- Bằng chứng giao diện: [PC Builder](evidence/m4-gemini-pc-builder.jpg). Chủ key cần rotate vì key đã từng xuất hiện trong chat.

## Hạn chế và chênh lệch với đề

Google OAuth thật chưa được cấu hình. Coupon không triển khai theo quyết định nhóm. Guest checkout và form đăng ký khác nội dung đánh tím trong PDF; loyalty hiện 1% giá trị thay vì 10% ví dụ trong PDF. Đây là rủi ro tuân thủ, không thể che bằng test PASS theo rule nhóm.

Docker full stack/ES/scaling được kiểm thử trên CI Linux, không khẳng định Docker Desktop Mac đã hoạt động. Local demo chạy Node/Mongo/RabbitMQ/Mailpit/Redis native. Không tắt sandbox macOS để chạy ES.

PC metadata và ảnh là dữ liệu minh họa, chưa xác minh hãng, BIOS, connector hoặc lắp thực tế; chưa test Safari/iPhone thật hay tải production. Google, video 1080p, Rubrik.docx và bằng chứng cộng tác hai người cần hoàn tất riêng.
