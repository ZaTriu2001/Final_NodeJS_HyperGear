import { Router } from 'express';
import mongoose from 'mongoose';
import { Product, Category, publicProduct } from '@hypergear/core/models';
import { auth, admin } from '@hypergear/core/http';
import { text, integer, objectId, normalize, fail } from '@hypergear/core/validation';
import { syncSearch } from './search.js';
export const adminRoutes = Router(); adminRoutes.use(auth, admin);
const regex = value => normalize(text(value, 'Từ khóa', 1, 100)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function image(value) {
  const result = text(value, 'URL ảnh', 1, 1000);
  if (!/^\/products\/[a-z\d/_-]+\.(svg|png|jpe?g|webp)$/i.test(result) && !/^https:\/\/[^\s]+$/i.test(result)) fail(400, 'Ảnh cần URL HTTPS hoặc đường dẫn /products/.');
  return result;
}
function productBody(body) {
  const name = text(body.name, 'Tên sản phẩm', 2, 160), brand = text(body.brand, 'Hãng', 1, 80), category = text(body.category, 'Danh mục', 1, 80);
  const slug = text(body.slug, 'Slug', 2, 160); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(400, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
  if (!Array.isArray(body.description) || body.description.length < 5 || body.description.length > 20) fail(400, 'Cần 5–20 dòng mô tả.');
  if (!Array.isArray(body.images) || body.images.length < 3 || body.images.length > 10) fail(400, 'Cần 3–10 ảnh.');
  if (!Array.isArray(body.variants) || body.variants.length < 2 || body.variants.length > 20) fail(400, 'Cần 2–20 phiên bản.');
  const variants = body.variants.map(v => ({ sku: text(v.sku, 'SKU', 2, 80), name: text(v.name, 'Tên phiên bản', 1, 100), price: integer(v.price, 'Giá bán', 1, 1000000000), costPrice: integer(v.costPrice, 'Giá vốn', 0, 1000000000), stock: integer(v.stock, 'Tồn kho', 0, 1000000), image: image(v.image) }));
  if (new Set(variants.map(v => v.sku)).size !== variants.length) fail(400, 'SKU không được trùng trong một sản phẩm.');
  const specs = {}; const input = body.specs ?? {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Thông số không hợp lệ.');
  for (const [key, value] of Object.entries(input)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key) || Object.keys(specs).length >= 25) fail(400, 'Tên thông số không hợp lệ.');
    if (typeof value === 'number') specs[key] = integer(value, 'Thông số ' + key, 0, 100000);
    else if (typeof value === 'boolean') specs[key] = value;
    else if (Array.isArray(value)) specs[key] = value.slice(0, 15).map(x => text(x, 'Thông số', 1, 80));
    else specs[key] = text(value, 'Thông số', 1, 120);
  }
  const shortDescription = text(body.shortDescription, 'Mô tả ngắn', 10, 400);
  return { name, slug, brand, category, shortDescription, description: body.description.map(x => text(x, 'Dòng mô tả', 5, 1000)), images: body.images.map(image), image: image(body.images[0]), variants,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(t => text(t, 'Tag', 1, 50)) : [], specs, newArrival: body.newArrival === true, active: body.active !== false,
    searchText: normalize([name, brand, category, shortDescription].join(' ')) };
}
adminRoutes.get('/products', async (req, res) => {
  const page = integer(Number(req.query.page ?? 1), 'Trang', 1, 100000); const query = {};
  if (req.query.q) query.searchText = { $regex: regex(req.query.q) };
  const [items, total] = await Promise.all([Product.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 12).limit(12), Product.countDocuments(query)]);
  res.json({ items, page, total, totalPages: Math.max(1, Math.ceil(total / 12)) });
});
adminRoutes.get('/products/:id', async (req, res) => { const product = await Product.findById(objectId(req.params.id)); if (!product) fail(404, 'Không tìm thấy sản phẩm.'); res.json(product); });
for (const method of ['post', 'put']) adminRoutes[method]('/products' + (method === 'put' ? '/:id' : ''), async (req, res) => {
  const body = productBody(req.body);
  if (!await Category.exists({ name: body.category, active: true })) fail(400, 'Danh mục không còn hoạt động.');
  let product;
  if (method === 'post') product = await Product.create(body);
  else { product = await Product.findByIdAndUpdate(objectId(req.params.id), { $set: body }, { returnDocument: 'after', runValidators: true }); if (!product) fail(404, 'Không tìm thấy sản phẩm.'); }
  syncSearch().catch(error => console.error('Search resync pending:', error.message)); res.status(method === 'post' ? 201 : 200).json(product);
});
adminRoutes.delete('/products/:id', async (req, res) => { const p = await Product.findByIdAndUpdate(objectId(req.params.id), { active: false }, { returnDocument: 'after' }); if (!p) fail(404, 'Không tìm thấy sản phẩm.'); syncSearch().catch(() => {}); res.json({ product: publicProduct(p), message: 'Đã ngừng bán; đơn cũ được giữ nguyên.' }); });
adminRoutes.get('/categories', async (_req, res) => res.json({ items: await Category.find().sort({ name: 1 }) }));
adminRoutes.post('/categories', async (req, res) => res.status(201).json(await Category.create({ name: text(req.body.name, 'Danh mục', 1, 80) })));
adminRoutes.patch('/categories/:id', async (req, res) => {
  const id = objectId(req.params.id);
  if (req.body.name === undefined && req.body.active === undefined) fail(400, 'Cần tên hoặc trạng thái danh mục.');
  const name = req.body.name === undefined ? undefined : text(req.body.name, 'Danh mục', 1, 80);
  if (req.body.active !== undefined && typeof req.body.active !== 'boolean') fail(400, 'Trạng thái danh mục không hợp lệ.');
  let category;
  await mongoose.connection.transaction(async session => {
    category = await Category.findById(id).session(session); if (!category) fail(404, 'Không tìm thấy danh mục.');
    if (req.body.active === false && await Product.exists({ category: category.name, active: true }).session(session)) fail(409, 'Chuyển/ngừng bán các sản phẩm trong danh mục trước.');
    if (name !== undefined && name !== category.name) {
      const products = await Product.find({ category: category.name }).session(session);
      for (const product of products) {
        product.category = name;
        product.searchText = normalize([product.name, product.brand, name, product.shortDescription].join(' '));
        await product.save({ session });
      }
      // Historical order lines retain their original category snapshot.
      category.name = name;
    }
    if (req.body.active !== undefined) category.active = req.body.active;
    await category.save({ session });
  });
  syncSearch().catch(() => {}); res.json(category);
});
