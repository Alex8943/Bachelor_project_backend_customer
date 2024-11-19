import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

const RABBITMQ_URL = 'amqp://localhost'; // Update if RabbitMQ is hosted remotely
const QUEUE_NAME = 'test-queue'; // Same queue as used by the Admin backend

export const initializeRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`Subscriber connected to RabbitMQ, listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.error('Error initializing RabbitMQ subscriber:', error);
  }
};

export const startListening = () => {
    if (!channel) {
      console.error('RabbitMQ channel is not initialized.');
      return;
    }
  
    channel.consume(
      QUEUE_NAME,
      (message) => {
        if (message) {
          const content = message.content.toString();
          console.log(`Message received in subscriber: ${content}`);
          // Check if channel is still valid before acknowledging the message
          if (channel) {
            channel.ack(message); // Acknowledge the message
          } else {
            console.error('Channel is null while trying to acknowledge a message.');
          }
        }
      },
      { noAck: false } // Ensure messages are acknowledged
    );
  };
  