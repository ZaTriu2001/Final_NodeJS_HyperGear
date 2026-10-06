# Quyết định nghiệp vụ đã chốt

Tài liệu này ghi nhận quyết định của nhóm. Nếu mâu thuẫn với đề/rubric, phần **Rủi ro chấm điểm** nêu rõ ảnh hưởng.

## Tài khoản và checkout

- Đăng ký giữ đủ trường theo form đã thống nhất; đổi và khôi phục mật khẩu thực hiện sau khi tài khoản tồn tại.
- Khách chưa đăng nhập được xem sản phẩm, thêm/sửa giỏ hàng và đi tới checkout.
- Trước bước thanh toán, khách bắt buộc đăng ký hoặc đăng nhập thành công.
- Google OAuth dùng để đăng nhập. Nếu email Google trùng tài khoản thường thì liên kết cùng một tài khoản.
- Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
- Một khách lưu tối đa 3 địa chỉ; chỉ một địa chỉ mặc định; không lưu quận/huyện.

## Thanh toán, loyalty và lợi nhuận

- Thanh toán thành công được mô phỏng. Không tích hợp cổng thanh toán thật.
- Không tính thuế.
- Phí giao hàng: 30.000 VND tại TP.HCM, 50.000 VND tại tỉnh/thành khác.
- Không có coupon hoặc discount code. Chỉ có loyalty discount.
- Quy đổi do nhóm chốt: mỗi 100.000 VND tiền hàng tạo 1.000 point; 1 point tương đương 1 VND.
- Đơn dùng bất kỳ loyalty point nào không sinh point mới.
- `Revenue` là tổng giá bán gốc của sản phẩm trên các đơn đã thanh toán, chưa trừ loyalty discount và không cộng phí ship.
- `Amount paid = Revenue - Loyalty discount`.
- `Profit = Revenue - Loyalty discount - Cost of goods sold`, tương đương `Amount paid - Cost of goods sold`.
- Giá bán, giá vốn, tên sản phẩm, SKU và biến thể phải được snapshot vào order.

Ví dụ: sản phẩm có giá gốc 10.000.000 VND, giá vốn 7.000.000 VND, dùng 500.000 point. Revenue = 10.000.000 VND; khách trả = 9.500.000 VND; profit = 2.500.000 VND.

## Kỹ thuật

- React JavaScript + Vite + Bootstrap cho frontend.
- Node.js 24 + Express.js cho backend.
- MongoDB + Mongoose; REST API; Postman thay Swagger.
- Microservices gồm API Gateway, Auth, Catalog, Order, Notification và AI.
- RabbitMQ cho sự kiện bất đồng bộ; Redis cho cache/Socket.IO adapter ở giai đoạn sau.
- Elasticsearch cho product search; Gemini + RAG cho AI PC Builder ở giai đoạn sau.
- Docker Compose là cách triển khai bắt buộc. Nginx chạy hai API Gateway để minh chứng horizontal scaling.
- GitHub Actions chạy lint, test và build. Không dùng Husky.

## Rủi ro chấm điểm cần giữ nguyên trong mọi báo cáo

1. Đề yêu cầu **Guest Checkout** hoàn tất mua hàng mà không cần đăng nhập, còn quyết định nhóm yêu cầu tạo tài khoản trước thanh toán. Đây là khác biệt trực tiếp với đề.
2. Đề/rubric có hai tiêu chí riêng về coupon: `Using discount code when making purchase` và `Discount Management`, tổng cộng **0,5 điểm**. Không làm coupon đồng nghĩa chủ động bỏ hai mục này.
3. Trang admin chỉ được chứa các chức năng được đề cho phép. AI PC Builder thuộc phía khách hàng, không đưa vào admin.

