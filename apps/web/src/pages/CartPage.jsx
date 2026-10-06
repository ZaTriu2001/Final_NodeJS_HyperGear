import { Link } from 'react-router-dom';
import { formatVnd } from '../data/products';
import { useCart } from '../state/CartContext';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const shipping = items.length ? 30000 : 0;
  const loyaltyDiscount = 0;
  const total = subtotal + shipping - loyaltyDiscount;

  return (
    <div className="page-surface">
      <div className="simple-hero"><div className="container"><span>GIỎ HÀNG</span><h1>Sẵn sàng nâng cấp?</h1></div></div>
      <div className="container py-5">
        {!items.length ? <div className="empty-state"><i className="bi bi-bag" /><h2>Giỏ hàng đang trống</h2><p>Khám phá những sản phẩm phù hợp với cấu hình của bạn.</p><Link className="btn btn-hyper" to="/san-pham">Xem sản phẩm</Link></div> : <div className="row g-4">
          <div className="col-lg-8"><div className="cart-list">{items.map((item) => <article className="cart-item" key={item.key}><img src={item.product.image} alt={item.product.name} /><div className="cart-info"><strong>{item.product.name}</strong><span>{item.variant.name}</span><small>SKU: {item.variant.sku}</small></div><div className="quantity-control"><button onClick={() => updateQuantity(item.key, item.quantity - 1)}>-</button><input value={item.quantity} onChange={(event) => updateQuantity(item.key, Number(event.target.value))} aria-label={`Số lượng ${item.product.name}`} /><button onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button></div><div className="cart-price">{formatVnd(item.variant.price * item.quantity)}</div><button className="remove-button" onClick={() => removeItem(item.key)} aria-label={`Xóa ${item.product.name}`}><i className="bi bi-trash" /></button></article>)}</div></div>
          <div className="col-lg-4"><div className="cart-summary"><h2>Tóm tắt đơn hàng</h2><div><span>Tiền hàng</span><strong>{formatVnd(subtotal)}</strong></div><div><span>Thuế</span><strong>0đ</strong></div><div><span>Phí giao hàng dự kiến</span><strong>{formatVnd(shipping)}</strong></div><div><span>Giảm bằng điểm</span><strong>-{formatVnd(loyaltyDiscount)}</strong></div><hr /><div className="summary-total"><span>Tổng cộng</span><strong>{formatVnd(total)}</strong></div><button className="btn btn-hyper w-100 mt-3" disabled>Tiếp tục thanh toán</button><p className="summary-note">Checkout nhiều bước sẽ hoàn thiện trong giai đoạn 2. Khách cần đăng nhập hoặc đăng ký thành công trước bước thanh toán mô phỏng.</p></div></div>
        </div>}
      </div>
    </div>
  );
}
