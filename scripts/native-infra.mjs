import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
export async function startNativeInfrastructure() {
  const rabbit = process.env.RABBITMQ_BIN ?? '/opt/homebrew/opt/rabbitmq/sbin/rabbitmq-server';
  const mail = process.env.MAILPIT_BIN ?? '/opt/homebrew/bin/mailpit';
  await access(rabbit); await access(mail); await mkdir('.local', { recursive: true });
  const cookiePath = resolve('.local/erlang.cookie');
  try { await writeFile(cookiePath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const cookie = (await readFile(cookiePath, 'utf8')).trim();
  const config = resolve('.local/rabbitmq-native.conf');
  const plugins = resolve('.local/native-enabled-plugins');
  await writeFile(config, 'listeners.tcp.default = 127.0.0.1:5672\nmanagement.tcp.ip = 127.0.0.1\nmanagement.tcp.port = 15672\nloopback_users.guest = true\n');
  await writeFile(plugins, '[rabbitmq_management].\n');
  const broker = spawn(rabbit, [], { env: { ...process.env, ERL_EPMD_ADDRESS: '127.0.0.1', ERL_AFLAGS: '-setcookie ' + cookie + ' -kernel inet_dist_use_interface {127,0,0,1}', RABBITMQ_NODENAME: 'hypergear@localhost',
    RABBITMQ_CONFIG_FILE: config, RABBITMQ_ENABLED_PLUGINS_FILE: plugins, RABBITMQ_MNESIA_BASE: resolve('.local/rabbitmq-data'),
    RABBITMQ_LOGS: resolve('.local/rabbitmq.log'), RABBITMQ_PID_FILE: resolve('.local/rabbitmq.pid'), RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS: '+S 2:2' }, stdio: 'inherit' });
  const smtp = spawn(mail, ['--listen', '127.0.0.1:8025', '--smtp', '127.0.0.1:1025', '--database', resolve('.local/mailpit.db')], { stdio: 'inherit' });
  const children = [broker, smtp];
  try {
    for (let attempt = 0; attempt < 90; attempt++) {
      if (children.some(child => child.exitCode !== null)) throw new Error('Native infrastructure stopped; check occupied ports.');
      try {
        const [rabbit, mail] = await Promise.all([fetch('http://127.0.0.1:15672/api/overview', { headers: { Authorization: 'Basic ' + Buffer.from('guest:guest').toString('base64') } }), fetch('http://127.0.0.1:8025/api/v1/info')]);
        if (rabbit.ok && mail.ok) return children;
      } catch {}
      await delay(1000);
    }
    throw new Error('Native infrastructure failed to become ready.');
  } catch (error) { children.forEach(child => child.kill('SIGTERM')); throw error; }
}
