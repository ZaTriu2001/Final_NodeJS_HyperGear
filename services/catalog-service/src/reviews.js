import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Product, Comment, Rating } from '@hypergear/core/models';
import { auth, cookies, webOrigin, rateLimit } from '@hypergear/core/http';
import { text, integer, objectId, fail } from '@hypergear/core/validation';
export function reviewRoutes(io) {
  const router = Router();
  router.use((req, res, next) => {
    if (!/^\/[a-f0-9]{24}\/(reviews|comments|rating)/i.test(req.path)) return next('router');
    let token = cookies(req).hg_guest;
    if (!/^[a-f0-9]{64}$/.test(token ?? '')) { token = randomBytes(32).toString('hex'); res.cookie('hg_guest', token, { httpOnly: true, sameSite: 'lax', secure: webOrigin.startsWith('https:'), path: '/', maxAge: 30 * 86400000 }); }
    req.guestOwnerHash = createHash('sha256').update(token).digest('hex');
    if (cookies(req).hg_session) return auth(req, res, next); next();
  });
  const productFor = async req => { const p = await Product.findOne({ _id: objectId(req.params.id), active: true }); if (!p) fail(404, 'Không tìm thấy sản phẩm.'); return p; };
  const editable = (req, c) => (req.user && String(c.userId) === req.user.id) || c.guestOwnerHash === req.guestOwnerHash;
  const publicComment = (req, c) => ({ id: c.id, author: c.author, content: c.content, createdAt: c.createdAt, updatedAt: c.updatedAt, canEdit: Boolean(editable(req, c)) });
  const notify = id => io.to('product:' + id).emit('reviews:changed', { productId: String(id) });
  router.get('/:id/reviews', async (req, res) => {
    const p = await productFor(req); const page = integer(Number(req.query.page ?? 1), 'Trang', 1, 100000);
    const [comments, total, ratingCount, mine] = await Promise.all([Comment.find({ productId: p._id }).select('+guestOwnerHash').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 10).limit(10), Comment.countDocuments({ productId: p._id }), Rating.countDocuments({ productId: p._id }), req.user ? Rating.findOne({ productId: p._id, userId: req.user._id }) : null]);
    res.json({ items: comments.map(c => publicComment(req, c)), page, totalPages: Math.max(1, Math.ceil(total / 10)), total, rating: p.rating, ratingCount, myRating: mine?.stars ?? 0 });
  });
  router.post('/:id/comments', rateLimit(30), async (req, res) => {
    const p = await productFor(req); const c = await Comment.create({ productId: p._id, userId: req.user?._id, guestOwnerHash: req.user ? undefined : req.guestOwnerHash, author: req.user?.fullName ?? text(req.body.author, 'Tên hiển thị', 2, 60), content: text(req.body.content, 'Bình luận', 2, 2000) });
    notify(p.id); res.status(201).json(publicComment(req, c));
  });
  for (const method of ['patch', 'delete']) router[method]('/:id/comments/:commentId', rateLimit(60), async (req, res) => {
    await productFor(req); const c = await Comment.findOne({ _id: objectId(req.params.commentId), productId: req.params.id }).select('+guestOwnerHash');
    if (!c || !editable(req, c)) fail(404, 'Không tìm thấy bình luận của bạn.');
    if (method === 'patch') { c.content = text(req.body.content, 'Bình luận', 2, 2000); await c.save(); } else await c.deleteOne();
    notify(req.params.id); res.json(method === 'patch' ? publicComment(req, c) : { message: 'Đã xóa bình luận.' });
  });
  router.put('/:id/rating', auth, rateLimit(60), async (req, res) => {
    const id = objectId(req.params.id), stars = integer(req.body.stars, 'Số sao', 1, 5);
    await mongoose.connection.transaction(async session => {
      const p = await Product.findOne({ _id: id, active: true }).session(session); if (!p) fail(404, 'Không tìm thấy sản phẩm.');
      await Rating.findOneAndUpdate({ productId: id, userId: req.user._id }, { stars }, { upsert: true, session, runValidators: true });
      const [result] = await Rating.aggregate([{ $match: { productId: p._id } }, { $group: { _id: null, average: { $avg: '$stars' } } }]).session(session);
      // Writes to the same product serialize concurrent votes, so the cached average cannot lose a vote.
      await Product.updateOne({ _id: id }, { $set: { rating: Math.round(result.average * 100) / 100 } }, { session });
    });
    notify(id); res.json({ stars });
  });
  return router;
}
