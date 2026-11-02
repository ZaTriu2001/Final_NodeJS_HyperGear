import { useState } from 'react';
import { useResource } from '../lib/useResource';
import { api, formatVnd, dateTime } from '../lib/api';
import Feedback from '../components/Feedback';
export default function AdminPage() {
  const { data, loading, error, reload } = useResource('/orders/admin/list');
  const metrics = useResource('/orders/admin/metrics');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState('');
  const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao' };
  const next = { pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered' };
  const advance = async order => {
    setBusy(order.id); setMessage('');
    try { await api('/orders/admin/' + order.id + '/status', { method: 'PATCH', body: { status: next[order.status] } }); reload(); }
    catch (error) { setMessage(error.message); } finally { setBusy(''); }
  };
  return <div className="page-surface"><div className="container py-5"><h1>Quản trị đơn hàng</h1><p>20 đơn gần nhất.</p>
    <Feedback loading={metrics.loading} error={metrics.error}>{metrics.data && <div className="row g-3 mb-4">{[['Đơn đã thanh toán', metrics.data.orders], ['Revenue', formatVnd(metrics.data.revenue)], ['Profit', formatVnd(metrics.data.profit)]].map(([label, value]) => <div className="col-md-4" key={label}><div className="account-card"><small>{label}</small><strong className="d-block fs-4">{value}</strong></div></div>)}</div>}</Feedback>
    {message && <p role="alert" className="alert alert-danger">{message}</p>}
    <Feedback loading={loading} error={error}>{data?.items.map(order => <article className="account-card mb-3" key={order.id}><div className="d-flex justify-content-between flex-wrap gap-2"><h2 className="h5">Đơn {order.id.slice(-8).toUpperCase()}</h2><span>{labels[order.status]}</span></div><p>{order.fullName} · {order.email} · {dateTime(order.createdAt)}</p><p>{order.shippingAddress.recipient} · {order.shippingAddress.phone}<br />{order.shippingAddress.street}, {order.shippingAddress.ward}, {order.shippingAddress.province}</p><ul>{order.lines.map(line => <li key={line.sku}>{line.productName} — {line.variantName} × {line.quantity}</li>)}</ul><p>Tổng thanh toán: <strong>{formatVnd(order.totalPaid)}</strong></p>{next[order.status] && <button className="btn btn-hyper" disabled={Boolean(busy)} onClick={() => advance(order)}>Chuyển: {labels[next[order.status]]}</button>}</article>)}</Feedback>
  </div></div>;
}

