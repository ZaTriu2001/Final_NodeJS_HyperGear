import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = readFileSync('/run/hypergear/jwt-secret', 'utf8').trim();
const args = process.argv.slice(2); if (args[0] === 'node') args.shift();
if (!args[0]) throw new Error('Missing service entrypoint');
await import(pathToFileURL(resolve(args[0])).href);
