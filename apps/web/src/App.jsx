import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import AccountPage from './pages/AccountPage';
import RecoveryPage from './pages/RecoveryPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import RequireAuth from './components/RequireAuth';
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PcBuilderPage = lazy(() => import('./pages/PcBuilderPage'));
import { useCart } from './state/contexts';

export default function App() {
  const { message, error, reload } = useCart();
  return (
    <div className="app-shell">
      <Header />
      {(message || error) && <div className={'cart-feedback ' + (error ? 'is-error' : '')} role={error ? 'alert' : 'status'}>{error || message}{error && <button className="btn btn-sm btn-link" onClick={() => reload().catch(() => {})}>Thử lại</button>}</div>}
      <main>
        <Suspense fallback={<div className="container py-5" role="status">Đang tải trang…</div>}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/san-pham" element={<CatalogPage />} />
          <Route path="/san-pham/:slug" element={<ProductPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/dang-ky" element={<RegisterPage />} />
          <Route path="/quen-mat-khau" element={<RecoveryPage />} />
          <Route path="/khoi-phuc-mat-khau" element={<RecoveryPage key="reset" reset />} />
          <Route path="/tai-khoan" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/don-hang" element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/don-hang/:id" element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
          <Route path="/build-pc" element={<PcBuilderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense>
      </main>
      <Footer />
    </div>
  );
}

