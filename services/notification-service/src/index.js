import 'dotenv/config';
import amqp from 'amqplib';

const queue = 'order.notifications';
const connectionUrl = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@127.0.0.1:5672';

async function start() {
  const connection = await amqp.connect(connectionUrl);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });
  channel.prefetch(10);
  console.log(`[notification-service] waiting for messages from ${queue}`);
  await channel.consume(queue, async (message) => {
    if (!message) return;
    try {
      const event = JSON.parse(message.content.toString());
      console.log(`[notification-service] received ${event.type} for order ${event.orderId}`);
      // SMTP delivery is connected in phase 2. Acknowledge only after delivery succeeds then.
      channel.ack(message);
    } catch (error) {
      console.error('[notification-service] invalid message', error);
      channel.nack(message, false, false);
    }
  });
}

start().catch((error) => {
  console.error('[notification-service] failed to start', error);
  process.exit(1);
});
