import 'dotenv/config';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Product, publicProduct } from '@hypergear/core/models';
import { appBase, start, webOrigin } from '@hypergear/core/http';
import { normalize, integer, fail } from '@hypergear/core/validation';
import { adminRoutes } from './admin.js';
import { reviewRoutes } from './reviews.js';
import { searchIds, syncSearch } from './search.js';
const app = appBase('catalog-service');
const io = new Server({ path: '/socket.io', transports: ['websocket'], cors: { origin: webOrigin }, allowRequest: (req, done) => done(null, !req.headers.origin || req.headers.origin === webOrigin) });
io.on('connection', socket => {
  socket.on('join-product', async (id, ack) => {
    if (typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id) || socket.rooms.size > 10) return;
    if (await Product.exists({ _id: id, active: true })) { await socket.join('product:' + id); if (typeof ack === 'function') ack({ joined: true }); }
  });
});
app.use('/admin', adminRoutes);
app.use('/products', reviewRoutes(io));
app.get('/facets', async (_request, response) => {
  const [categories, brands, total] = await Promise.all([Product.distinct('category', { active: true }), Product.distinct('brand', { active: true }), Product.countDocuments({ active: true })]);
  response.json({ categories, brands, total });
});
app.get('/products', async (request, response) => {
  const params = request.query;
  const page = integer(Number(params.page ?? 1), 'Trang', 1, 100000);
  const limit = integer(Number(params.limit ?? 12), 'Số sản phẩm', 1, 12);
  const query = { active: true };
  for (const key of ['q', 'category', 'brand', 'sort']) if (params[key] && (typeof params[key] !== 'string' || params[key].length > 100)) fail(400, 'Bộ lọc không hợp lệ.');
  let searchProvider = 'mongodb';
  if (params.q) {
    try { const ids = await searchIds(params.q); if (ids) { query._id = { $in: ids.filter(id => /^[a-f0-9]{24}$/.test(id)).map(id => new mongoose.Types.ObjectId(id)) }; searchProvider = 'elasticsearch'; } }
    catch { searchProvider = 'mongodb-fallback'; }
    if (!query._id) query.searchText = { $regex: normalize(params.q).replace(/[.*+?^$(){}|[\]\\]/g, '\\$&') };
  }
  if (params.category) query.category = params.category;
  if (params.brand) query.brand = params.brand;
  if (params.minRating) { const rating = Number(params.minRating); if (!Number.isFinite(rating) || rating < 0 || rating > 5) fail(400, 'Đánh giá không hợp lệ.'); query.rating = { $gte: rating }; }
  const minPrice = params.minPrice ? integer(Number(params.minPrice), 'Giá từ') : 0;
  const maxPrice = params.maxPrice ? integer(Number(params.maxPrice), 'Giá đến') : Number.MAX_SAFE_INTEGER;
  if (minPrice > maxPrice) fail(400, 'Giá từ phải nhỏ hơn hoặc bằng giá đến.');
  if (params.minPrice || params.maxPrice) query.variants = { $elemMatch: { price: { $gte: minPrice, $lte: maxPrice } } };
  const sortMap = { 'name-asc': { name: 1 }, 'name-desc': { name: -1 }, 'price-asc': { minPrice: 1 }, 'price-desc': { minPrice: -1 }, newest: { createdAt: -1 }, bestselling: { sold: -1 } };
  if (params.sort && !sortMap[params.sort]) fail(400, 'Kiểu sắp xếp không hợp lệ.');
  const [result] = await Product.aggregate([
    { $match: query }, { $addFields: { minPrice: { $min: '$variants.price' }, inStock: { $cond: [{ $gt: [{ $sum: '$variants.stock' }, 0] }, 1, 0] } } },
    { $sort: { inStock: -1, ...(sortMap[params.sort] ?? sortMap['name-asc']), _id: 1 } },
    { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { minPrice: 0, inStock: 0 } }], count: [{ $count: 'total' }] } },
  ]).collation({ locale: 'vi', strength: 1 });
  const total = result.count[0]?.total ?? 0;
  response.json({ items: result.items.map(publicProduct), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), searchProvider });
});
app.get('/products/:slug', async (request, response) => {
  const product = await Product.findOne({ slug: request.params.slug, active: true });
  if (!product) fail(404, 'Không tìm thấy sản phẩm.'); response.json(publicProduct(product));
});
start(app, Number(process.env.PORT ?? 3002)).then(async server => {
  io.attach(server);
  if (process.env.REDIS_URL) {
    const pub = createClient({ url: process.env.REDIS_URL }); const sub = pub.duplicate();
    for (const c of [pub, sub]) c.on('error', error => console.error('Redis:', error.message));
    await Promise.all([pub.connect(), sub.connect()]); io.adapter(createAdapter(pub, sub));
    process.once('SIGTERM', () => { pub.destroy(); sub.destroy(); io.close(); });
  } else process.once('SIGTERM', () => io.close());
  const sync = () => syncSearch().catch(error => console.error('Search sync pending:', error.message));
  await sync(); const timer = setInterval(sync, 5000); timer.unref();
}).catch(error => { console.error(error.message); process.exit(1); });
