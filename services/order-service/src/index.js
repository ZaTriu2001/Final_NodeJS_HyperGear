import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Product, Cart, Order, User, LoyaltyEntry, Outbox, publicProduct, publicOrder } from '@hypergear/core/models';
import { appBase, auth, admin, start, rateLimit } from '@hypergear/core/http';
import { integer, objectId, text, shippingFee, fail } from '@hypergear/core/validation';
import { calculateOrderFinancials, calculateEarnedPoints } from './finance.js';
import { orderAdmin } from './admin.js';
const app = appBase('order-service');
app.use('/admin', orderAdmin);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length > 100) fail(400, 'Giỏ hàng không hợp lệ (tối đa 100 dòng).');
  const unique = new Map();
  for (const line of lines) {
    const sku = text(line.sku, 'SKU', 1, 80);
    const quantity = integer(line.quantity, 'Số lượng', 1, 99);
    const ref = line.productId ? { productId: objectId(line.productId) } : { slug: text(line.slug, 'Sản phẩm', 1, 150) };
    const key = (ref.productId ?? ref.slug) + ':' + sku;
    const total = (unique.get(key)?.quantity ?? 0) + quantity;
    unique.set(key, { ...ref, sku, quantity: integer(total, 'Số lượng', 1, 99) });
  }
  return [...unique.values()];
}
async function resolveLines(lines, session = null, strict = false) {
  const result = [];
  for (const line of lines) {
    const product = await Product.findOne({ ...(line.productId ? { _id: line.productId } : { slug: line.slug }), active: true }).session(session);
    const variant = product?.variants.find(value => value.sku === line.sku);
    if (!product || !variant) { if (strict) fail(409, 'Một sản phẩm đã ngừng bán. Hãy cập nhật giỏ hàng.'); continue; }
    if (strict && variant.stock < line.quantity) fail(409, product.name + ' không đủ tồn kho.');
    const safeProduct = publicProduct(product);
    result.push({ key: String(product._id) + ':' + variant.sku, product: safeProduct,
      variant: safeProduct.variants.find(value => value.sku === line.sku), quantity: line.quantity,
      ...(strict ? { unitCost: variant.costPrice } : {}) });
  }
  return result;
}
const persistedLines = items => items.map(item => ({ productId: item.product._id, sku: item.variant.sku, quantity: item.quantity }));
async function getCart(userId, session = null) {
  return await Cart.findOne({ userId }).session(session) ?? new Cart({ userId, lines: [], mergeIds: [] });
}
async function cartResponse(cart) {
  const items = await resolveLines(cart.lines);
  return { items, subtotal: items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0) };
}
app.post('/cart/resolve', rateLimit(180), async (request, response) => response.json({ items: await resolveLines(validateLines(request.body.lines)) }));
app.get('/cart', auth, async (request, response) => response.json(await cartResponse(await getCart(request.user._id))));
app.post('/cart/merge', auth, async (request, response) => {
  const incoming = validateLines(request.body.lines);
  const mergeId = text(request.body.mergeId, 'Mã gộp giỏ', 8, 100);
  let cart;
  await mongoose.connection.transaction(async session => {
    cart = await getCart(request.user._id, session);
    if (cart.mergeIds.includes(mergeId)) return;
    const available = await resolveLines(incoming, session);
    for (const item of available) {
      if (!item.variant.stock) continue;
      const found = cart.lines.find(line => String(line.productId) === item.product.id && line.sku === item.variant.sku);
      if (found) found.quantity = Math.min(found.quantity + item.quantity, item.variant.stock, 99);
      else cart.lines.push({ productId: item.product.id, sku: item.variant.sku, quantity: Math.min(item.quantity, item.variant.stock, 99) });
    }
    if (cart.lines.length > 100) fail(400, 'Giỏ hàng vượt quá 100 dòng.');
    cart.mergeIds = [...cart.mergeIds, mergeId].slice(-50);
    await cart.save({ session });
  });
  response.json(await cartResponse(cart));
});
app.put('/cart/items', auth, async (request, response) => {
  const [line] = validateLines([request.body]); const cart = await getCart(request.user._id);
  const [item] = await resolveLines([line], null, true);
  const found = cart.lines.find(value => String(value.productId) === item.product.id && value.sku === item.variant.sku);
  if (found) found.quantity = line.quantity; else cart.lines.push(...persistedLines([item]));
  if (cart.lines.length > 100) fail(400, 'Giỏ hàng vượt quá 100 dòng.');
  await cart.save(); response.json(await cartResponse(cart));
});
app.delete('/cart/items/:sku', auth, async (request, response) => {
  const cart = await getCart(request.user._id);
  cart.lines = cart.lines.filter(line => line.sku !== request.params.sku);
  await cart.save(); response.json(await cartResponse(cart));
});
async function quote(userId, body, session = null) {
  const user = await User.findOne({ _id: userId, status: 'active' }).session(session);
  if (!user) fail(403, 'Tài khoản không còn hoạt động.');
  const shippingAddress = user.addresses.id(objectId(body.addressId));
  if (!shippingAddress) fail(400, 'Hãy chọn địa chỉ giao hàng của bạn.');
  const points = integer(body.redeemPoints ?? 0, 'Điểm sử dụng');
  if (points > user.loyaltyPoints) fail(400, 'Bạn không đủ điểm loyalty.');
  const cart = await getCart(userId, session);
  if (!cart.lines.length) fail(400, 'Giỏ hàng đang trống.');
  const items = await resolveLines(cart.lines, session, true);
  const lines = items.map(item => ({ productId: item.product._id, slug: item.product.slug, sku: item.variant.sku,
    productName: item.product.name, variantName: item.variant.name, image: item.variant.image, category: item.product.category,
    unitPrice: item.variant.price, unitCost: item.unitCost, quantity: item.quantity }));
  const finances = calculateOrderFinancials(lines, points);
  if (points > finances.revenue) fail(400, 'Điểm giảm không được vượt tiền hàng.');
  const shipping = shippingFee(shippingAddress.province);
  const earnedPoints = calculateEarnedPoints(finances.revenue, points > 0);
  const summary = { lines: lines.map(({ unitCost, ...line }) => line), ...finances,
    shippingAddress: shippingAddress.toObject(), shippingFee: shipping, totalPaid: finances.amountPaid + shipping, earnedPoints };
  delete summary.costOfGoods; delete summary.profit;
  summary.quoteHash = digest(summary);
  return { user, cart, lines, finances, summary };
}
app.post('/quote', auth, async (request, response) => response.json((await quote(request.user._id, request.body)).summary));
app.post('/', auth, async (request, response) => {
  const key = text(request.headers['idempotency-key'], 'Idempotency-Key', 8, 100);
  const body = { addressId: objectId(request.body.addressId), redeemPoints: integer(request.body.redeemPoints ?? 0, 'Điểm sử dụng'), quoteHash: text(request.body.quoteHash, 'Bản xác nhận', 64, 64) };
  const requestHash = digest(body);
  const previous = await Order.findOne({ userId: request.user._id, idempotencyKey: key });
  if (previous) { if (previous.requestHash !== requestHash) fail(409, 'Mã thanh toán đã được dùng cho nội dung khác.'); return response.json(publicOrder(previous)); }
  if (request.body.paymentResult !== 'success') fail(402, 'Thanh toán mô phỏng thất bại. Giỏ hàng, điểm và tồn kho được giữ nguyên.');
  let order;
  try {
    await mongoose.connection.transaction(async session => {
      const { user, cart, lines, finances, summary } = await quote(request.user._id, body, session);
      if (body.quoteHash !== summary.quoteHash) fail(409, 'Giá, giỏ hàng hoặc địa chỉ vừa thay đổi. Hãy kiểm tra lại đơn trước khi thanh toán.');
      for (const line of lines) {
        const result = await Product.updateOne({ _id: line.productId, active: true, variants: { $elemMatch: { sku: line.sku, stock: { $gte: line.quantity }, price: line.unitPrice, costPrice: line.unitCost } } },
          { $inc: { 'variants.$.stock': -line.quantity, sold: line.quantity } }, { session });
        if (!result.modifiedCount) fail(409, 'Tồn kho hoặc giá vừa thay đổi. Hãy kiểm tra lại giỏ hàng.');
      }
      const change = summary.earnedPoints - body.redeemPoints;
      const updated = await User.findOneAndUpdate({ _id: user._id, status: 'active', loyaltyPoints: { $gte: body.redeemPoints } }, { $inc: { loyaltyPoints: change } }, { session, returnDocument: 'after' });
      if (!updated) fail(409, 'Số điểm vừa thay đổi. Hãy tải lại đơn hàng.');
      [order] = await Order.create([{ userId: user._id, email: user.email, fullName: user.fullName, idempotencyKey: key, requestHash,
        lines, ...finances, shippingAddress: summary.shippingAddress, shippingFee: summary.shippingFee, totalPaid: summary.totalPaid,
        usedLoyaltyPoints: body.redeemPoints > 0, earnedPoints: summary.earnedPoints, statusHistory: [{ status: 'pending', at: new Date() }] }], { session });
      await LoyaltyEntry.create([{ userId: user._id, orderId: order._id, change, balanceAfter: updated.loyaltyPoints, reason: body.redeemPoints > 0 ? 'redeem' : 'earn' }], { session });
      cart.lines = []; await cart.save({ session });
      await Outbox.create([{ _id: randomUUID(), type: 'order.placed', payload: { email: user.email, fullName: user.fullName, orderId: String(order._id), totalPaid: order.totalPaid, lines: summary.lines } }], { session });
    });
  } catch (error) {
    // A concurrent retry may already have committed with this key.
    const existing = await Order.findOne({ userId: request.user._id, idempotencyKey: key, requestHash });
    if (existing) return response.json(publicOrder(existing)); throw error;
  }
  response.status(201).json(publicOrder(order));
});
app.get('/', auth, async (request, response) => {
  const page = integer(Number(request.query.page ?? 1), 'Trang', 1, 100000);
  const query = { userId: request.user._id };
  const [items, total] = await Promise.all([Order.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 10).limit(10), Order.countDocuments(query)]);
  response.json({ items: items.map(publicOrder), page, total, totalPages: Math.max(1, Math.ceil(total / 10)) });
});
app.get('/loyalty', auth, async (request, response) => {
  const entries = await LoyaltyEntry.find({ userId: request.user._id }).sort({ createdAt: -1 }).limit(50);
  response.json({ balance: request.user.loyaltyPoints, entries });
});
app.patch('/admin/:id/status', auth, admin, async (request, response) => {
  const id = objectId(request.params.id); const statuses = ['pending', 'confirmed', 'shipping', 'delivered'];
  let order;
  await mongoose.connection.transaction(async session => {
    order = await Order.findById(id).session(session); if (!order) fail(404, 'Không tìm thấy đơn.');
    if (statuses[statuses.indexOf(order.status) + 1] !== request.body.status) fail(409, 'Chỉ được chuyển sang trạng thái kế tiếp.');
    order.status = request.body.status; order.statusHistory.push({ status: order.status, at: new Date() }); await order.save({ session });
    if (order.status === 'confirmed') await Outbox.create([{ _id: randomUUID(), type: 'order.confirmed', payload: { email: order.email, fullName: order.fullName, orderId: order.id, totalPaid: order.totalPaid, lines: publicOrder(order).lines } }], { session });
  });
  response.json(publicOrder(order));
});
app.get('/:id', auth, async (request, response) => {
  const order = await Order.findOne({ _id: objectId(request.params.id), userId: request.user._id });
  if (!order) fail(404, 'Không tìm thấy đơn hàng.'); response.json(publicOrder(order));
});
start(app, Number(process.env.PORT ?? 3003)).catch(error => { console.error(error.message); process.exit(1); });
