import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useResource } from '../lib/useResource';
import { dateTime, formatVnd } from '../lib/api';
import Feedback from '../components/Feedback';
import Pagination from '../components/Pagination';
const statusLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao' };
export default function OrdersPage() {
  const { id } = useParams(); const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || 1);
  const { data, loading, error, reload } = useResource(id ? '/orders/' + id : '/orders?page=' + page);
  return <div className="page-surface"><div className="container py-5"><div className="d-flex justify-content-between flex-wrap gap-2 mb-4"><h1>{id ? 'Chi tiết đơn hàng' : 'Lịch sử mua hàng'}</h1><button className="btn btn-outline-dark" onClick={reload}>Cập nhật trạng thái</button></div>
    {params.get('success') && <p className="alert alert-success" role="status">Mua hàng thành công! Biên nhận được gửi qua email. Cửa hàng sẽ xác nhận đơn tiếp theo.</p>}
    <Feedback loading={loading} error={error}>
      {id && data ? <div className="account-card"><p>Mã đơn: <strong>{data.id}</strong> · {dateTime(data.createdAt)}</p><p>Thanh toán: Đã thanh toán mô phỏng</p><ol className="order-timeline">{Object.entries(statusLabels).map(([status, label]) => { const entry = data.statusHistory.find(item => item.status === status); return <li key={status} className={entry ? 'done' : ''}><strong>{label}</strong><small>{entry ? dateTime(entry.at) : 'Chưa đến bước này'}</small></li>; })}</ol>{data.lines.map(line => <article key={line.sku} className="order-line"><img src={line.image} alt={line.productName} /><div><Link to={'/san-pham/' + line.slug}>{line.productName}</Link><p>{line.variantName} · SKU {line.sku}<br />{formatVnd(line.unitPrice)} × {line.quantity}</p></div><strong>{formatVnd(line.unitPrice * line.quantity)}</strong></article>)}<p>{data.shippingAddress.recipient} · {data.shippingAddress.phone}<br />{data.shippingAddress.street}, {data.shippingAddress.ward}, {data.shippingAddress.province}</p><dl className="order-totals"><dt>Tiền hàng</dt><dd>{formatVnd(data.revenue)}</dd><dt>Giảm loyalty</dt><dd>-{formatVnd(data.loyaltyDiscount)}</dd><dt>Phí giao hàng</dt><dd>{formatVnd(data.shippingFee)}</dd><dt>Tổng cộng</dt><dd>{formatVnd(data.totalPaid)}</dd><dt>Điểm tích</dt><dd>{data.earnedPoints.toLocaleString('vi-VN')}</dd></dl><Link to="/don-hang">← Lịch sử đơn hàng</Link></div> :
      data && <>{data.items.map(order => <article key={order.id} className="account-card mb-3"><div className="d-flex justify-content-between flex-wrap"><Link to={'/don-hang/' + order.id}>Đơn {order.id.slice(-8).toUpperCase()}</Link><span>{statusLabels[order.status]}</span></div><small>{dateTime(order.createdAt)}</small><ul>{order.lines.map(line => <li key={line.sku}>{line.productName} · {line.variantName} × {line.quantity}</li>)}</ul><strong>{formatVnd(order.totalPaid)}</strong></article>)}{!data.items.length && <p>Chưa có đơn hàng. <Link to="/san-pham">Khám phá sản phẩm</Link>.</p>}<Pagination page={page} totalPages={data.totalPages} onChange={page => setParams({ page })} /></>}
    </Feedback></div></div>;
}
