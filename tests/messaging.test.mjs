import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Outbox, EmailDelivery, initModels } from '@hypergear/core/models';

test('RabbitMQ worker delivers SMTP, suppresses replay and dead-letters after bounded retries', { timeout: 90000 }, async () => {
  const repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: resolve('.local/mongodb-binaries') }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = repl.getUri('hypergear_messaging_test'); await mongoose.connect(uri); await initModels();
  const queue = 'hypergear.test.' + randomUUID();
  const connection = await amqp.connect(process.env.RABBITMQ_TEST_URL ?? 'amqp://guest:guest@127.0.0.1:5672');
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue(queue + '.dead', { durable: true });
  await channel.assertQueue(queue, { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': queue + '.dead' } });
  await channel.assertQueue(queue + '.retry', { durable: true, arguments: { 'x-message-ttl': 5000, 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': queue } });
  let worker;
  const launch = port => {
    const child = spawn(process.execPath, ['services/notification-service/src/index.js'], {
      env: { ...process.env, MONGODB_URI: uri, RABBITMQ_URL: process.env.RABBITMQ_TEST_URL ?? 'amqp://guest:guest@127.0.0.1:5672',
        NOTIFICATION_QUEUE: queue, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_SECURE: 'false', SMTP_USER: '', SMTP_PASSWORD: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stderr.on('data', () => {}); return child;
  };
  const stop = async () => { if (worker && worker.exitCode === null) { worker.kill('SIGTERM'); await once(worker, 'exit'); } };
  const eventually = async (check, seconds = 15) => { for (let i = 0; i < seconds * 5; i++) { if (await check()) return; await delay(200); } assert.fail('Condition not reached'); };
  try {
    worker = launch(1025);
    const id = randomUUID();
    const event = { _id: id, type: 'order.placed', payload: { email: 'qa@hypergear.local', fullName: 'QA', orderId: id, totalPaid: 100000, lines: [{ productName: 'QA CPU', variantName: 'Box', quantity: 1 }] } };
    await Outbox.create(event);
    await eventually(async () => (await EmailDelivery.findById(id))?.status === 'sent');
    const mailBase = process.env.SMOKE_MAIL_URL ?? 'http://localhost:8025';
    const messages = async () => (await (await fetch(mailBase + '/api/v1/messages')).json()).messages.filter(m => m.Subject.includes(id));
    assert.equal((await messages()).length, 1);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ id, type: event.type, payload: event.payload })), { persistent: true, messageId: id });
    await channel.waitForConfirms(); await delay(1500);
    assert.equal((await messages()).length, 1); assert.equal((await EmailDelivery.findById(id)).attempts, 1);
    await stop(); worker = launch(1);
    const failedId = randomUUID(); await Outbox.create({ ...event, _id: failedId, payload: { ...event.payload, orderId: failedId } });
    await eventually(async () => (await EmailDelivery.findById(failedId))?.status === 'failed', 40);
    assert.equal((await EmailDelivery.findById(failedId)).attempts, 5);
    await eventually(async () => (await channel.checkQueue(queue + '.dead')).messageCount === 1);
    console.log('SMTP delivered once; replay skipped; failed delivery retried 5 times and retained in dead-letter queue.');
  } finally {
    await stop();
    for (const name of [queue, queue + '.retry', queue + '.dead']) await channel.deleteQueue(name);
    await connection.close(); await mongoose.disconnect(); await repl.stop();
  }
});
