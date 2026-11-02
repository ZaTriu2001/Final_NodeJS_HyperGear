// Native fallback for environments without Docker; MongoDB is real, in a single-node replica set.
// Add --with-messaging to start locally installed RabbitMQ and Mailpit too.
import 'dotenv/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { startNativeInfrastructure } from './native-infra.mjs';
const messaging = process.argv.includes('--with-messaging');
const children = messaging ? await startNativeInfrastructure() : [];
let stopping = false;
const dbPath = resolve('.local/mongo'); await mkdir(dbPath, { recursive: true });
const repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: resolve('.local/mongodb-binaries') },
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ dbPath }] });
const env = { ...process.env, MONGODB_URI: repl.getUri('hypergear'), PUBLIC_ORIGIN: 'http://localhost:8080', HOST: '127.0.0.1' };
const run = (script, extra = {}, args = []) => { const child = spawn(process.execPath, [script, ...args], { env: { ...env, ...extra }, stdio: 'inherit' }); children.push(child); return child; };
const seed = run('scripts/seed.mjs'); const [code] = await once(seed, 'exit'); if (code !== 0) throw new Error('Seed failed');
run('services/auth-service/src/index.js', { PORT: '3001' });
run('services/catalog-service/src/index.js', { PORT: '3002' });
run('services/order-service/src/index.js', { PORT: '3003' });
run('services/api-gateway/src/index.js', { PORT: '3080' });
if (messaging) run('services/notification-service/src/index.js', { RABBITMQ_URL: 'amqp://guest:guest@127.0.0.1:5672', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_USER: '', SMTP_PASSWORD: '' });
run('node_modules/vite/bin/vite.js', { HYPERGEAR_LOCAL: '1' }, ['--config', 'apps/web/vite.config.js']);
console.log('Native demo: http://localhost:8080 — MongoDB persisted under .local/mongo.');
console.log(messaging ? 'RabbitMQ + Mailpit enabled: http://localhost:8025' : 'Email events remain in outbox. Use --with-messaging for local SMTP.');
console.log('Google OAuth requires credentials in .env.');
await writeFile('.local/runtime.json', JSON.stringify({ pid: process.pid, mongodbUri: env.MONGODB_URI, startedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
async function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); await repl.stop({ doCleanup: false }); process.exit(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
