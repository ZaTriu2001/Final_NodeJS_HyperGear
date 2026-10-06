import { Link } from 'react-router-dom';
import { formatVnd } from '../data/products';
import { useCart } from '../state/CartContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const available = product.variants.filter((variant) => variant.stock > 0);
  const defaultVariant = available[0] ?? product.variants[0];
  const fromPrice = Math.min(...product.variants.map((variant) => variant.price));
  const outOfStock = available.length === 0;

  return (
    <article className={`product-card h-100 ${outOfStock ? 'is-sold-out' : ''}`}>
      <Link className="product-image" to={`/san-pham/${product.slug}`}>
        {product.isNew && <span className="tag tag-new">Mới</span>}
        {product.sold > 200 && <span className="tag tag-hot">Bán chạy</span>}
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-body">
        <div className="product-meta">{product.brand} • {product.category}</div>
        <Link className="product-name" to={`/san-pham/${product.slug}`}>{product.name}</Link>
        <div className="rating"><i className="bi bi-star-fill" /> {product.rating} <span>({product.sold} đã bán)</span></div>
        <div className="d-flex align-items-end justify-content-between gap-2 mt-auto">
          <div><small>Từ</small><div className="product-price">{formatVnd(fromPrice)}</div></div>
          <button className="quick-add" disabled={outOfStock} onClick={() => addItem(product, defaultVariant)} aria-label={`Thêm ${product.name} vào giỏ`}>
            <i className="bi bi-plus-lg" />
          </button>
        </div>
      </div>
    </article>
  );
}

