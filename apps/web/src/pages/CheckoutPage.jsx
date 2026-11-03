import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../state/contexts';
import { api, formatVnd } from '../lib/api';
export default function CheckoutPage() {
  const { user, ready, refresh } = useAuth(); const cart = useCart(); const navigate = useNavigate();
  const [addressId, setAddressId] = useState(''); const [points, setPoints] = useState(0);
  const [step, setStep] = useState(1); const [quote, setQuote] = useState(null); const [body, setBody] = useState(null);
  const [payment, setPayment] = useState('success'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const key = useRef('');
  const chosenAddress = addressId || user?.addresses.find(item => item.isDefault)?._id || user?.addresses[0]?._id || '';
  const preview = async () => {
    setBusy(true); setError('');
    try { const body = { addressId: chosenAddress, redeemPoints: Number(points) }; const quote = await api('/orders/quote', { method: 'POST', body }); setQuote(quote); setBody(body); key.current = crypto.randomUUID(); setStep(3); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  const pay = async () => {
    setBusy(true); setError('');
    try {
      const order = await api('/orders', { method: 'POST', headers: { 'Idempotency-Key': key.current }, body: { ...body, quoteHash: quote.quoteHash, paymentResult: payment } });
      await Promise.allSettled([cart.reload(), refresh()]);
      navigate('/don-hang/' + order.id + '?success=1', { replace: true });
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  return <div className="page-surface"><div className="container py-5"><h1>Thanh toán</h1><ol className="checkout-steps">{['Địa chỉ', 'Thanh toán', 'Xác nhận'].map((name, index) => <li className={step === index + 1 ? 'active' : ''} key={name}>{index + 1}. {name}</li>)}</ol>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    {!ready ? <p>Đang kiểm tra tài khoản…</p> : !user ? <div className="account-card"><h2 className="h4">Đăng nhập để hoàn tất mua hàng</h2><p>Giỏ hàng của bạn được giữ lại và gộp vào tài khoản sau đăng nhập.</p><Link className="btn btn-hyper me-2" to="/dang-nhap?next=%2Fthanh-toan">Đăng nhập</Link><Link className="btn btn-outline-dark" to="/dang-ky?next=%2Fthanh-toan">Tạo tài khoản</Link></div> :
    <div className="account-card narrow-form">
      {step === 1 && <><h2 className="h4">Chọn địa chỉ giao hàng</h2>{user.addresses.map(item => <label className="address-card d-flex gap-3" key={item._id}><input type="radio" name="address" checked={chosenAddress === item._id} onChange={() => setAddressId(item._id)} /><span><strong>{item.recipient} · {item.phone}</strong><br />{item.street}, {item.ward}, {item.province}</span></label>)}<Link className="d-block my-3" to="/tai-khoan">Quản lý / thêm địa chỉ</Link><button className="btn btn-hyper" disabled={!chosenAddress || cart.busy || !cart.items.length} onClick={() => setStep(2)}>Tiếp tục</button>{!cart.busy && !cart.items.length && <p className="mt-3">Giỏ hàng trống. <Link to="/san-pham">Chọn sản phẩm</Link>.</p>}</>}
      {step === 2 && <><h2 className="h4">Phương thức thanh toán</h2><p>Thanh toán mô phỏng — không trừ tiền thật.</p><label className="d-block mb-3">Kết quả mô phỏng<select className="form-select" value={payment} onChange={event => setPayment(event.target.value)}><option value="success">Thành công</option><option value="failed">Thất bại (kiểm tra lại đơn)</option></select></label><label className="d-block mb-3">Dùng điểm loyalty (đang có {user.loyaltyPoints.toLocaleString('vi-VN')})<input className="form-control" type="number" min="0" max={user.loyaltyPoints} step="1" value={points} onChange={event => setPoints(event.target.value)} /></label><p className="small">Đơn dùng điểm sẽ không tích thêm điểm.</p><button className="btn btn-outline-dark me-2" onClick={() => setStep(1)}>Quay lại</button><button className="btn btn-hyper" disabled={busy} onClick={preview}>Xem lại đơn hàng</button></>}
      {step === 3 && quote && <><h2 className="h4">Kiểm tra trước khi thanh toán</h2>{quote.lines.map(line => <div className="border-bottom py-2" key={line.sku}><strong>{line.productName}</strong><small className="d-block">{line.variantName} × {line.quantity}</small>{formatVnd(line.unitPrice * line.quantity)}</div>)}<p className="mt-3">{quote.shippingAddress.recipient} · {quote.shippingAddress.phone}<br />{quote.shippingAddress.street}, {quote.shippingAddress.ward}, {quote.shippingAddress.province}</p><dl className="order-totals"><dt>Tiền hàng</dt><dd>{formatVnd(quote.revenue)}</dd><dt>Giảm bằng điểm</dt><dd>-{formatVnd(quote.loyaltyDiscount)}</dd><dt>Phí giao hàng</dt><dd>{formatVnd(quote.shippingFee)}</dd><dt>Tổng thanh toán</dt><dd><strong>{formatVnd(quote.totalPaid)}</strong></dd><dt>Điểm sẽ tích</dt><dd>{quote.earnedPoints.toLocaleString('vi-VN')}</dd></dl><button className="btn btn-outline-dark me-2" disabled={busy} onClick={() => setStep(2)}>Quay lại</button><button className="btn btn-hyper" disabled={busy} onClick={pay}>{busy ? 'Đang xử lý…' : 'Thanh toán mô phỏng'}</button></>}
    </div>}
  </div></div>;
}
