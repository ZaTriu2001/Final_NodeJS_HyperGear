export function renderEmail(event) {
  const data = event.payload;
  if (event.type === 'password.reset') return { subject: 'HyperGear — Khôi phục mật khẩu', text: 'Chào ' + data.fullName + ',\n\nĐặt lại mật khẩu tại: ' + data.resetUrl + '\nLiên kết chỉ dùng một lần và hết hạn sau 15 phút. Nếu không yêu cầu, bạn có thể bỏ qua email này.' };
  const confirmed = event.type === 'order.confirmed';
  return { subject: 'HyperGear — ' + (confirmed ? 'Đã xác nhận đơn ' : 'Biên nhận đơn ') + data.orderId,
    text: 'Chào ' + data.fullName + ',\n\n' + (confirmed ? 'Đơn hàng đã được xác nhận, đang chuẩn bị giao.' : 'Thanh toán mô phỏng thành công. Đơn đang chờ cửa hàng xác nhận.') + '\nMã đơn: ' + data.orderId + '\n' + data.lines.map(line => line.productName + ' — ' + line.variantName + ' × ' + line.quantity).join('\n') + '\nTổng thanh toán: ' + data.totalPaid.toLocaleString('vi-VN') + ' VND\nCảm ơn bạn đã chọn HyperGear.' };
}
