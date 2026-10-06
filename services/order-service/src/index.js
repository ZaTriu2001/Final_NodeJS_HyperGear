import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { calculateOrderFinancials } from './finance.js';

const app = express();
const port = Number(process.env.PORT ?? 3003);

const orderLineSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  lines: { type: [orderLineSchema], required: true },
  status: { type: String, enum: ['pending', 'paid', 'processing', 'shipping', 'completed', 'cancelled'], default: 'pending' },
  revenue: { type: Number, required: true },
  costOfGoods: { type: Number, required: true },
  loyaltyDiscount: { type: Number, default: 0 },
  amountPaid: { type: Number, required: true },
  profit: { type: Number, required: true },
  usedLoyaltyPoints: { type: Boolean, default: false },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '64kb' }));

app.get('/healthz', (_request, response) => {
  response.json({ service: 'order-service', status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded' });
});

app.post('/quote', (request, response) => {
  const lines = Array.isArray(request.body.lines) ? request.body.lines : [];
  if (!lines.length) return response.status(400).json({ message: 'Đơn hàng phải có ít nhất một sản phẩm.' });
  return response.json(calculateOrderFinancials(lines, request.body.loyaltyDiscount));
});

app.post('/', async (request, response) => {
  response.status(501).json({
    message: 'Checkout thật sẽ được triển khai ở giai đoạn 2 sau khi hoàn tất transaction tồn kho và xác thực người dùng.',
  });
});

app.get('/admin/metrics', async (_request, response, next) => {
  try {
    const [totals] = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'processing', 'shipping', 'completed'] } } },
      { $group: { _id: null, revenue: { $sum: '$revenue' }, profit: { $sum: '$profit' }, orders: { $sum: 1 } } },
    ]);
    response.json(totals ?? { revenue: 0, profit: 0, orders: 0 });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Order service encountered an unexpected error.' });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/hypergear');
  app.listen(port, () => console.log(`[order-service] listening on port ${port}`));
}

start().catch((error) => {
  console.error('[order-service] failed to start', error);
  process.exit(1);
});
