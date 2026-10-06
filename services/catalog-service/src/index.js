import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';

const app = express();
const port = Number(process.env.PORT ?? 3002);

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  image: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, min: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: [String], default: [] },
  images: { type: [String], default: [] },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  sold: { type: Number, default: 0, min: 0 },
  variants: { type: [variantSchema], validate: (items) => items.length > 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ name: 'text', brand: 'text', category: 'text' });
productSchema.index({ category: 1, brand: 1, 'variants.price': 1 });
const Product = mongoose.model('Product', productSchema);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '64kb' }));

app.get('/healthz', (_request, response) => {
  response.json({ service: 'catalog-service', status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded' });
});

app.get('/products', async (request, response, next) => {
  try {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 12));
    const query = { active: true };
    if (request.query.q) query.$text = { $search: String(request.query.q) };
    if (request.query.category) query.category = request.query.category;
    if (request.query.brand) query.brand = request.query.brand;
    if (request.query.minRating) query.rating = { $gte: Number(request.query.minRating) };
    if (request.query.minPrice || request.query.maxPrice) {
      const price = {};
      if (request.query.minPrice) price.$gte = Number(request.query.minPrice);
      if (request.query.maxPrice) price.$lte = Number(request.query.maxPrice);
      query.variants = { $elemMatch: { price } };
    }
    const sortMap = {
      'name-asc': { name: 1 }, 'name-desc': { name: -1 },
      'price-asc': { 'variants.price': 1 }, 'price-desc': { 'variants.price': -1 },
    };
    const [items, total] = await Promise.all([
      Product.find(query).sort(sortMap[request.query.sort] ?? sortMap['name-asc']).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(query),
    ]);
    response.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    next(error);
  }
});

app.get('/products/:slug', async (request, response, next) => {
  try {
    const product = await Product.findOne({ slug: request.params.slug, active: true });
    if (!product) return response.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    return response.json(product);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Catalog service encountered an unexpected error.' });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/hypergear');
  app.listen(port, () => console.log(`[catalog-service] listening on port ${port}`));
}

start().catch((error) => {
  console.error('[catalog-service] failed to start', error);
  process.exit(1);
});
