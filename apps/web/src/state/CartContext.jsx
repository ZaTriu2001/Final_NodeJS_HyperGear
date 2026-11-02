import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { CartContext, useAuth } from './contexts';
import { readGuestCart, cartLine, validQuantity } from './cart-utils';

export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [owner, setOwner] = useState(null);
  const epoch = useRef(0);
  const guest = useRef(readGuestCart(localStorage));
  const userId = user?.id;
  const identity = userId ?? 'guest';
  const pending = busy || !ready || owner !== identity;
  useEffect(() => {
    if (!ready) return;
    const generation = ++epoch.current;
    let active = true;
    const lines = guest.current.map(cartLine);
    let mergeId = localStorage.getItem('hypergear-merge-id');
    if (!mergeId) { mergeId = crypto.randomUUID(); localStorage.setItem('hypergear-merge-id', mergeId); }
    const request = userId ? (lines.length ? api('/orders/cart/merge', { method: 'POST', body: { lines, mergeId } }) : api('/orders/cart')) : api('/orders/cart/resolve', { method: 'POST', body: { lines } });
    request.then(data => {
      if (!active || epoch.current !== generation) return;
      setItems(data.items);
      setOwner(userId ?? 'guest');
      if (userId) { guest.current = []; localStorage.removeItem('hypergear-cart'); localStorage.removeItem('hypergear-merge-id'); }
      else { guest.current = data.items; localStorage.setItem('hypergear-cart', JSON.stringify(data.items)); }
      setError('');
    }).catch(error => { if (active && epoch.current === generation) { setItems([]); setError(error.message); } })
      .finally(() => { if (active && epoch.current === generation) setBusy(false); });
    return () => { active = false; };
  }, [userId, ready]);

  const apply = async operation => {
    if (pending) return false;
    const generation = epoch.current;
    setBusy(true); setError(''); setMessage('');
    try {
      const next = await operation();
      if (generation !== epoch.current) return false;
      setItems(next);
      if (!userId) { guest.current = next; localStorage.setItem('hypergear-cart', JSON.stringify(next)); localStorage.removeItem('hypergear-merge-id'); }
      setMessage('Đã cập nhật giỏ hàng.'); return true;
    } catch (error) { if (generation === epoch.current) setError(error.message); return false; }
    finally { if (generation === epoch.current) setBusy(false); }
  };
  const update = async (product, variant, quantity) => {
    if (!validQuantity(quantity, variant.stock)) throw new Error('Số lượng phải là số nguyên từ 1 đến ' + Math.min(variant.stock, 99) + '.');
    const key = product.id + ':' + variant.sku;
    if (userId) return (await api('/orders/cart/items', { method: 'PUT', body: { productId: product.id, sku: variant.sku, quantity } })).items;
    const next = items.some(item => item.key === key) ? items.map(item => item.key === key ? { ...item, quantity } : item) : [...items, { key, product, variant, quantity }];
    if (next.length > 100) throw new Error('Giỏ hàng tối đa 100 dòng.');
    const resolved = (await api('/orders/cart/resolve', { method: 'POST', body: { lines: next.map(cartLine) } })).items;
    const current = resolved.find(item => item.key === key);
    if (!current || current.variant.stock < quantity) throw new Error('Sản phẩm vừa hết hàng hoặc không đủ tồn kho.');
    return resolved;
  };
  const addItem = (product, variant) => apply(() => update(product, variant, (items.find(item => item.key === product.id + ':' + variant.sku)?.quantity ?? 0) + 1));
  const updateQuantity = (key, quantity) => apply(() => { const item = items.find(value => value.key === key); return update(item.product, item.variant, quantity); });
  const removeItem = key => apply(async () => {
    const item = items.find(value => value.key === key);
    return userId ? (await api('/orders/cart/items/' + encodeURIComponent(item.variant.sku), { method: 'DELETE' })).items : items.filter(value => value.key !== key);
  });
  const reload = async () => {
    setBusy(true); setError('');
    try {
      const data = userId ? await api('/orders/cart') : await api('/orders/cart/resolve', { method: 'POST', body: { lines: guest.current.map(cartLine) } });
      setItems(data.items); setOwner(identity);
    } catch (error) { setError(error.message); throw error; }
    finally { setBusy(false); }
  };
  return <CartContext.Provider value={{ items: owner === identity ? items : [], busy: pending, error, message, addItem, updateQuantity, removeItem, reload,
    count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0) }}>{children}</CartContext.Provider>;
}
