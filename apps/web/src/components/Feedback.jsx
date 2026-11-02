export default function Feedback({ loading, error, children }) {
  if (loading) return <p role="status" className="py-4">Đang tải dữ liệu…</p>;
  if (error) return <div role="alert" className="alert alert-danger">{error}</div>;
  return children;
}
