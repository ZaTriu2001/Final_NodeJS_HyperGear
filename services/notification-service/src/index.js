import 'dotenv/config';
import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { setTimeout as delay } from 'node:timers/promises';
import { Outbox, EmailDelivery, initModels } from '@hypergear/core/models';
import { renderEmail } from './render.js';
const queue = process.env.NOTIFICATION_QUEUE ?? 'order.notifications';
const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST ?? 'mailpit', port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === 'true', ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}) });
await mongoose.connect(process.env.MONGODB_URI);
await initModels();

async function run() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const publisher = await connection.createConfirmChannel();
  const consumer = await connection.createChannel();
  await publisher.assertQueue(queue + '.dead', { durable: true });
  await publisher.assertQueue(queue, { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': queue + '.dead' } });
  await publisher.assertQueue(queue + '.retry', { durable: true, arguments: { 'x-message-ttl': 5000, 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': queue } });
  await consumer.prefetch(5);
  let alive = true;
  connection.on('error', error => console.error('RabbitMQ connection:', error.message));
  connection.on('close', () => { alive = false; });
  await consumer.consume(queue, async message => {
    if (!message) return;
    let event;
    try {
      event = JSON.parse(message.content.toString());
      if (!event.id || !event.payload?.email || !['password.reset', 'order.placed', 'order.confirmed'].includes(event.type)) throw new Error('Malformed event');
    } catch { consumer.nack(message, false, false); return; }
    try {
      await EmailDelivery.updateOne({ _id: event.id }, { $setOnInsert: { status: 'pending', attempts: 0 } }, { upsert: true });
      const current = await EmailDelivery.findById(event.id);
      if (current.status === 'sent') { consumer.ack(message); return; }
      if (current.status === 'failed') { consumer.nack(message, false, false); return; }
      const delivery = await EmailDelivery.findOneAndUpdate({ _id: event.id, status: { $ne: 'sent' }, $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: new Date() } }] },
        { $set: { lockedUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } }, { returnDocument: 'after' });
      if (!delivery) {
        publisher.sendToQueue(queue + '.retry', message.content, { persistent: true, messageId: event.id }); await publisher.waitForConfirms(); consumer.ack(message); return;
      }
      await transporter.sendMail({ from: process.env.SMTP_FROM ?? 'HyperGear <no-reply@hypergear.local>', to: event.payload.email,
        messageId: '<' + event.id + '@hypergear.local>', ...renderEmail(event) });
      await EmailDelivery.updateOne({ _id: event.id }, { $set: { status: 'sent', sentAt: new Date() }, $unset: { lockedUntil: 1, error: 1 } });
      consumer.ack(message);
    } catch (error) {
      const delivery = await EmailDelivery.findById(event.id);
      const exhausted = (delivery?.attempts ?? 0) >= 5;
      await EmailDelivery.updateOne({ _id: event.id }, { $set: { status: exhausted ? 'failed' : 'pending', error: 'SMTP delivery failed' }, $unset: { lockedUntil: 1 } });
      if (exhausted) consumer.nack(message, false, false);
      else { publisher.sendToQueue(queue + '.retry', message.content, { persistent: true, messageId: event.id }); await publisher.waitForConfirms(); consumer.ack(message); }
      console.error('Email delivery retry:', error.code ?? error.name);
    }
  });
  console.log('Notification worker ready');
  while (alive) {
    const events = await Outbox.find({ publishedAt: null }).sort({ createdAt: 1 }).limit(20);
    for (const event of events) {
      publisher.sendToQueue(queue, Buffer.from(JSON.stringify({ id: event._id, type: event.type, payload: event.payload })), { persistent: true, messageId: event._id });
      await publisher.waitForConfirms();
      await Outbox.updateOne({ _id: event._id }, { $set: { publishedAt: new Date() }, $unset: { payload: 1 } });
    }
    await delay(1000);
  }
}
while (true) {
  try { await run(); } catch (error) { console.error('Worker reconnecting:', error.code ?? error.name); }
  await delay(5000);
}
