import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
try { await readFile('.env'); console.log('.env already exists; preserved.'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const template = await readFile('.env.example', 'utf8');
  await writeFile('.env', template.replace('replace-with-a-long-random-secret', randomBytes(48).toString('hex')), { flag: 'wx', mode: 0o600 });
  console.log('Created local .env. Secrets are ignored by Git.');
}
