import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div className="auth-page"><div className="auth-panel"><div className="auth-copy"><img src="/hypergear-logo.svg" alt="HyperGear" /><span>WELCOME BACK</span><h1>Tiếp tục hành trình<br />chinh phục hiệu năng.</h1><p>Đăng nhập để quản lý địa chỉ, theo dõi đơn hàng và sử dụng điểm thành viên.</p></div><form className="auth-form" onSubmit={(event) => event.preventDefault()}><span className="form-kicker">TÀI KHOẢN HYPERGEAR</span><h2>Đăng nhập</h2><label>Email<input type="email" placeholder="ban@example.com" required /></label><label>Mật khẩu<input type="password" placeholder="Tối thiểu 8 ký tự" required /></label><div className="d-flex justify-content-end"><button className="link-button" type="button">Quên mật khẩu?</button></div><button className="btn btn-hyper w-100" type="submit" disabled>Đăng nhập</button><div className="divider"><span>hoặc</span></div><button className="google-button" type="button" disabled><i className="bi bi-google" /> Tiếp tục với Google</button><p className="auth-switch">Chưa có tài khoản? <Link to="/dang-ky">Đăng ký</Link></p><small>Chức năng xác thực sẽ được nối với Auth Service trong giai đoạn 2.</small></form></div></div>
  );
}

