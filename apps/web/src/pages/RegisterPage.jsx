import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AddressFields from '../components/AddressFields';
import { useAuth } from '../state/contexts';
export default function RegisterPage() {
  const { signIn } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [address, setAddress] = useState({ province: 'Hồ Chí Minh', isDefault: true });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try { await signIn('register', { ...body, shippingAddress: address }); navigate(params.get('next') === '/thanh-toan' ? '/thanh-toan' : '/tai-khoan'); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-panel"><div className="auth-copy register-copy"><img src="/hypergear-logo.svg" alt="HyperGear" /><span>JOIN THE FORCE</span><h1>Một tài khoản.<br />Mọi đặc quyền.</h1><p>Lưu địa chỉ, theo dõi đơn hàng, tích và sử dụng điểm loyalty.</p></div>
    <form className="auth-form" onSubmit={submit}><h2>Đăng ký</h2>{error && <p className="alert alert-danger" role="alert">{error}</p>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Họ và tên<input name="fullName" minLength={2} maxLength={100} required autoComplete="name" /></label><label>Số điện thoại tài khoản<input name="phone" type="tel" required autoComplete="tel" /></label>
      <fieldset><legend className="fs-6 fw-bold">Địa chỉ giao hàng</legend><AddressFields value={address} onChange={setAddress} /></fieldset>
      <label>Mật khẩu<input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label><label>Xác nhận mật khẩu<input name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label>
      <p className="small">Mật khẩu cần chữ hoa, chữ thường, số và ký tự đặc biệt.</p><button className="btn btn-hyper" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button><p>Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p>
    </form></div></div>;
}
