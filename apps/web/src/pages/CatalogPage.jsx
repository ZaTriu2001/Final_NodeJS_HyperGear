import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import Feedback from '../components/Feedback';
import { useResource } from '../lib/useResource';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const { data: facets } = useResource('/catalog/facets');
  const query = new URLSearchParams(params); query.set('limit', '12');
  const { data, loading, error } = useResource('/catalog/products?' + query);
  const value = key => params.get(key) ?? '';
  const change = (key, next) => {
    const updated = new URLSearchParams(params);
    if (next) updated.set(key, next); else updated.delete(key);
    if (key !== 'page') updated.set('page', '1');
    setParams(updated, { replace: key === 'q' });
  };
  return <div className="page-surface">
    <div className="catalog-hero"><div className="container"><span>HYPERGEAR CATALOG</span><h1>Chọn đúng linh kiện.<br />Khai phá đúng sức mạnh.</h1></div></div>
    <div className="container py-5"><div className="row g-4">
      <aside className="col-lg-3"><div className="filter-panel">
        <div className="d-flex justify-content-between"><h2>Bộ lọc</h2><button onClick={() => setParams({})}>Xóa</button></div>
        <label className="form-label w-100">Tìm kiếm<input className="form-control mt-2" value={value('q')} maxLength={100} onChange={event => change('q', event.target.value)} placeholder="Tên, hãng, danh mục…" /></label>
        {[['category', 'Danh mục', facets?.categories], ['brand', 'Thương hiệu', facets?.brands]].map(([key, label, options]) => <label className="form-label w-100 mt-3" key={key}>{label}<select aria-label={label} className="form-select mt-2" value={value(key)} onChange={event => change(key, event.target.value)}><option value="">Tất cả</option>{options?.map(item => <option key={item}>{item}</option>)}</select></label>)}
        <label className="form-label mt-3">Khoảng giá</label><div className="row g-2">{[['minPrice', 'Giá từ'], ['maxPrice', 'Giá đến']].map(([key, label]) => <div className="col-6" key={key}><input aria-label={label} className="form-control" type="number" min="0" step="1000" placeholder={label} value={value(key)} onChange={event => change(key, event.target.value)} /></div>)}</div>
        <label className="form-label w-100 mt-3">Đánh giá<select className="form-select mt-2" value={value('minRating')} onChange={event => change('minRating', event.target.value)}><option value="">Tất cả</option><option value="4.5">Từ 4.5 sao</option><option value="4.8">Từ 4.8 sao</option></select></label>
      </div></aside>
      <div className="col-lg-9"><div className="catalog-toolbar"><p><strong>{data?.total ?? '…'}</strong> sản phẩm phù hợp</p><select aria-label="Sắp xếp" className="form-select" value={value('sort') || 'name-asc'} onChange={event => change('sort', event.target.value)}><option value="name-asc">Tên A–Z</option><option value="name-desc">Tên Z–A</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="newest">Mới nhất</option><option value="bestselling">Bán chạy nhất</option></select></div>
        <Feedback loading={loading} error={error}>{data?.items.length ? <div className="row g-3">{data.items.map(product => <div className="col-6 col-xl-4" key={product.id}><ProductCard product={product} /></div>)}</div> : <div className="empty-state"><h2>Không tìm thấy sản phẩm</h2><p>Hãy đổi bộ lọc hoặc từ khóa.</p></div>}</Feedback>
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={page => change('page', String(page))} />}
      </div>
    </div></div>
  </div>;
}
