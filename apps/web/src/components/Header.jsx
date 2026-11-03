import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useCart, useAuth } from '../state/contexts';

export default function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <div className="topbar">Miễn phí tư vấn cấu hình • Giao hàng toàn quốc • Bảo hành minh bạch</div>
      <header className="site-header sticky-top">
        <nav className="navbar navbar-expand-lg container py-3">
          <Link className="navbar-brand" to="/" aria-label="HyperGear - Trang chủ" onClick={closeMenu}>
            <img src="/hypergear-logo.svg" alt="HyperGear" width="190" height="45" />
          </Link>
          <button className="navbar-toggler" type="button" aria-controls="mainNav" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} aria-label="Mở menu">
            <span className="navbar-toggler-icon" />
          </button>
          <div className={'collapse navbar-collapse' + (menuOpen ? ' show' : '')} id="mainNav">
            <div className="navbar-nav mx-auto gap-lg-3">
              <NavLink className="nav-link" to="/" onClick={closeMenu}>Trang chủ</NavLink>
              <NavLink className="nav-link" to="/san-pham" onClick={closeMenu}>Sản phẩm</NavLink>
              <NavLink className="nav-link" to="/build-pc" onClick={closeMenu}>Build PC</NavLink>
              <a className="nav-link" href="/#support" onClick={closeMenu}>Hỗ trợ</a>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Link className="icon-button" to={user ? "/tai-khoan" : "/dang-nhap"} aria-label="Tài khoản" onClick={closeMenu}><i className="bi bi-person" /></Link>
              <Link className="cart-button" to="/gio-hang" aria-label={`Giỏ hàng có ${count} sản phẩm`} onClick={closeMenu}>
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

