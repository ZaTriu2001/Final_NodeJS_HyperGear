import { Router } from 'express';
import { Order, User, publicOrder } from '@hypergear/core/models';
import { auth, admin } from '@hypergear/core/http';
import { dateWindow } from '@hypergear/core/reporting';
import { integer, objectId, fail } from '@hypergear/core/validation';
export const orderAdmin = Router(); orderAdmin.use(auth, admin);
orderAdmin.get('/list', async (req, res) => {
  const page = integer(Number(req.query.page ?? 1), 'Trang', 1, 100000), query = {};
  if (req.query.range || req.query.start || req.query.end) { const w = dateWindow(req.query); query.createdAt = { $gte: w.start, $lt: w.end }; }
  if (req.query.status) { if (!['pending', 'confirmed', 'shipping', 'delivered'].includes(req.query.status)) fail(400, 'Trạng thái không hợp lệ.'); query.status = req.query.status; }
  const [items, total] = await Promise.all([Order.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20), Order.countDocuments(query)]);
  res.json({ items: items.map(publicOrder), page, total, totalPages: Math.max(1, Math.ceil(total / 20)) });
});
orderAdmin.get('/detail/:id', async (req, res) => {
  const order = await Order.findById(objectId(req.params.id)); if (!order) fail(404, 'Không tìm thấy đơn.');
  res.json({ ...publicOrder(order), profit: order.profit, costOfGoods: order.costOfGoods });
});
orderAdmin.get('/metrics', async (req, res) => {
  const w = dateWindow(req.query); const unit = req.query.unit ?? 'month';
  if (!['year', 'quarter', 'month', 'week', 'day'].includes(unit)) fail(400, 'Đơn vị thống kê không hợp lệ.');
  const match = { paymentStatus: 'paid', createdAt: { $gte: w.start, $lt: w.end } };
  const [totals, users, newUsers, series, bestsellers, categories] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: '$revenue' }, profit: { $sum: '$profit' }, orders: { $sum: 1 }, loyaltyDiscount: { $sum: '$loyaltyDiscount' }, quantity: { $sum: { $sum: '$lines.quantity' } } } }]),
    User.countDocuments({ role: 'customer' }), User.countDocuments({ role: 'customer', createdAt: { $gte: w.start, $lt: w.end } }),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dateTrunc: { date: '$createdAt', unit, timezone: 'Asia/Ho_Chi_Minh', ...(unit === 'week' ? { startOfWeek: 'monday' } : {}) } }, orders: { $sum: 1 }, revenue: { $sum: '$revenue' }, profit: { $sum: '$profit' }, quantity: { $sum: { $sum: '$lines.quantity' } } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: match }, { $unwind: '$lines' }, { $group: { _id: '$lines.productId', name: { $last: '$lines.productName' }, quantity: { $sum: '$lines.quantity' }, revenue: { $sum: { $multiply: ['$lines.unitPrice', '$lines.quantity'] } } } }, { $sort: { quantity: -1, _id: 1 } }, { $limit: 10 }]),
    Order.aggregate([{ $match: match }, { $unwind: '$lines' }, { $lookup: { from: 'products', localField: 'lines.productId', foreignField: '_id', as: 'product' } }, { $group: { _id: { $ifNull: ['$lines.category', { $ifNull: [{ $arrayElemAt: ['$product.category', 0] }, 'Không phân loại'] }] }, quantity: { $sum: '$lines.quantity' }, revenue: { $sum: { $multiply: ['$lines.unitPrice', '$lines.quantity'] } } } }, { $sort: { quantity: -1 } }]),
  ]);
  res.json({ ...(totals[0] ?? { orders: 0, revenue: 0, profit: 0, quantity: 0, loyaltyDiscount: 0 }), users, newUsers, series: series.map(s => ({ ...s, period: s._id })), bestsellers, categories, window: w, unit });
});
