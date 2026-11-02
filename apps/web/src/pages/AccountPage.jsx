import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/contexts';
import { api, formatVnd, dateTime } from '../lib/api';
import { useResource } from '../lib/useResource';
import AddressFields from '../components/AddressFields';
import Feedback from '../components/Feedback';
export default function AccountPage() {
  const { user, setUser, logout } = useAuth(); const navigate = useNavigate();
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: loyalty, loading, error: ledgerError } = useResource('/orders/loyalty');
  const action = async task => {
    setBusy(true); setError(''); setMessage('');
    try { await task(); setMessage('Đã lưu thay đổi.'); } catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  const saveProfile = event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); action(async () => setUser((await api('/auth/me', { method: 'PATCH', body })).user)); };
  const changePassword = event => {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    action(async () => { await api('/auth/password', { method: 'POST', body }); setUser(null); navigate('/dang-nhap'); });
  };
  const saveAddress = event => {
    event.preventDefault();
    action(async () => { const data = await api('/auth/addresses' + (editing._id ? '/' + editing._id : ''), { method: editing._id ? 'PATCH' : 'POST', body: editing }); setUser(data.user); setEditing(null); });
  };
  return <div className="page-surface"><div className="container py-5">
    <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mb-4"><div><h1>Tài khoản của bạn</h1><p>{user.email} · {user.fullName}</p></div><div className="d-flex gap-2 flex-wrap"><Link className="btn btn-outline-dark" to="/don-hang">Đơn hàng</Link>{user.role === 'admin' && <Link className="btn btn-outline-dark" to="/admin">Quản trị đơn</Link>}<button className="btn btn-outline-danger" disabled={busy} onClick={() => action(async () => { await logout(); navigate('/'); })}>Đăng xuất</button></div></div>
    {message && <p role="status" className="alert alert-success">{message}</p>}{error && <p role="alert" className="alert alert-danger">{error}</p>}
    <div className="row g-4">
      <div className="col-lg-5"><form className="account-card" onSubmit={saveProfile}><h2 className="h4">Hồ sơ</h2><label className="d-block mb-3">Họ và tên<input name="fullName" className="form-control" defaultValue={user.fullName} required minLength={2} maxLength={100} /></label><label className="d-block mb-3">Số điện thoại<input name="phone" className="form-control" defaultValue={user.phone} type="tel" required /></label><button className="btn btn-hyper" disabled={busy}>Lưu hồ sơ</button></form>
        <form className="account-card mt-4" onSubmit={changePassword}><h2 className="h4">Đổi mật khẩu</h2>{user.hasPassword ? <>{[['currentPassword', 'Mật khẩu hiện tại'], ['password', 'Mật khẩu mới'], ['confirmPassword', 'Xác nhận mật khẩu']].map(([name, label]) => <label key={name} className="d-block mb-3">{label}<input className="form-control" type="password" name={name} autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} required /></label>)}<p className="small">Đổi mật khẩu sẽ đăng xuất tất cả phiên đang hoạt động.</p><button className="btn btn-outline-dark" disabled={busy}>Đổi mật khẩu</button></> : <p>Tài khoản Google chưa có mật khẩu. <Link to="/quen-mat-khau">Gửi email thiết lập mật khẩu</Link>.</p>}</form>
      </div>
      <div className="col-lg-7"><section className="account-card"><h2 className="h4">Địa chỉ giao hàng ({user.addresses.length}/3)</h2>
        {user.addresses.map(item => <article className="address-card" key={item._id}><strong>{item.recipient} · {item.phone}</strong>{item.isDefault && <span className="badge text-bg-dark ms-2">Mặc định</span>}<p>{item.street}, {item.ward}, {item.province}</p><p className="small">{item.note}</p><div className="d-flex gap-2"><button disabled={busy} className="btn btn-sm btn-outline-dark" onClick={() => setEditing({ ...item })}>Sửa</button><button disabled={busy} className="btn btn-sm btn-outline-danger" onClick={() => action(async () => setUser((await api('/auth/addresses/' + item._id, { method: 'DELETE' })).user))}>Xóa</button></div></article>)}
        {!editing && user.addresses.length < 3 && <button className="btn btn-outline-dark mt-3" onClick={() => setEditing({ recipient: user.fullName, phone: user.phone, province: 'Hồ Chí Minh', isDefault: !user.addresses.length })}>Thêm địa chỉ</button>}
        {editing && <form onSubmit={saveAddress} className="mt-4"><h3 className="h5">{editing._id ? 'Sửa địa chỉ' : 'Địa chỉ mới'}</h3><AddressFields value={editing} onChange={setEditing} /><button className="btn btn-hyper" disabled={busy}>Lưu địa chỉ</button><button type="button" className="btn btn-link" onClick={() => setEditing(null)}>Hủy</button></form>}
      </section>
      <section className="account-card mt-4"><h2 className="h4">Điểm loyalty: {user.loyaltyPoints.toLocaleString('vi-VN')}</h2><p>1 điểm = 1đ. Mỗi 100.000đ tiền hàng tích 1.000 điểm. Đơn đã dùng điểm không tích thêm điểm.</p><Feedback loading={loading} error={ledgerError}><ul className="list-unstyled">{loyalty?.entries.map(entry => <li className="border-top py-2" key={entry._id}><Link to={'/don-hang/' + entry.orderId}>Đơn {entry.orderId.slice(-8)}</Link> · {entry.change > 0 ? '+' : ''}{entry.change.toLocaleString('vi-VN')} điểm <small className="d-block text-secondary">{dateTime(entry.createdAt)} · Số dư {formatVnd(entry.balanceAfter)}</small></li>)}</ul>{!loyalty?.entries.length && <p>Chưa có giao dịch điểm.</p>}</Feedback></section></div>
    </div>
  </div></div>;
}
