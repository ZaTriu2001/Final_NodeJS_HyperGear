import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
export async function freePort() {
  const server = net.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(done => server.close(done)); return port;
}
export async function startTestStack(extraEnv = {}) {
  const repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: resolve('.local/mongodb-binaries') }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = repl.getUri('hypergear_test');
  const env = { ...process.env, REDIS_URL: process.env.REDIS_URL ?? '', ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ?? '', ...extraEnv, MONGODB_URI: uri, JWT_SECRET: randomBytes(48).toString('hex'), PUBLIC_ORIGIN: 'http://localhost:8080', HOST: '127.0.0.1', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GEMINI_API_KEY: '' };
  const children = []; const urls = {};
  const seed = spawn(process.execPath, ['scripts/seed.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let seedLog = ''; seed.stderr.on('data', data => { seedLog += data; });
  if ((await once(seed, 'exit'))[0] !== 0) throw new Error(seedLog);
  for (const name of ['auth', 'catalog', 'order', 'ai']) {
    const port = await freePort(); urls[name] = 'http://127.0.0.1:' + port;
    const child = spawn(process.execPath, ['services/' + name + '-service/src/index.js'], { env: { ...env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child); let log = ''; child.stderr.on('data', data => { log += data; });
    let healthy = false;
    for (let i = 0; i < 100; i++) { if (child.exitCode !== null) throw new Error(log); try { if ((await fetch(urls[name] + '/healthz')).ok) { healthy = true; break; } } catch {} await delay(100); }
    if (!healthy) throw new Error(name + ' failed: ' + log);
  }
  return { uri, urls, env, stop: async () => { await Promise.all(children.map(child => { child.kill('SIGTERM'); return once(child, 'exit'); })); await repl.stop(); } };
}
export function client(urls) {
  const jar = new Map();
  return async (service, path, method = 'GET', body, headers = {}) => {
    const response = await fetch(urls[service] + path, { method, headers: { 'Content-Type': 'application/json', 'X-HyperGear-Client': 'web', Cookie: [...jar].map(([k,v])=>k+'='+v).join('; '), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0];const i=pair.indexOf('=');if (i>0) jar.set(pair.slice(0,i),pair.slice(i+1)); }
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, headers: response.headers };
  };
}
