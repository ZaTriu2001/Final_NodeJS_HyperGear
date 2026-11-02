import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
export default function RecoveryPage({ reset = false }) {
  const [token] = useState(() => window.location.hash.slice(1));
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const body = Object.fromEntries(new FormData(event.currentTarget)); const result = await api('/auth/' + (reset ? 'reset-password' : 'forgot-password'), { method: 'POST', body: { ...body, ...(reset ? { token } : {}) } }); setMessage(result.message); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  return <div className="container py-5"><form className="account-card narrow-form" onSubmit={submit}><h1 className="h3">{reset ? 'Đặt mật khẩu mới' : 'Khôi phục mật khẩu'}</h1>
    {message && <p role="status" className="alert alert-success">{message}</p>}{error && <p role="alert" className="alert alert-danger">{error}</p>}
    {reset ? <><label className="d-block mb-3">Mật khẩu mới<input className="form-control" type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label><label className="d-block mb-3">Xác nhận mật khẩu<input className="form-control" type="password" name="confirmPassword" required autoComplete="new-password" /></label><p className="small">Cần chữ hoa, chữ thường, số và ký tự đặc biệt.</p></> : <label className="d-block mb-3">Email<input className="form-control" name="email" type="email" required autoComplete="email" /></label>}
    <button className="btn btn-hyper" disabled={busy || (reset && Boolean(message))}>{reset ? 'Lưu mật khẩu' : 'Gửi liên kết khôi phục'}</button><Link className="d-block mt-3" to="/dang-nhap">Quay lại đăng nhập</Link>
  </form></div>;
}
