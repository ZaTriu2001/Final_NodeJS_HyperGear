import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../state/CartContext';

export default function Header() {
  const { count } = useCart();
  return (
    <>
      <div className="topbar">Miễn phí tư vấn cấu hình • Giao hàng toàn quốc • Bảo hành minh bạch</div>
      <header className="site-header sticky-top">
        <nav className="navbar navbar-expand-lg container py-3">
          <Link className="navbar-brand" to="/" aria-label="HyperGear - Trang chủ">
            <img src="/hypergear-logo.svg" alt="HyperGear" width="190" height="45" />
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Mở menu">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <div className="navbar-nav mx-auto gap-lg-3">
              <NavLink className="nav-link" to="/">Trang chủ</NavLink>
              <NavLink className="nav-link" to="/san-pham">Sản phẩm</NavLink>
              <a className="nav-link" href="/#build-pc">Build PC</a>
              <a className="nav-link" href="/#support">Hỗ trợ</a>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Link className="icon-button" to="/dang-nhap" aria-label="Tài khoản"><i className="bi bi-person" /></Link>
              <Link className="cart-button" to="/gio-hang" aria-label={`Giỏ hàng có ${count} sản phẩm`}>
                <i className="bi bi-bag" />
                <span>Giỏ hàng</span>
                {count > 0 && <b>{count}</b>}
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

