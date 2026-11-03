import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { User, Session, PasswordReset, Outbox, publicUser } from '@hypergear/core/models';
import { appBase, auth, issueSession, clearSession, cookies, rateLimit, start, webOrigin } from '@hypergear/core/http';
import { address, email, phone, password, text, objectId, fail } from '@hypergear/core/validation';
import { userAdmin } from './admin.js';
const app = appBase('auth-service');
app.use('/admin', userAdmin);
const limited = rateLimit();
const hash = value => createHash('sha256').update(value).digest('hex');
const oauth = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, webOrigin + '/api/auth/google/callback');
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
app.get('/config', (_request, response) => response.json({ googleEnabled }));
app.post('/register', limited, async (request, response) => {
  const body = request.body;
  const normalizedEmail = email(body.email);
  const fullName = text(body.fullName, 'Họ và tên', 2, 100);
  const normalizedPhone = phone(body.phone);
  const shippingAddress = address(body.shippingAddress);
  const passwordHash = await bcrypt.hash(password(body.password, body.confirmPassword), 12);
  const user = await User.create({ fullName, email: normalizedEmail, phone: normalizedPhone, passwordHash, addresses: [{ ...shippingAddress, isDefault: true }] });
  await issueSession(user, response);
  response.status(201).json({ user: publicUser(user) });
});
app.post('/login', limited, async (request, response) => {
  const user = await User.findOne({ email: email(request.body.email) }).select('+passwordHash');
  if (!user?.passwordHash || typeof request.body.password !== 'string' || !(await bcrypt.compare(request.body.password, user.passwordHash))) fail(401, 'Email hoặc mật khẩu không đúng.');
  if (user.status !== 'active') fail(403, 'Tài khoản đã bị khóa.');
  await issueSession(user, response); response.json({ user: publicUser(user) });
});
app.get('/me', auth, (request, response) => response.json({ user: publicUser(request.user) }));
app.post('/logout', auth, async (request, response) => {
  await Session.deleteOne({ _id: request.sessionId }); clearSession(response); response.json({ message: 'Đã đăng xuất.' });
});
app.patch('/me', auth, async (request, response) => {
  request.user.fullName = text(request.body.fullName, 'Họ và tên', 2, 100);
  request.user.phone = phone(request.body.phone);
  await request.user.save(); response.json({ user: publicUser(request.user) });
});
app.post('/password', auth, limited, async (request, response) => {
  const user = request.user;
  if (user.passwordHash && (typeof request.body.currentPassword !== 'string' || !(await bcrypt.compare(request.body.currentPassword, user.passwordHash)))) fail(400, 'Mật khẩu hiện tại không đúng.');
  if (!user.passwordHash) fail(400, 'Tài khoản Google: hãy dùng Khôi phục mật khẩu để thiết lập mật khẩu qua email.');
  const passwordHash = await bcrypt.hash(password(request.body.password, request.body.confirmPassword), 12);
  await mongoose.connection.transaction(async session => {
    const changed = await User.updateOne({ _id: user._id, passwordHash: user.passwordHash }, { $set: { passwordHash } }, { session });
    if (!changed.matchedCount) fail(409, 'Mật khẩu đã thay đổi ở phiên khác.');
    await Session.deleteMany({ userId: user._id }, { session });
    await PasswordReset.deleteMany({ userId: user._id }, { session });
  });
  clearSession(response); response.json({ message: 'Đã đổi mật khẩu. Hãy đăng nhập lại trên các thiết bị.' });
});
app.post('/forgot-password', rateLimit(5), async (request, response) => {
  const user = await User.findOne({ email: email(request.body.email), status: 'active' });
  if (user) {
    const token = randomBytes(32).toString('hex');
    await mongoose.connection.transaction(async session => {
      await PasswordReset.deleteMany({ userId: user._id }, { session });
      await PasswordReset.create([{ tokenHash: hash(token), userId: user._id, expiresAt: new Date(Date.now() + 900000) }], { session });
      await Outbox.create([{ _id: randomUUID(), type: 'password.reset', payload: { email: user.email, fullName: user.fullName, resetUrl: webOrigin + '/khoi-phuc-mat-khau#' + token } }], { session });
    });
  }
  response.json({ message: 'Nếu email tồn tại, liên kết khôi phục sẽ được gửi và có hiệu lực 15 phút.' });
});
app.post('/reset-password', limited, async (request, response) => {
  const token = text(request.body.token, 'Token', 64, 64);
  const passwordHash = await bcrypt.hash(password(request.body.password, request.body.confirmPassword), 12);
  await mongoose.connection.transaction(async session => {
    const reset = await PasswordReset.findOneAndDelete({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }, { session });
    if (!reset) fail(400, 'Liên kết đã hết hạn hoặc đã được sử dụng.');
    const result = await User.updateOne({ _id: reset.userId, status: 'active' }, { $set: { passwordHash } }, { session });
    if (!result.matchedCount) fail(400, 'Không thể khôi phục tài khoản này.');
    await Session.deleteMany({ userId: reset.userId }, { session });
    await PasswordReset.deleteMany({ userId: reset.userId }, { session });
  });
  clearSession(response); response.json({ message: 'Đã đặt mật khẩu mới. Bạn có thể đăng nhập.' });
});
app.post('/addresses', auth, async (request, response) => {
  const user = request.user; if (user.addresses.length >= 3) fail(400, 'Chỉ được lưu tối đa 3 địa chỉ.');
  const item = address(request.body); item.isDefault = item.isDefault || user.addresses.length === 0;
  if (item.isDefault) user.addresses.forEach(value => { value.isDefault = false; });
  user.addresses.push(item); await user.save(); response.status(201).json({ user: publicUser(user) });
});
app.patch('/addresses/:id', auth, async (request, response) => {
  const user = request.user; const current = user.addresses.id(objectId(request.params.id));
  if (!current) fail(404, 'Không tìm thấy địa chỉ.');
  const updated = address(request.body);
  updated.isDefault = updated.isDefault || current.isDefault;
  if (updated.isDefault) user.addresses.forEach(value => { value.isDefault = false; });
  Object.assign(current, updated); await user.save(); response.json({ user: publicUser(user) });
});
app.delete('/addresses/:id', auth, async (request, response) => {
  const user = request.user; const current = user.addresses.id(objectId(request.params.id));
  if (!current) fail(404, 'Không tìm thấy địa chỉ.');
  user.addresses.pull(current._id);
  if (user.addresses.length && !user.addresses.some(value => value.isDefault)) user.addresses[0].isDefault = true;
  await user.save(); response.json({ user: publicUser(user) });
});
app.get('/google/start', rateLimit(30), async (_request, response) => {
  if (!googleEnabled) return response.redirect(webOrigin + '/dang-nhap?error=google-unconfigured');
  const state = randomBytes(32).toString('hex'); const nonce = randomBytes(32).toString('hex');
  const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
  const bundle = Buffer.from(JSON.stringify({ state, nonce, codeVerifier })).toString('base64url');
  response.cookie('hg_oauth', bundle, { httpOnly: true, sameSite: 'lax', secure: webOrigin.startsWith('https:'), maxAge: 600000, path: '/api/auth/google' });
  response.redirect(oauth.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, nonce, code_challenge: codeChallenge, code_challenge_method: 'S256', prompt: 'select_account' }));
});
app.get('/google/callback', async (request, response) => {
  try {
    const saved = JSON.parse(Buffer.from(cookies(request).hg_oauth ?? '', 'base64url').toString());
    response.clearCookie('hg_oauth', { path: '/api/auth/google' });
    const state = String(request.query.state ?? '');
    if (state.length !== saved.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state)) || !request.query.code) throw new Error('Invalid state');
    const { tokens } = await oauth.getToken({ code: String(request.query.code), codeVerifier: saved.codeVerifier });
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile.email_verified || profile.nonce !== saved.nonce) throw new Error('Unverified identity');
    const normalizedEmail = email(profile.email);
    let user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +googleId');
    // Only Gmail / managed Workspace email can automatically link an existing account.
    if (user && !user.googleId && !normalizedEmail.endsWith('@gmail.com') && !profile.hd) return response.redirect(webOrigin + '/dang-nhap?error=google-link-required');
    if (user?.googleId && user.googleId !== profile.sub) throw new Error('Identity mismatch');
    if (!user) user = new User({ email: normalizedEmail, fullName: profile.name || normalizedEmail.split('@')[0], phone: '', addresses: [] });
    if (user.status !== 'active') throw new Error('Blocked account');
    user.googleId = profile.sub; await user.save(); await issueSession(user, response);
    response.redirect(webOrigin + '/tai-khoan');
  } catch { response.redirect(webOrigin + '/dang-nhap?error=google-failed'); }
});
start(app, Number(process.env.PORT ?? 3001)).catch(error => { console.error(error.message); process.exit(1); });
