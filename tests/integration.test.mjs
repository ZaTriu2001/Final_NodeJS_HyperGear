import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { startTestStack, client } from './helpers.mjs';
import { User, Product, Order, Cart, LoyaltyEntry, Outbox, PasswordReset, AuthAttempt } from '@hypergear/core/models';
let stack; let alice; let bob; let admin; let guest; let aliceUser; let bobUser; let product; let orderId;
const address = { recipient: 'Khách kiểm thử', phone: '0901234567', street: '123 Đường Demo', ward: 'Phường Demo', province: 'Hồ Chí Minh', isDefault: true };
const registration = email => ({ email, fullName: 'Khách kiểm thử', phone: '0901234567', password: 'Testing@2026', confirmPassword: 'Testing@2026', shippingAddress: address });
before(async () => { stack = await startTestStack(); await mongoose.connect(stack.uri); alice = client(stack.urls); bob = client(stack.urls); admin = client(stack.urls); guest = client(stack.urls); });
after(async () => { await mongoose.disconnect(); if (stack) await stack.stop(); });

test('catalog reads seeded MongoDB, hides cost, filters/searches Vietnamese and paginates', async () => {
  const list = await guest('catalog', '/products'); assert.equal(list.status, 200); assert.equal(list.data.total, 42); assert.equal(list.data.items.length, 12); assert.equal(list.data.totalPages, 4);
  assert.ok(list.data.items.every(p => p.variants.every(v => v.costPrice === undefined)));
  const match = await guest('catalog', '/products?q=man%20hinh'); assert.equal(match.data.total, 8);
  const filtered = await guest('catalog', '/products?category=Laptop&brand=ASUS&maxPrice=20000000&minRating=4&sort=price-asc');
  assert.equal(filtered.data.total, 1); assert.equal(filtered.data.items[0].slug, 'asus-vivobook-15');
  assert.equal((await guest('catalog', '/products?minPrice=9&maxPrice=1')).status, 400);
  assert.equal((await guest('catalog', '/products?page=1.2')).status, 400);
  assert.equal((await guest('catalog', '/products/does-not-exist')).status, 404);
  const last = await guest('catalog', '/products?page=4'); assert.equal(last.data.items.at(-1).slug, 'razer-deathadder-v3');
  product = (await guest('catalog', '/products/amd-ryzen-5-7600')).data;
});
test('registration validation, secure cookie, login and protected endpoints', async () => {
  assert.equal((await guest('auth', '/register', 'POST', { ...registration('bad@example.com'), email: { $ne: '' } })).status, 400);
  assert.equal((await guest('auth', '/register', 'POST', { ...registration('bad@example.com'), password: 'short' })).status, 400);
  const a = await alice('auth', '/register', 'POST', registration('alice@example.com')); assert.equal(a.status, 201); aliceUser = a.data.user;
  assert.match(a.headers.get('set-cookie'), /HttpOnly/); assert.match(a.headers.get('set-cookie'), /SameSite=Lax/);
  const b = await bob('auth', '/register', 'POST', registration('bob@example.com')); assert.equal(b.status, 201); bobUser = b.data.user;
  assert.equal((await guest('auth', '/register', 'POST', registration('alice@example.com'))).status, 409);
  assert.equal((await guest('auth', '/login', 'POST', { email: 'alice@example.com', password: 'bad' })).status, 401);
  assert.equal((await guest('order', '/cart')).status, 401);
  assert.equal((await alice('order', '/admin/metrics')).status, 403);
  assert.equal((await alice('auth', '/me', 'PATCH', { fullName: 'Tên đã sửa', phone: '0907654321', role: 'admin' })).data.user.role, 'customer');
  assert.equal((await admin('auth', '/login', 'POST', { email: 'admin@gmail.com', password: 'HyperGear@2026' })).status, 200);
  const badOrigin = await alice('auth', '/me', 'PATCH', {}, { Origin: 'https://evil.example' }); assert.equal(badOrigin.status, 403);
});
test('addresses enforce limit, ownership and exactly one default', async () => {
  const second = await alice('auth', '/addresses', 'POST', { ...address, province: 'Hà Nội' }); assert.equal(second.status, 201);
  assert.equal(second.data.user.addresses.filter(a => a.isDefault).length, 1);
  assert.equal((await alice('auth', '/addresses', 'POST', { ...address, isDefault: false })).status, 201);
  assert.equal((await alice('auth', '/addresses', 'POST', address)).status, 400);
  assert.equal((await bob('auth', '/addresses/' + second.data.user.addresses[1]._id, 'DELETE')).status, 404);
  const removed = await alice('auth', '/addresses/' + second.data.user.addresses[1]._id, 'DELETE');
  assert.equal(removed.data.user.addresses.filter(a => a.isDefault).length, 1);
  aliceUser = removed.data.user;
});
test('guest cart resolves authoritative prices, account merge is idempotent, quantities validated', async () => {
  const line = { productId: product.id, sku: product.variants[0].sku, quantity: 2 };
  const guestCart = await guest('order', '/cart/resolve', 'POST', { lines: [{ ...line, unitPrice: 1 }] });
  assert.equal(guestCart.data.items[0].variant.price, product.variants[0].price);
  const body = { lines: [line], mergeId: randomUUID() };
  assert.equal((await alice('order', '/cart/merge', 'POST', body)).status, 200);
  assert.equal((await alice('order', '/cart/merge', 'POST', body)).data.items[0].quantity, 2);
  assert.equal((await alice('order', '/cart/items', 'PUT', { ...line, quantity: 1.5 })).status, 400);
  assert.equal((await alice('order', '/cart/items', 'PUT', { ...line, quantity: 99 })).status, 409);
});
test('checkout requires own address; failure does not change inventory, points or cart', async () => {
  assert.equal((await alice('order', '/quote', 'POST', { addressId: bobUser.addresses[0]._id })).status, 400);
  const quote = await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id, redeemPoints: 0 });
  assert.equal(quote.status, 200); assert.equal(quote.data.shippingFee, 30000); assert.equal(quote.data.costOfGoods, undefined);
  const result = await alice('order', '/', 'POST', { addressId: aliceUser.addresses[0]._id, redeemPoints: 0, quoteHash: quote.data.quoteHash, paymentResult: 'failed' }, { 'Idempotency-Key': randomUUID() });
  assert.equal(result.status, 402); assert.equal(await Order.countDocuments(), 0);
  assert.equal((await Product.findById(product.id)).variants[0].stock, product.variants[0].stock);
  assert.equal((await alice('order', '/cart')).data.items[0].quantity, 2);
});
test('concurrent duplicate payment creates one order, one ledger entry, one inventory decrement', async () => {
  const quote = (await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id })).data;
  const body = { addressId: aliceUser.addresses[0]._id, redeemPoints: 0, quoteHash: quote.quoteHash, paymentResult: 'success', unitPrice: 1 };
  const headers = { 'Idempotency-Key': randomUUID() };
  const results = await Promise.all([alice('order', '/', 'POST', body, headers), alice('order', '/', 'POST', body, headers)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 201]); assert.equal(results[0].data.id, results[1].data.id); orderId = results[0].data.id;
  const saved = await Order.findById(orderId);
  assert.equal(saved.revenue, product.variants[0].price * 2); assert.equal(saved.profit, saved.revenue - saved.costOfGoods);
  assert.equal(saved.totalPaid, saved.revenue + 30000); assert.equal(results[0].data.profit, undefined);
  assert.equal(await LoyaltyEntry.countDocuments({ orderId }), 1);
  assert.equal((await Product.findById(product.id)).variants[0].stock, product.variants[0].stock - 2);
  assert.equal((await alice('order', '/cart')).data.items.length, 0);
  assert.equal(await Outbox.countDocuments({ type: 'order.placed' }), 1);
});
test('customer order ownership, history and forward-only admin confirmation event', async () => {
  assert.equal((await alice('order', '/' + orderId)).status, 200);
  assert.equal((await bob('order', '/' + orderId)).status, 404);
  assert.equal((await alice('order', '/')).data.total, 1);
  assert.equal((await bob('order', '/admin/' + orderId + '/status', 'PATCH', { status: 'confirmed' })).status, 403);
  assert.equal((await admin('order', '/admin/' + orderId + '/status', 'PATCH', { status: 'shipping' })).status, 409);
  const confirmed = await admin('order', '/admin/' + orderId + '/status', 'PATCH', { status: 'confirmed' }); assert.equal(confirmed.status, 200); assert.equal(confirmed.data.statusHistory.length, 2);
  assert.equal(await Outbox.countDocuments({ type: 'order.confirmed' }), 1);
  assert.equal((await admin('order', '/admin/' + orderId + '/status', 'PATCH', { status: 'pending' })).status, 409);
});
test('loyalty redemption uses server balance and earns zero on discounted order', async () => {
  await alice('order', '/cart/items', 'PUT', { productId: product.id, sku: product.variants[0].sku, quantity: 1 });
  const before = await User.findById(aliceUser.id);
  const quote = await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id, redeemPoints: 1000 }); assert.equal(quote.status, 200); assert.equal(quote.data.earnedPoints, 0);
  assert.equal((await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id, redeemPoints: before.loyaltyPoints + 1 })).status, 400);
  const result = await alice('order', '/', 'POST', { addressId: aliceUser.addresses[0]._id, redeemPoints: 1000, quoteHash: quote.data.quoteHash, paymentResult: 'success' }, { 'Idempotency-Key': randomUUID() });
  assert.equal(result.status, 201); assert.equal(result.data.earnedPoints, 0);
  assert.equal((await User.findById(aliceUser.id)).loyaltyPoints, before.loyaltyPoints - 1000);
});
test('stale quote rejected; concurrent purchase cannot oversell last unit', async () => {
  const line = { productId: product.id, sku: product.variants[0].sku, quantity: 1 };
  await alice('order', '/cart/items', 'PUT', line);
  let quote = (await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id })).data;
  await Product.updateOne({ _id: product.id, 'variants.sku': line.sku }, { $inc: { 'variants.$.price': 1000 } });
  assert.equal((await alice('order', '/', 'POST', { addressId: aliceUser.addresses[0]._id, quoteHash: quote.quoteHash, paymentResult: 'success' }, { 'Idempotency-Key': randomUUID() })).status, 409);
  await Product.updateOne({ _id: product.id, 'variants.sku': line.sku }, { $set: { 'variants.$.stock': 1 } });
  await bob('order', '/cart/items', 'PUT', line);
  quote = (await alice('order', '/quote', 'POST', { addressId: aliceUser.addresses[0]._id })).data;
  const bquote = (await bob('order', '/quote', 'POST', { addressId: bobUser.addresses[0]._id })).data;
  const results = await Promise.all([
    alice('order', '/', 'POST', { addressId: aliceUser.addresses[0]._id, quoteHash: quote.quoteHash, paymentResult: 'success' }, { 'Idempotency-Key': randomUUID() }),
    bob('order', '/', 'POST', { addressId: bobUser.addresses[0]._id, quoteHash: bquote.quoteHash, paymentResult: 'success' }, { 'Idempotency-Key': randomUUID() }),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal((await Product.findById(product.id)).variants[0].stock, 0);
  assert.equal(await Cart.countDocuments({ 'lines.0': { $exists: true } }), 1);
});
test('blocked account invalidates existing access and password change revokes all sessions', async () => {
  await User.updateOne({ _id: bobUser.id }, { $set: { status: 'blocked' } });
  assert.equal((await bob('auth', '/me')).status, 403); assert.equal((await bob('order', '/cart')).status, 403);
  await User.updateOne({ _id: bobUser.id }, { $set: { status: 'active' } });
  const second = client(stack.urls); await second('auth', '/login', 'POST', { email: 'alice@example.com', password: 'Testing@2026' });
  assert.equal((await alice('auth', '/password', 'POST', { currentPassword: 'bad', password: 'NewPass@2026', confirmPassword: 'NewPass@2026' })).status, 400);
  assert.equal((await alice('auth', '/password', 'POST', { currentPassword: 'Testing@2026', password: 'NewPass@2026', confirmPassword: 'NewPass@2026' })).status, 200);
  assert.equal((await second('auth', '/me')).status, 401);
});
test('password reset emits email, hides account existence, expires and cannot be replayed', async () => {
  const a = await guest('auth', '/forgot-password', 'POST', { email: 'alice@example.com' });
  const b = await guest('auth', '/forgot-password', 'POST', { email: 'nobody@example.com' }); assert.deepEqual(a.data, b.data);
  const event = await Outbox.findOne({ type: 'password.reset' }).sort({ createdAt: -1 });
  const token = event.payload.resetUrl.split('#')[1];
  const reset = await PasswordReset.findOne({ userId: aliceUser.id }); assert.ok(reset.expiresAt.getTime() - Date.now() <= 900000);
  const body = { token, password: 'Recovered@2026', confirmPassword: 'Recovered@2026' };
  assert.equal((await guest('auth', '/reset-password', 'POST', body)).status, 200);
  assert.equal((await guest('auth', '/reset-password', 'POST', body)).status, 400);
  assert.equal((await alice('auth', '/login', 'POST', { email: 'alice@example.com', password: 'Recovered@2026' })).status, 200);
  await guest('auth', '/forgot-password', 'POST', { email: 'alice@example.com' });
  const expired = await Outbox.findOne({ type: 'password.reset' }).sort({ createdAt: -1 });
  await PasswordReset.updateMany({ userId: aliceUser.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await guest('auth', '/reset-password', 'POST', { ...body, token: expired.payload.resetUrl.split('#')[1] })).status, 400);
});
test('Google is explicitly unconfigured; missing state cannot sign in; rate limit is shared in MongoDB', async () => {
  assert.equal((await guest('auth', '/config')).data.googleEnabled, false);
  assert.equal((await guest('auth', '/google/start')).status, 302);
  assert.equal((await guest('auth', '/google/callback?code=fake&state=fake')).status, 302);
  await AuthAttempt.deleteMany({});
  for (let i = 0; i < 15; i++) assert.equal((await guest('auth', '/login', 'POST', { email: 'nobody@example.com', password: 'bad' })).status, 401);
  assert.equal((await guest('auth', '/login', 'POST', { email: 'nobody@example.com', password: 'bad' })).status, 429);
});
