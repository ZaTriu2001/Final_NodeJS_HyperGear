import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatVnd } from '../lib/api';
import { useResource } from '../lib/useResource';
import Feedback from '../components/Feedback';
import { useCart } from '../state/contexts';
import Reviews from '../components/Reviews';

export default function ProductPage() {
  const { slug } = useParams();
  const { data: product, loading, error } = useResource('/catalog/products/' + encodeURIComponent(slug));
  const defaultSku = product?.variants.find((variant) => variant.stock > 0)?.sku
    ?? product?.variants[0]?.sku
    ?? '';
  const [selectedSku, setSelectedSku] = useState(defaultSku);
  const [activeImage, setActiveImage] = useState(0);
  const [liveRating, setLiveRating] = useState(null);
  const { addItem, busy } = useCart();

  if (loading || error) return <div className="container py-5"><Feedback loading={loading} error={error} /></div>;
  if (!product) return <div className="container py-5"><h1>Không tìm thấy sản phẩm</h1><Link to="/san-pham">Quay lại catalog</Link></div>;
  const variant = product.variants.find((item) => item.sku === selectedSku) ?? product.variants.find(item => item.stock > 0) ?? product.variants[0];

  return (
    <div className="page-surface product-page">
      <div className="container py-4"><div className="breadcrumb-line"><Link to="/">Trang chủ</Link><i className="bi bi-chevron-right" /><Link to="/san-pham">Sản phẩm</Link><i className="bi bi-chevron-right" /><span>{product.name}</span></div></div>
      <div className="container pb-5"><div className="row g-5">
        <div className="col-lg-6">
          <div className="detail-image"><img src={activeImage === -1 ? variant.image : product.images[activeImage]} alt={`${product.name} - ảnh ${activeImage < 0 ? "phiên bản" : activeImage + 1}`} /></div>
          <div className="thumb-row">{product.images.map((image, index) => <button key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)}><img src={image} alt={`Ảnh minh họa ${index + 1}`} /></button>)}</div>
        </div>
        <div className="col-lg-6">
          <span className="detail-category">{product.brand} • {product.category}</span>
          <h1 className="detail-title">{product.name}</h1>
          <div className="rating detail-rating"><i className="bi bi-star-fill" /> {liveRating?.productId === product.id ? liveRating.rating : product.rating} <span>• {product.sold} đã bán • SKU {variant.sku}</span></div>
          <div className="detail-price">{formatVnd(variant.price)}</div>
          <p className="detail-lead">{product.shortDescription}</p>
          <h2 className="option-title">Chọn phiên bản</h2>
          <div className="variant-options">{product.variants.map((item) => <button key={item.sku} className={variant.sku === item.sku ? 'active' : ''} disabled={item.stock === 0} onClick={() => { setSelectedSku(item.sku); setActiveImage(-1); }}><strong>{item.name}</strong><span>{formatVnd(item.price)}</span><small>{item.stock ? `Còn ${item.stock}` : 'Hết hàng'}</small></button>)}</div>
          <button className="btn btn-hyper btn-lg w-100 mt-4" disabled={!variant.stock || busy} onClick={() => addItem(product, variant)}><i className="bi bi-bag-plus me-2" aria-hidden="true" />Thêm vào giỏ hàng</button>
          <div className="stock-note"><i className="bi bi-check-circle-fill" /> Tồn kho được quản lý độc lập theo từng phiên bản.</div>
        </div>
      </div></div>
      <section className="product-description"><div className="container"><div className="row g-5"><div className="col-lg-7"><span className="section-label">CHI TIẾT SẢN PHẨM</span><h2>Hiệu năng được lựa chọn kỹ.</h2>{product.description.map((line) => <p key={line}>{line}</p>)}</div><div className="col-lg-5"><div className="account-card"><h3 className="h4">Chọn đúng phiên bản</h3><p>Mỗi SKU có giá, tồn kho và hình ảnh riêng. Xem bình luận bên dưới hoặc hỏi trợ lý để hiểu rõ vai trò linh kiện.</p><Link className="btn btn-outline-dark" to="/build-pc">Tư vấn Build PC</Link></div></div></div></div></section>
      <div className="container pb-5"><Reviews key={product.id} productId={product.id} onRating={setLiveRating}/></div>
    </div>
  );
}
