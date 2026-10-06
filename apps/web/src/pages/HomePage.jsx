import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { categories, products } from '../data/products';

function ProductSection({ title, eyebrow, items, link = '/san-pham' }) {
  return (
    <section className="section-space">
      <div className="container">
        <div className="section-heading">
          <div><span>{eyebrow}</span><h2>{title}</h2></div>
          <Link to={link}>Xem tất cả <i className="bi bi-arrow-right" /></Link>
        </div>
        <div className="row g-3 g-xl-4">
          {items.slice(0, 4).map((product) => (
            <div className="col-6 col-lg-3" key={product.id}><ProductCard product={product} /></div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold);
  return (
    <>
      <section className="hero-section">
        <div className="hero-grid" />
        <div className="container position-relative">
          <div className="row align-items-center min-vh-hero">
            <div className="col-lg-7 py-5">
              <span className="hero-kicker"><i className="bi bi-lightning-charge-fill" /> BỨT PHÁ MỌI GIỚI HẠN</span>
              <h1>Sức mạnh tối đa.<br /><em>Hiệu năng khác biệt.</em></h1>
              <p>Khám phá máy tính và linh kiện chính hãng được tuyển chọn cho gaming, sáng tạo và công việc chuyên nghiệp.</p>
              <div className="d-flex flex-wrap gap-3">
                <Link className="btn btn-hyper" to="/san-pham">Khám phá sản phẩm <i className="bi bi-arrow-up-right" /></Link>
                <a className="btn btn-ghost" href="#build-pc">Tư vấn Build PC</a>
              </div>
              <div className="hero-stats">
                <div><strong>{products.length}+</strong><span>Sản phẩm preview</span></div>
                <div><strong>7</strong><span>Danh mục</span></div>
                <div><strong>4.9/5</strong><span>Đánh giá</span></div>
              </div>
            </div>
            <div className="col-lg-5 d-none d-lg-block">
              <div className="hero-machine">
                <div className="machine-glow" />
                <img src="/products/gpu.svg" alt="Linh kiện máy tính hiệu năng cao" />
                <div className="floating-card fc-one"><i className="bi bi-cpu" /><span>RTX READY<strong>Hiệu năng AI</strong></span></div>
                <div className="floating-card fc-two"><i className="bi bi-thermometer-half" /><span>TẢN NHIỆT<strong>Ổn định dài lâu</strong></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="category-strip">
        <div className="container">
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category} to={`/san-pham?category=${encodeURIComponent(category)}`}>
                <i className={`bi ${category === 'Laptop' ? 'bi-laptop' : category === 'Màn hình' ? 'bi-display' : category === 'Phụ kiện' ? 'bi-mouse' : 'bi-cpu'}`} />
                <span>{category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductSection title="Sản phẩm mới" eyebrow="VỪA CẬP BẾN" items={products.filter((product) => product.isNew)} />

      <section className="build-banner" id="build-pc">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="hero-kicker">HYPERGEAR AI BUILDER</span>
              <h2>Build PC đúng nhu cầu,<br />không lãng phí ngân sách.</h2>
              <p>Trợ lý AI sẽ phân tích mục đích sử dụng, ngân sách và độ tương thích để đề xuất cấu hình phù hợp từ sản phẩm tại HyperGear.</p>
              <button className="btn btn-light" disabled><i className="bi bi-stars me-2" />Sắp ra mắt trong giai đoạn 2</button>
            </div>
            <div className="col-lg-5"><div className="ai-orbit"><i className="bi bi-cpu-fill" /><span /><span /><span /></div></div>
          </div>
        </div>
      </section>

      <ProductSection title="Bán chạy nhất" eyebrow="LỰA CHỌN CỦA CỘNG ĐỒNG" items={bestSellers} />
      <ProductSection title="Laptop hiệu năng cao" eyebrow="LÀM VIỆC & CHIẾN GAME" items={products.filter((product) => product.category === 'Laptop')} link="/san-pham?category=Laptop" />
      <ProductSection title="Linh kiện nâng cấp" eyebrow="KHAI PHÁ SỨC MẠNH" items={products.filter((product) => ['CPU', 'GPU'].includes(product.category))} link="/san-pham?category=GPU" />

      <section className="service-band">
        <div className="container"><div className="row g-4">
          {[
            ['bi-shield-check', 'Chính hãng', 'Nguồn gốc minh bạch'],
            ['bi-truck', 'Giao toàn quốc', 'Đóng gói an toàn'],
            ['bi-arrow-repeat', 'Đổi trả rõ ràng', 'Quy trình nhanh chóng'],
            ['bi-headset', 'Tư vấn chuyên sâu', 'Hiểu đúng trước khi mua'],
          ].map(([icon, title, text]) => <div className="col-6 col-lg-3" key={title}><div className="service-item"><i className={`bi ${icon}`} /><div><strong>{title}</strong><span>{text}</span></div></div></div>)}
        </div></div>
      </section>
    </>
  );
}
