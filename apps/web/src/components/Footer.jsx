export default function Footer() {
  return (
    <footer className="site-footer" id="support">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-5">
            <img src="/hypergear-logo.svg" alt="HyperGear" width="180" />
            <p className="mt-3 text-secondary">Máy tính và linh kiện hiệu năng cao, được lựa chọn theo đúng nhu cầu và ngân sách của bạn.</p>
          </div>
          <div className="col-6 col-lg-2">
            <h3 className="footer-title">Khám phá</h3>
            <a href="/san-pham">Sản phẩm</a><a href="/#build-pc">Build PC</a><a href="/gio-hang">Giỏ hàng</a>
          </div>
          <div className="col-6 col-lg-2">
            <h3 className="footer-title">Tài khoản</h3>
            <a href="/dang-nhap">Đăng nhập</a><a href="/dang-ky">Đăng ký</a><a href="/admin">Admin demo</a>
          </div>
          <div className="col-lg-3">
            <h3 className="footer-title">Hỗ trợ</h3>
            <p className="mb-1"><i className="bi bi-telephone me-2" />1900 6868</p>
            <p><i className="bi bi-envelope me-2" />support@hypergear.vn</p>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© 2026 HyperGear. Dự án môn Phát triển ứng dụng web với Node.js.</div>
    </footer>
  );
}

