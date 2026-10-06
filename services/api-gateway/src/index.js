import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const instance = process.env.INSTANCE_NAME ?? 'gateway-local';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

app.get('/healthz', (_request, response) => {
  response.json({ service: 'api-gateway', instance, status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/healthz', (_request, response) => {
  response.json({ service: 'api-gateway', instance, status: 'ok', timestamp: new Date().toISOString() });
});

const services = [
  ['/api/auth', process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'],
  ['/api/catalog', process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002'],
  ['/api/orders', process.env.ORDER_SERVICE_URL ?? 'http://localhost:3003'],
  ['/api/ai', process.env.AI_SERVICE_URL ?? 'http://localhost:3005'],
];

services.forEach(([route, target]) => {
  app.use(route, createProxyMiddleware({ target, changeOrigin: true, xfwd: true }));
});

app.use((_request, response) => response.status(404).json({ message: 'API route not found' }));

app.listen(port, () => {
  console.log(`[${instance}] listening on port ${port}`);
});
