// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, CartContext } from '../state/contexts';
import { CartProvider } from '../state/CartContext';
import { readGuestCart, validQuantity, cartLine } from '../state/cart-utils';
import CheckoutPage from '../pages/CheckoutPage';
import LoginPage from '../pages/LoginPage';
import RequireAuth from '../components/RequireAuth';
import CatalogPage from '../pages/CatalogPage';
import Pagination from '../components/Pagination';
import { api } from '../lib/api';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
const response = data => Promise.resolve({ ok: true, json: async () => data });
const user = { id: 'a'.repeat(24), fullName: 'Customer', addresses: [{ _id: 'b'.repeat(24), recipient: 'Customer', phone: '0901234567', street: '123 Demo', ward: 'Demo', province: 'Hồ Chí Minh', isDefault: true }], loyaltyPoints: 1000 };
const product = { id: 'c'.repeat(24), _id: 'c'.repeat(24), slug: 'demo', name: 'Demo CPU', image: '/products/cpu.svg', variants: [{ sku: 'SKU1', name: 'Box', price: 100000, stock: 3 }] };
const item = { key: product.id + ':SKU1', product, variant: product.variants[0], quantity: 1 };
function providers(element, auth = {}, cart = {}) {
  return render(<MemoryRouter><AuthContext.Provider value={{ ready: true, user, ...auth }}><CartContext.Provider value={{ items: [item], busy: false, ...cart }}>{element}</CartContext.Provider></AuthContext.Provider></MemoryRouter>);
}
describe('cart input and persistence', () => {
  it('rejects fractional/NaN quantities and corrupt storage', () => {
    expect(validQuantity(1.5, 4)).toBe(false); expect(validQuantity(NaN, 4)).toBe(false); expect(validQuantity(5, 4)).toBe(false);
    expect(validQuantity(2, 4)).toBe(true); localStorage.setItem('hypergear-cart', '{}'); expect(readGuestCart(localStorage)).toEqual([]);
    localStorage.setItem('hypergear-cart', JSON.stringify([item, { ...item, quantity: null }])); expect(readGuestCart(localStorage)).toHaveLength(1);
    expect(cartLine(item)).toEqual({ productId: product.id, sku: 'SKU1', quantity: 1 });
  });
  it('merges guest cart once and clears local cart only after server success', async () => {
    localStorage.setItem('hypergear-cart', JSON.stringify([item]));
    const fetch = vi.fn(() => response({ items: [item] })); vi.stubGlobal('fetch', fetch);
    render(<AuthContext.Provider value={{ user, ready: true }}><CartProvider><span>cart</span></CartProvider></AuthContext.Provider>);
    await waitFor(() => expect(localStorage.getItem('hypergear-cart')).toBeNull());
    expect(fetch.mock.calls[0][0]).toBe('/api/orders/cart/merge');
    expect(JSON.parse(fetch.mock.calls[0][1].body).lines[0].productId).toBe(product.id);
  });
  it('keeps guest storage after failed merge so a retry does not lose purchases', async () => {
    localStorage.setItem('hypergear-cart', JSON.stringify([item]));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ message: 'offline' }) })));
    render(<AuthContext.Provider value={{ user, ready: true }}><CartProvider><span>cart</span></CartProvider></AuthContext.Provider>);
    await waitFor(() => expect(fetch).toHaveBeenCalled()); expect(readGuestCart(localStorage)).toHaveLength(1);
  });
});
describe('authentication and checkout UI', () => {
  it('guest can visit checkout and is asked to authenticate before payment', () => {
    providers(<CheckoutPage />, { user: null }); expect(screen.getByText('Đăng nhập để hoàn tất mua hàng')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Thanh toán mô phỏng' })).toBeNull();
  });
  it('protects admin view for a customer', () => {
    providers(<RequireAuth admin><span>secret admin</span></RequireAuth>, { user: { ...user, role: 'customer' } });
    expect(screen.queryByText('secret admin')).toBeNull(); expect(screen.getByText('Không có quyền truy cập')).toBeTruthy();
  });
  it('login submits entered credentials and displays server failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ googleEnabled: false })));
    const signIn = vi.fn().mockRejectedValue(new Error('Email hoặc mật khẩu không đúng.'));
    providers(<LoginPage />, { user: null, signIn });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('alert'); expect(signIn).toHaveBeenCalledWith('login', { email: 'a@example.com', password: 'wrong' });
  });
  it('reviews server quote and reuses idempotency key when payment response is lost', async () => {
    const quoted = { lines: [{ sku: 'SKU1', productName: 'CPU', variantName: 'Box', unitPrice: 100000, quantity: 1 }], shippingAddress: user.addresses[0], revenue: 100000, loyaltyDiscount: 0, shippingFee: 30000, totalPaid: 130000, earnedPoints: 1000, quoteHash: 'f'.repeat(64) };
    const fetchMock = vi.fn((path) => path.endsWith('/quote') ? response(quoted) : Promise.reject(new Error('Mất kết nối')));
    vi.stubGlobal('fetch', fetchMock); providers(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại đơn hàng' }));
    await screen.findByText('Kiểm tra trước khi thanh toán');
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán mô phỏng' }));
    await screen.findByText('Mất kết nối');
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán mô phỏng' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(fetchMock.mock.calls[2][1].headers['Idempotency-Key']);
  });
});
describe('catalog navigation and client error handling', () => {
  it('preserves URL filters when moving between catalog pages', async () => {
    vi.stubGlobal('fetch', vi.fn(path => response(path.includes('facets') ? { categories: ['CPU'], brands: ['AMD'] } : { items: [], total: 20, page: 1, totalPages: 2 })));
    render(<MemoryRouter initialEntries={['/san-pham?category=CPU&brand=AMD']}><Routes><Route path="/san-pham" element={<CatalogPage />} /></Routes></MemoryRouter>);
    const button = await screen.findByRole('button', { name: '2' }); fireEvent.click(button);
    await waitFor(() => expect(fetch.mock.calls.some(([path]) => path.includes('category=CPU') && path.includes('brand=AMD') && path.includes('page=2'))).toBe(true));
  });
  it('renders pagination even for one page', () => {
    render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page');
  });
  it('API keeps cookies same-origin and preserves structured errors', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ message: 'Không đủ tồn kho' }) }));
    vi.stubGlobal('fetch', fetchMock); await expect(api('/orders', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 409, message: 'Không đủ tồn kho' });
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin'); expect(fetchMock.mock.calls[0][1].headers['X-HyperGear-Client']).toBe('web');
  });
});
