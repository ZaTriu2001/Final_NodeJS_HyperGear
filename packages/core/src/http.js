import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Session, AuthAttempt, initModels } from './models.js';
import { fail } from './validation.js';
export const webOrigin = process.env.PUBLIC_ORIGIN ?? 'http://localhost:8080';
const secret = process.env.JWT_SECRET;
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: webOrigin.startsWith('https:'), path: '/' };
export function cookies(request) {
  return Object.fromEntries((request.headers.cookie ?? '').split(';').filter(value => value.includes('=')).map(value => {
    const i = value.indexOf('='); return [value.slice(0, i).trim(), value.slice(i + 1)];
  }));
}
export function appBase(service) {
  const app = express(); app.disable('x-powered-by'); app.use(helmet()); app.use(express.json({ limit: '64kb' }));
  app.use((request, _response, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (request.headers['x-hypergear-client'] !== 'web' || (request.headers.origin && request.headers.origin !== webOrigin)) return next(Object.assign(new Error('Yêu cầu không hợp lệ (CSRF).'), { status: 403 }));
    }
    next();
  });
  app.get('/healthz', (_request, response) => response.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ service, status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded' }));
  return app;
}
export function errorHandler(error, _request, response, _next) {
  const status = error.status ?? (error.code === 11000 || error.name === 'VersionError' ? 409 : error.name === 'ValidationError' || error.type === 'entity.parse.failed' ? 400 : 500);
  if (status === 500) console.error(error.message);
  response.status(status).json({ message: status === 500 ? 'Dịch vụ tạm thời gặp lỗi. Vui lòng thử lại.' : error.code === 11000 ? 'Dữ liệu đã tồn tại. Vui lòng tải lại và thử lại.' : error.name === 'VersionError' ? 'Dữ liệu vừa thay đổi ở phiên khác. Hãy tải lại.' : error.message });
}
export async function auth(request, _response, next) {
  try {
    const token = cookies(request).hg_session;
    let claims;
    try { claims = jwt.verify(token ?? '', secret, { algorithms: ['HS256'], issuer: 'hypergear', audience: 'hypergear-web' }); }
    catch { fail(401, 'Vui lòng đăng nhập để tiếp tục.'); }
    const session = await Session.findOne({ _id: claims.jti, userId: claims.sub, expiresAt: { $gt: new Date() } });
    if (!session) fail(401, 'Phiên đăng nhập đã hết hạn.');
    const user = await User.findById(claims.sub).select('+passwordHash');
    if (!user || user.status !== 'active') fail(403, 'Tài khoản không còn hoạt động.');
    request.user = user; request.sessionId = claims.jti; next();
  } catch (error) { next(error); }
}
export function admin(request, _response, next) { if (request.user.role !== 'admin') return next(Object.assign(new Error('Bạn không có quyền quản trị.'), { status: 403 })); next(); }
export async function issueSession(user, response) {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  const id = randomUUID(); await Session.create({ _id: id, userId: user._id, expiresAt: new Date(Date.now() + 7200000) });
  response.cookie('hg_session', jwt.sign({}, secret, { subject: String(user._id), jwtid: id, issuer: 'hypergear', audience: 'hypergear-web', expiresIn: '2h' }), { ...cookieOptions, maxAge: 7200000 });
}
export const clearSession = response => response.clearCookie('hg_session', cookieOptions);
export function rateLimit(limit = 15) {
  return async (request, _response, next) => {
    try {
      // The internal gateway overwrites X-Real-IP. Auth is not published directly.
      const ip = request.headers['x-real-ip'] ?? request.ip;
      const bucket = Math.floor(Date.now() / 900000);
      const key = createHash('sha256').update(`${ip}:${request.path}:${bucket}`).digest('hex');
      const row = await AuthAttempt.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 900000) } }, { upsert: true, returnDocument: 'after' });
      if (row.count > limit) fail(429, 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút.'); next();
    } catch (error) { next(error); }
  };
}
export async function start(app, port) {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters. Run npm run demo:setup.');
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/hypergear?replicaSet=rs0');
  await initModels(); app.use(errorHandler);
  const server = app.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`Listening on ${port}`));
  process.once('SIGTERM', () => server.close(() => mongoose.disconnect().then(() => process.exit(0))));
  return server;
}
