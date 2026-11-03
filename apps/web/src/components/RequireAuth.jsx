import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/contexts';
export default function RequireAuth({ children, admin = false }) {
  const { user, ready, error } = useAuth(); const location = useLocation();
  if (!ready) return <p className="container py-5" role="status">Đang kiểm tra tài khoản…</p>;
  if (!user) return <Navigate replace to={'/dang-nhap?next=' + encodeURIComponent(location.pathname)} />;
  if (admin && user.role !== 'admin') return <div className="container py-5"><h1>Không có quyền truy cập</h1></div>;
  return <>{error && <p role="alert">{error}</p>}{children}</>;
}
