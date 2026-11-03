export const cartLine = item => ({ ...(typeof item.product.id === 'string' && /^[a-f\d]{24}$/i.test(item.product.id) ? { productId: item.product.id } : { slug: item.product.slug }), sku: item.variant.sku, quantity: item.quantity });
export function readGuestCart(storage) {
  try { const items = JSON.parse(storage.getItem('hypergear-cart')); return Array.isArray(items) ? items.filter(item => item?.product?.slug && item?.variant?.sku && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99).slice(0, 100) : []; } catch { return []; }
}
export function validQuantity(value, stock) { return Number.isSafeInteger(value) && value >= 1 && value <= Math.min(stock, 99); }
