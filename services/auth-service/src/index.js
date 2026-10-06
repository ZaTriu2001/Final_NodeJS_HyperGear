import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret';

const addressSchema = new mongoose.Schema({
  recipient: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  ward: { type: String, required: true, trim: true },
  province: { type: String, required: true, trim: true },
  note: { type: String, default: '', trim: true, maxlength: 300 },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  addresses: {
    type: [addressSchema],
    validate: { validator: (items) => items.length <= 3, message: 'Mỗi tài khoản chỉ được lưu tối đa 3 địa chỉ.' },
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.get('/healthz', (_request, response) => {
  response.json({
    service: 'auth-service',
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    database: mongoose.connection.readyState,
  });
});

app.post('/register', async (request, response, next) => {
  try {
    const { fullName, email, phone, password, confirmPassword, shippingAddress } = request.body;
    if (!fullName || !email || !phone || !password || !confirmPassword || !shippingAddress) {
      return response.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đăng ký.' });
    }
    const requiredAddressFields = ['recipient', 'phone', 'street', 'ward', 'province'];
    if (requiredAddressFields.some((field) => !shippingAddress[field]?.trim())) {
      return response.status(400).json({ message: 'Địa chỉ cần người nhận, số điện thoại, đường, phường/xã và tỉnh/thành.' });
    }
    if (password !== confirmPassword) {
      return response.status(400).json({ message: 'Mật khẩu xác nhận không khớp.' });
    }
    if (!passwordPattern.test(password)) {
      return response.status(400).json({ message: 'Mật khẩu cần 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return response.status(409).json({ message: 'Email đã được sử dụng.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone,
      passwordHash,
      addresses: [{ ...shippingAddress, isDefault: true }],
    });
    return response.status(201).json({ id: user.id, fullName: user.fullName, email: user.email });
  } catch (error) {
    return next(error);
  }
});

app.post('/login', async (request, response, next) => {
  try {
    const email = request.body.email?.trim().toLowerCase();
    const user = email ? await User.findOne({ email }).select('+passwordHash') : null;
    if (!user || !(await bcrypt.compare(request.body.password ?? '', user.passwordHash))) {
      return response.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    if (user.status !== 'active') return response.status(403).json({ message: 'Tài khoản đã bị khóa.' });
    const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '2h' });
    return response.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Auth service encountered an unexpected error.' });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/hypergear');
  app.listen(port, () => console.log(`[auth-service] listening on port ${port}`));
}

start().catch((error) => {
  console.error('[auth-service] failed to start', error);
  process.exit(1);
});
