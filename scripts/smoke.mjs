import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:8080';
const mailBase = process.env.SMOKE_MAIL_URL ?? 'http://localhost:8025';
const startedAt = Date.now();
function client() {
  let cookie = '';
  return async (path, method = 'GET', body, headers = {}) => {
    const result = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-HyperGear-Client': 'web', Cookie: cookie, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (result.headers.get('set-cookie')) cookie = result.headers.get('set-cookie').split(';')[0];
    const data = await result.json(); assert.ok(result.ok, result.status + ': ' + JSON.stringify(data)); return data;
  };
}
const customer = client(); const admin = client();
const a = await customer('/auth/login', 'POST', { email: 'customer@gmail.com', password: 'Customer@2026' });
const products = await customer('/catalog/products?category=CPU');
const product = products.items.find(p => p.variants.some(v => v.stock > 0)); assert.ok(product);
const variant = product.variants.find(v => v.stock > 0);
await customer('/orders/cart/items', 'PUT', { productId: product.id, sku: variant.sku, quantity: 1 });
const body = { addressId: a.user.addresses[0]._id, redeemPoints: 0 };
const quote = await customer('/orders/quote', 'POST', body);
const order = await customer('/orders', 'POST', { ...body, quoteHash: quote.quoteHash, paymentResult: 'success' }, { 'Idempotency-Key': randomUUID() });
assert.equal(order.paymentStatus, 'paid');
await admin('/auth/login', 'POST', { email: 'admin@gmail.com', password: 'HyperGear@2026' });
await admin('/orders/admin/' + order.id + '/status', 'PATCH', { status: 'confirmed' });
await customer('/auth/forgot-password', 'POST', { email: 'customer@gmail.com' });
let messages = [];
for (let i = 0; i < 60; i++) {
  const list = await (await fetch(mailBase + '/api/v1/messages')).json(); messages = (list.messages ?? []).filter(message => Date.parse(message.Created) >= startedAt);
  const receipt = messages.find(m => m.Subject.includes('Biên nhận') && m.Subject.includes(order.id));
  const confirmed = messages.find(m => m.Subject.includes('Đã xác nhận') && m.Subject.includes(order.id));
  const reset = messages.find(m => m.Subject.includes('Khôi phục mật khẩu'));
  if (receipt && confirmed && reset) break;
  await delay(1000);
}
assert.ok(messages.some(m => m.Subject.includes('Biên nhận') && m.Subject.includes(order.id)), 'Receipt email not delivered');
assert.ok(messages.some(m => m.Subject.includes('Đã xác nhận') && m.Subject.includes(order.id)), 'Confirmation email not delivered');
assert.ok(messages.some(m => m.Subject.includes('Khôi phục mật khẩu')), 'Reset email not delivered');
assert.equal((await customer('/orders/' + order.id)).status, 'confirmed');
console.log('PASS live smoke: catalog → login → cart → quote → simulated payment → admin confirmation → RabbitMQ → 3 SMTP emails.');
console.log('Demo order:', order.id);
