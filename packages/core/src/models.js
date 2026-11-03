import mongoose from 'mongoose';
const { Schema } = mongoose;
const model = (name, schema) => mongoose.models[name] ?? mongoose.model(name, schema);
const address = new Schema({ recipient: String, phone: String, street: String, ward: String, province: String, note: String, isDefault: Boolean });
export const User = model('User', new Schema({
  fullName: { type: String, required: true }, email: { type: String, unique: true, required: true }, phone: String,
  passwordHash: { type: String, select: false }, googleId: { type: String, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  addresses: { type: [address], validate: value => value.length <= 3 },
}, { timestamps: true, optimisticConcurrency: true }));
export const Session = model('Session', new Schema({
  _id: String, userId: { type: Schema.Types.ObjectId, index: true }, expiresAt: { type: Date, expires: 0 },
}));
export const PasswordReset = model('PasswordReset', new Schema({
  tokenHash: { type: String, unique: true }, userId: Schema.Types.ObjectId, expiresAt: { type: Date, expires: 0 },
}));
export const AuthAttempt = model('AuthAttempt', new Schema({ _id: String, count: Number, expiresAt: { type: Date, expires: 0 } }));
const variant = new Schema({ sku: String, name: String, price: Number, costPrice: Number, image: String, stock: Number }, { _id: false });
const productSchema = new Schema({
  name: String, slug: { type: String, unique: true }, brand: String, category: String,
  shortDescription: String, description: [String], images: [String], image: String,
  rating: { type: Number, default: 0 }, sold: { type: Number, default: 0 }, newArrival: Boolean,
  searchText: String, tags: [String], specs: Schema.Types.Mixed, variants: [variant], active: { type: Boolean, default: true },
}, { timestamps: true });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });
export const Product = model('Product', productSchema);
export const Category = model('Category', new Schema({ name: { type: String, unique: true }, active: { type: Boolean, default: true } }, { timestamps: true }));
export const Comment = model('Comment', new Schema({
  productId: { type: Schema.Types.ObjectId, index: true }, userId: Schema.Types.ObjectId,
  guestOwnerHash: { type: String, select: false }, author: String, content: String,
}, { timestamps: true, optimisticConcurrency: true }));
const ratingSchema = new Schema({ productId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId, stars: { type: Number, min: 1, max: 5 } }, { timestamps: true });
ratingSchema.index({ productId: 1, userId: 1 }, { unique: true });
export const Rating = model('Rating', ratingSchema);
const cartLine = new Schema({ productId: Schema.Types.ObjectId, sku: String, quantity: Number }, { _id: false });
export const Cart = model('Cart', new Schema({
  userId: { type: Schema.Types.ObjectId, unique: true }, lines: [cartLine], mergeIds: [String],
}, { timestamps: true, optimisticConcurrency: true }));
const orderLine = new Schema({
  productId: Schema.Types.ObjectId, slug: String, sku: String, productName: String, variantName: String,
  image: String, category: String, unitPrice: Number, unitCost: Number, quantity: Number,
}, { _id: false });
const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true }, email: String, fullName: String,
  idempotencyKey: String, requestHash: String, lines: [orderLine], shippingAddress: address,
  status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered'], default: 'pending' },
  statusHistory: [{ status: String, at: Date }], paymentStatus: { type: String, default: 'paid' },
  revenue: Number, costOfGoods: Number, loyaltyDiscount: Number, amountPaid: Number, profit: Number,
  shippingFee: Number, totalPaid: Number, usedLoyaltyPoints: Boolean, earnedPoints: Number,
}, { timestamps: true });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
export const Order = model('Order', orderSchema);
export const LoyaltyEntry = model('LoyaltyEntry', new Schema({
  userId: { type: Schema.Types.ObjectId, index: true }, orderId: { type: Schema.Types.ObjectId, unique: true },
  change: Number, balanceAfter: Number, reason: String,
}, { timestamps: true }));
export const Outbox = model('Outbox', new Schema({
  _id: String, type: String, payload: Schema.Types.Mixed, publishedAt: Date,
}, { timestamps: true }));
export const EmailDelivery = model('EmailDelivery', new Schema({
  _id: String, status: { type: String, default: 'pending' }, attempts: { type: Number, default: 0 },
  lockedUntil: Date, sentAt: Date, error: String,
}, { timestamps: true }));
export async function initModels() {
  await Promise.all(Object.values(mongoose.models).map(value => value.init()));
}
export function publicUser(user) {
  return { id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone ?? '',
    role: user.role, loyaltyPoints: user.loyaltyPoints, addresses: user.addresses,
    hasPassword: Boolean(user.passwordHash), createdAt: user.createdAt };
}
export function publicProduct(product) {
  const value = product.toObject ? product.toObject() : product;
  const { searchText, __v, ...rest } = value;
  return { ...rest, id: String(value._id), isNew: Boolean(value.newArrival), variants: value.variants.map(({ costPrice, ...variant }) => variant) };
}
export function publicOrder(order) {
  const value = order.toObject ? order.toObject() : order;
  const { costOfGoods, profit, requestHash, idempotencyKey, __v, ...rest } = value;
  return { ...rest, id: String(value._id), lines: value.lines.map(({ unitCost, ...line }) => line) };
}
