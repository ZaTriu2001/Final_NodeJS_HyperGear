import { Link } from 'react-router-dom';
export default function NotFoundPage() { return <div className="empty-state py-5 my-5"><strong className="error-code">404</strong><h1>Không tìm thấy trang</h1><Link className="btn btn-hyper" to="/">Về trang chủ</Link></div>; }

