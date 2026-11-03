export default function Pagination({ page, totalPages, onChange, label = 'Phân trang' }) {
  const numbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 2);
  return <nav className="pagination-wrap" aria-label={label}><button aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>{numbers.map((number, i) => <span key={number}>{i > 0 && number > numbers[i - 1] + 1 && <span>…</span>}<button aria-current={page === number ? 'page' : undefined} className={page === number ? 'active' : ''} onClick={() => onChange(number)}>{number}</button></span>)}<button aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button></nav>;
}
