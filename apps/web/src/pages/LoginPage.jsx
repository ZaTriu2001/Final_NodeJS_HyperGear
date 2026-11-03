import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../state/contexts';
import { useResource } from '../lib/useResource';
export default function LoginPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { signIn } = useAuth();
  const { data: config } = useResource('/auth/config');
  const [error, setError] = useState(params.has('error') ? 'Đăng nhập Google chưa thành công. Hãy dùng email/mật khẩu hoặc thử lại sau.' : '');
  const [busy, setBusy] = useState(false);
  const destination = params.get('next') === '/thanh-toan' ? '/thanh-toan' : '/tai-khoan';
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await signIn('login', Object.fromEntries(new FormData(event.currentTarget))); navigate(destination); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  return <div className="auth-page"><div className="auth-panel"><div className="auth-copy"><img src="/hypergear-logo.svg" alt="HyperGear" /><span>WELCOME BACK</span><h1>Tiếp tục hành trình<br />chinh phục hiệu năng.</h1><p>Quản lý địa chỉ, theo dõi đơn hàng và sử dụng điểm thành viên.</p></div>
    <form className="auth-form" onSubmit={submit}><span className="form-kicker">TÀI KHOẢN HYPERGEAR</span><h2>Đăng nhập</h2>
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required /></label>
      <Link className="text-end" to="/quen-mat-khau">Quên mật khẩu?</Link>
      <button className="btn btn-hyper w-100" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      <div className="divider"><span>hoặc</span></div>
      {config?.googleEnabled ? <a className="google-button text-center text-decoration-none" href="/api/auth/google/start"><i className="bi bi-google" /> Tiếp tục với Google</a> : <p className="small text-secondary">Đăng nhập Google chưa khả dụng. Bạn vẫn có thể đăng nhập bằng email.</p>}
      <p className="auth-switch">Chưa có tài khoản? <Link to={'/dang-ky?next=' + encodeURIComponent(destination)}>Đăng ký</Link></p>
    </form></div></div>;
}

