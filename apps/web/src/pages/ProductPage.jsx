import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatVnd, products } from '../data/products';
import { useCart } from '../state/CartContext';

export default function ProductPage() {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  const defaultSku = product?.variants.find((variant) => variant.stock > 0)?.sku
    ?? product?.variants[0]?.sku
    ?? '';
  const [selectedSku, setSelectedSku] = useState(defaultSku);
  const [activeImage, setActiveImage] = useState(0);
  const { addItem } = useCart();

  if (!product) return <div className="container py-5"><h1>Không tìm thấy sản phẩm</h1><Link to="/san-pham">Quay lại catalog</Link></div>;
  const variant = product.variants.find((item) => item.sku === selectedSku);

  return (
    <div className="page-surface product-page">
      <div className="container py-4"><div className="breadcrumb-line"><Link to="/">Trang chủ</Link><i className="bi bi-chevron-right" /><Link to="/san-pham">Sản phẩm</Link><i className="bi bi-chevron-right" /><span>{product.name}</span></div></div>
      <div className="container pb-5"><div className="row g-5">
        <div className="col-lg-6">
          <div className="detail-image"><img src={product.images[activeImage]} alt={`${product.name} - ảnh ${activeImage + 1}`} /></div>
          <div className="thumb-row">{product.images.map((image, index) => <button key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)}><img src={image} alt={`Ảnh minh họa ${index + 1}`} /></button>)}</div>
        </div>
        <div className="col-lg-6">
          <span className="detail-category">{product.brand} • {product.category}</span>
          <h1 className="detail-title">{product.name}</h1>
          <div className="rating detail-rating"><i className="bi bi-star-fill" /> {product.rating} <span>• {product.sold} đã bán • SKU {variant.sku}</span></div>
          <div className="detail-price">{formatVnd(variant.price)}</div>
          <p className="detail-lead">{product.shortDescription}</p>
          <h2 className="option-title">Chọn phiên bản</h2>
          <div className="variant-options">{product.variants.map((item) => <button key={item.sku} className={selectedSku === item.sku ? 'active' : ''} disabled={item.stock === 0} onClick={() => setSelectedSku(item.sku)}><strong>{item.name}</strong><span>{formatVnd(item.price)}</span><small>{item.stock ? `Còn ${item.stock}` : 'Hết hàng'}</small></button>)}</div>
          <button className="btn btn-hyper btn-lg w-100 mt-4" disabled={!variant.stock} onClick={() => addItem(product, variant)}><i className="bi bi-bag-plus me-2" />Thêm vào giỏ hàng</button>
          <div className="stock-note"><i className="bi bi-check-circle-fill" /> Tồn kho được quản lý độc lập theo từng phiên bản.</div>
        </div>
      </div></div>
      <section className="product-description"><div className="container"><div className="row g-5"><div className="col-lg-7"><span className="section-label">CHI TIẾT SẢN PHẨM</span><h2>Hiệu năng được lựa chọn kỹ.</h2>{product.description.map((line) => <p key={line}>{line}</p>)}</div><div className="col-lg-5"><div className="review-preview"><div className="review-score"><strong>{product.rating}</strong><span><i className="bi bi-star-fill" /> trên 5</span></div><h3>Đánh giá sản phẩm</h3><p>Đăng nhập để đánh giá sao. Bình luận và cập nhật thời gian thực bằng Socket.IO sẽ hoàn thiện trong giai đoạn 2.</p><button className="btn btn-outline-dark" disabled>Viết đánh giá</button></div></div></div></div></section>
    </div>
  );
}
