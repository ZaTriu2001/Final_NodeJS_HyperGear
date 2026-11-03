import { Router } from 'express';
import mongoose from 'mongoose';
import { User, Session, PasswordReset, publicUser } from '@hypergear/core/models';
import { auth, admin } from '@hypergear/core/http';
import { text, integer, objectId, phone, email, fail } from '@hypergear/core/validation';
export const userAdmin = Router(); userAdmin.use(auth, admin);
userAdmin.get('/users', async (req, res) => {
  const page = integer(Number(req.query.page ?? 1), 'Trang', 1, 100000); const query = { role: 'customer' };
  if (req.query.q) { const q = text(req.query.q, 'Từ khóa', 1, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); query.$or = [{ email: { $regex: q, $options: 'i' } }, { fullName: { $regex: q, $options: 'i' } }]; }
  const [users, total] = await Promise.all([User.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20), User.countDocuments(query)]);
  res.json({ items: users.map(u => ({ ...publicUser(u), status: u.status })), total, page, totalPages: Math.max(1, Math.ceil(total / 20)) });
});
userAdmin.patch('/users/:id', async (req, res) => {
  let result;
  await mongoose.connection.transaction(async session => {
    const user = await User.findOne({ _id: objectId(req.params.id), role: 'customer' }).select('+googleId').session(session); if (!user) fail(404, 'Không tìm thấy khách hàng.');
    let revoke = false;
    if (req.body.fullName !== undefined) user.fullName = text(req.body.fullName, 'Họ và tên', 2, 100);
    if (req.body.phone !== undefined) user.phone = phone(req.body.phone);
    if (req.body.email !== undefined && email(req.body.email) !== user.email) {
      if (user.googleId) fail(400, 'Email đã liên kết Google không được thay đổi tại đây.');
      user.email = email(req.body.email); revoke = true;
    }
    if (req.body.status !== undefined) { if (!['active', 'blocked'].includes(req.body.status)) fail(400, 'Trạng thái không hợp lệ.'); user.status = req.body.status; if (user.status === 'blocked') revoke = true; }
    await user.save({ session });
    if (revoke) { await Session.deleteMany({ userId: user._id }, { session }); await PasswordReset.deleteMany({ userId: user._id }, { session }); }
    result = { ...publicUser(user), status: user.status };
  });
  res.json({ user: result });
});
