import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Product, User, Category, initModels } from '@hypergear/core/models';
import { normalize } from '@hypergear/core/validation';
import { products } from '../packages/core/src/demo-products.js';
import { pcProducts, pcSpecs } from '../packages/core/src/pc-data.js';
await mongoose.connect(process.env.MONGODB_URI);
await initModels();
for (const product of [...products, ...pcProducts]) {
  const { isNew, ...fields } = product;
  const row = { ...fields, newArrival: isNew, searchText: normalize(product.name + ' ' + product.brand + ' ' + product.category), active: true };
  await Product.updateOne({ slug: row.slug }, { $setOnInsert: row }, { upsert: true });
  const specs = product.specs ?? pcSpecs(product);
  if (specs) await Product.updateOne({ slug: row.slug, specs: { $exists: false } }, { $set: { specs } });
  await Category.updateOne({ name: product.category }, { $setOnInsert: { name: product.category, active: true } }, { upsert: true });
}
for (const [email, password, role, fullName] of [
  ['admin@gmail.com', process.env.ADMIN_PASSWORD ?? 'HyperGear@2026', 'admin', 'HyperGear Admin'],
  ['customer@gmail.com', process.env.CUSTOMER_PASSWORD ?? 'Customer@2026', 'customer', 'Khách hàng Demo'],
]) {
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne({ email }, { $setOnInsert: { email, passwordHash, role, fullName, phone: '0901234567', status: 'active', loyaltyPoints: 0,
    addresses: [{ recipient: fullName, phone: '0901234567', street: '123 Đường Demo', ward: 'Phường Demo', province: 'Hồ Chí Minh', isDefault: true, note: '' }] } }, { upsert: true });
}
console.log('Seed complete:', await Product.countDocuments(), 'products. Existing records were preserved.');
await mongoose.disconnect();
