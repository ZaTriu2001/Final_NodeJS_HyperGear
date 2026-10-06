import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { brands, categories, products } from '../data/products';

const PAGE_SIZE = 12;
const normalizeSearch = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi')
  .replace(/đ/g, 'd');

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [rating, setRating] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const next = {};
    if (query) next.q = query;
    if (category) next.category = category;
    setParams(next, { replace: true });
  }, [query, category, setParams]);

  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query);
    return products
      .filter((product) => !normalized || normalizeSearch(`${product.name} ${product.brand} ${product.category}`).includes(normalized))
      .filter((product) => !category || product.category === category)
      .filter((product) => !brand || product.brand === brand)
      .filter((product) => !rating || product.rating >= Number(rating))
      .filter((product) => product.variants.some((variant) =>
        (!minPrice || variant.price >= Number(minPrice)) && (!maxPrice || variant.price <= Number(maxPrice))))
      .sort((a, b) => {
        const aSoldOut = a.variants.every((variant) => variant.stock === 0);
        const bSoldOut = b.variants.every((variant) => variant.stock === 0);
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        const aPrice = Math.min(...a.variants.map((variant) => variant.price));
        const bPrice = Math.min(...b.variants.map((variant) => variant.price));
        if (sort === 'name-desc') return b.name.localeCompare(a.name, 'vi');
        if (sort === 'price-asc') return aPrice - bPrice;
        if (sort === 'price-desc') return bPrice - aPrice;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [query, category, brand, rating, minPrice, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleProducts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setQuery(''); setCategory(''); setBrand(''); setRating(''); setMinPrice(''); setMaxPrice(''); setPage(1);
  };

  return (
    <div className="page-surface">
      <div className="catalog-hero"><div className="container"><span>HYPERGEAR CATALOG</span><h1>Chọn đúng linh kiện.<br />Khai phá đúng sức mạnh.</h1></div></div>
      <div className="container py-5">
        <div className="row g-4">
          <aside className="col-lg-3">
            <div className="filter-panel">
              <div className="d-flex justify-content-between align-items-center"><h2>Bộ lọc</h2><button onClick={clearFilters}>Xóa</button></div>
              <label className="form-label">Tìm kiếm</label>
              <div className="input-icon"><i className="bi bi-search" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tên, hãng, danh mục..." /></div>
              <label className="form-label mt-4">Danh mục</label>
              <select className="form-select" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">Tất cả danh mục</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
              <label className="form-label mt-4">Thương hiệu</label>
              <select className="form-select" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1); }}><option value="">Tất cả thương hiệu</option>{brands.map((item) => <option key={item}>{item}</option>)}</select>
              <label className="form-label mt-4">Khoảng giá</label>
              <div className="row g-2"><div className="col"><input className="form-control" type="number" min="0" placeholder="Từ" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} /></div><div className="col"><input className="form-control" type="number" min="0" placeholder="Đến" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} /></div></div>
              <label className="form-label mt-4">Đánh giá</label>
              <select className="form-select" value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="4.5">Từ 4.5 sao</option><option value="4.8">Từ 4.8 sao</option></select>
            </div>
          </aside>
          <div className="col-lg-9">
            <div className="catalog-toolbar"><p><strong>{filtered.length}</strong> sản phẩm phù hợp</p><select className="form-select" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="name-asc">Tên A–Z</option><option value="name-desc">Tên Z–A</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select></div>
            {visibleProducts.length ? <div className="row g-3">{visibleProducts.map((product) => <div className="col-6 col-xl-4" key={product.id}><ProductCard product={product} /></div>)}</div> : <div className="empty-state"><i className="bi bi-search" /><h2>Không tìm thấy sản phẩm</h2><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
            <nav className="pagination-wrap" aria-label="Phân trang sản phẩm"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)}><i className="bi bi-chevron-left" /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? 'active' : ''} onClick={() => setPage(number)}>{number}</button>)}<button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><i className="bi bi-chevron-right" /></button></nav>
          </div>
        </div>
      </div>
    </div>
  );
}
