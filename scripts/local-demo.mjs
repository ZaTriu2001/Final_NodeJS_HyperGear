// Native fallback; real MongoDB WiredTiger replica set, persisted in .local/mongo.
import 'dotenv/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { startNativeInfrastructure } from './native-infra.mjs';
const messaging = process.argv.includes('--with-messaging');
const children = [];
let repl; let stopping = false;
async function stop(code = 0) {
  if (stopping) return; stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  if (repl) await repl.stop({ doCleanup: false });
  process.exit(code);
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
try {
  if (messaging) children.push(...await startNativeInfrastructure());
  const dbPath = resolve('.local/mongo'); await mkdir(dbPath, { recursive: true });
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: resolve('.local/mongodb-binaries') },
    replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ dbPath }] });
  const env = { ...process.env, MONGODB_URI: repl.getUri('hypergear'), PUBLIC_ORIGIN: 'http://localhost:8080', HOST: '127.0.0.1' };
  const run = (script, extra = {}, args = [], watch = true) => {
    const child = spawn(process.execPath, [script, ...args], { env: { ...env, ...extra }, stdio: 'inherit' });
    children.push(child);
    child.on('error', error => { console.error(error.message); stop(1); });
    if (watch) child.on('exit', code => { if (!stopping) { console.error(script + ' stopped with code ' + code); stop(1); } });
    return child;
  };
  const seed = run('scripts/seed.mjs', {}, [], false);
  const [code] = await once(seed, 'exit'); if (code !== 0) throw new Error('Seed failed');
  run('services/auth-service/src/index.js', { PORT: '3001' });
  run('services/catalog-service/src/index.js', { PORT: '3002' });
  run('services/order-service/src/index.js', { PORT: '3003' });
  run('services/api-gateway/src/index.js', { PORT: '3080' });
  if (messaging) run('services/notification-service/src/index.js', { RABBITMQ_URL: 'amqp://guest:guest@127.0.0.1:5672', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_USER: '', SMTP_PASSWORD: '' });
  run('node_modules/vite/bin/vite.js', { HYPERGEAR_LOCAL: '1' }, ['--config', 'apps/web/vite.config.js']);
  await writeFile('.local/runtime.json', JSON.stringify({ pid: process.pid, mongodbUri: env.MONGODB_URI, startedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  console.log('Native demo starting: http://localhost:8080. MongoDB persisted under .local/mongo.');
  console.log(messaging ? 'RabbitMQ + Mailpit enabled: http://localhost:8025' : 'Email events remain in outbox. Use --with-messaging for local SMTP.');
  console.log('Google OAuth requires credentials in .env.');
} catch (error) { console.error(error.message); await stop(1); }
