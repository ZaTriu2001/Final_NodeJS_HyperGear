// Native fallback; real MongoDB WiredTiger replica set, persisted in .local/mongo.
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { assertPortsAvailable, startNativeInfrastructure } from './native-infra.mjs';
const messaging = process.argv.includes('--with-messaging');
const production = process.argv.includes('--production');
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
  await mkdir('.local', { recursive: true });
  // A persisted replica set retains its host:port; never choose a new random port on restart.
  const portFile = '.local/mongo-port';
  let mongoPort;
  try { mongoPort = Number(await readFile(portFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; mongoPort = 27018; await writeFile(portFile, String(mongoPort)); }
  if (!Number.isInteger(mongoPort) || mongoPort < 1024 || mongoPort > 65535) throw new Error('Invalid .local/mongo-port');
  await assertPortsAvailable([mongoPort, 3001, 3002, 3003, 3005, 3080, 8080]);
  if (messaging) children.push(...await startNativeInfrastructure());
  const dbPath = resolve('.local/mongo'); await mkdir(dbPath, { recursive: true });
  repl = await MongoMemoryServer.create({ binary: { version: '8.0.16', downloadDir: resolve('.local/mongodb-binaries') },
    instance: { dbPath, port: mongoPort, ip: '127.0.0.1', replSet: 'rs0', storageEngine: 'wiredTiger' } });
  const client = new mongoose.mongo.MongoClient(repl.getUri(), { directConnection: true });
  try {
    await client.connect();
    const admin = client.db('admin');
    try { await admin.command({ replSetGetConfig: 1 }); }
    catch (error) {
      if (error.code !== 94) throw error;
      await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:' + mongoPort }] } });
    }
    let primary = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if ((await admin.command({ hello: 1 })).isWritablePrimary) { primary = true; break; }
      await delay(500);
    }
    if (!primary) throw new Error('MongoDB did not elect a primary. Preserve .local/mongo-port when restarting.');
  } finally { await client.close(); }
  const env = { ...process.env, REDIS_URL: process.env.NATIVE_REDIS_URL ?? '', ELASTICSEARCH_URL: process.env.NATIVE_ELASTICSEARCH_URL ?? '', MONGODB_URI: repl.getUri('hypergear') + '?replicaSet=rs0', PUBLIC_ORIGIN: 'http://localhost:8080', HOST: '127.0.0.1' };
  const run = (script, extra = {}, args = [], watch = true) => {
    const child = spawn(process.execPath, [script, ...args], { env: { ...env, ...extra }, stdio: 'inherit' });
    children.push(child);
    child.on('error', error => { console.error(error.message); stop(1); });
    if (watch) child.on('exit', (code, signal) => {
      if (stopping) return;
      if (signal === 'SIGINT' || signal === 'SIGTERM') { stop(); return; }
      console.error(script + ' stopped with code ' + code); stop(1);
    });
    return child;
  };
  const seed = run('scripts/seed.mjs', {}, [], false);
  const [code] = await once(seed, 'exit'); if (code !== 0) throw new Error('Seed failed');
  run('services/auth-service/src/index.js', { PORT: '3001' });
  run('services/catalog-service/src/index.js', { PORT: '3002' });
  run('services/order-service/src/index.js', { PORT: '3003' });
  run('services/ai-service/src/index.js', { PORT: '3005' });
  run('services/api-gateway/src/index.js', { PORT: '3080' });
  if (messaging) run('services/notification-service/src/index.js', { RABBITMQ_URL: 'amqp://guest:guest@127.0.0.1:5672', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_USER: '', SMTP_PASSWORD: '' });
  if (production) {
    const build = run('node_modules/vite/bin/vite.js', { NODE_ENV: 'production' }, ['build', '--config', 'apps/web/vite.config.js'], false);
    const [buildCode] = await once(build, 'exit'); if (buildCode !== 0) throw new Error('Web build failed');
  }
  run('node_modules/vite/bin/vite.js', { HYPERGEAR_LOCAL: '1' }, [...(production ? ['preview', '--port', '8080'] : []), '--config', 'apps/web/vite.config.js']);
  await writeFile('.local/runtime.json', JSON.stringify({ pid: process.pid, mongodbUri: env.MONGODB_URI, startedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  console.log('Native demo starting: http://localhost:8080. MongoDB persisted under .local/mongo.');
  console.log(messaging ? 'RabbitMQ + Mailpit enabled: http://localhost:8025' : 'Email events remain in outbox. Use --with-messaging for local SMTP.');
  console.log('Google OAuth requires credentials in .env.');
} catch (error) { console.error(error.message); await stop(1); }
