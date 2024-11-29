import amqp from "amqplib";
import amqplib from 'amqplib';

let channel: amqp.Channel | null = null;

const RABBITMQ_URL = 'amqp://localhost'; 
const QUEUE_NAME = "authentication queue"; // Same queue as used by the Admin backend

export const connectRabbitMQ = async () => {
  try {
      const connection = await amqplib.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      console.log('Connected to RabbitMQ');
  } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
  }
};

// Initialize RabbitMQ connection
export const initializeRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(
      `RabbitMQ initialized. Connected to queue: ${QUEUE_NAME}`
    );
  } catch (error) {
    console.error("Error initializing RabbitMQ:", error);
  }
};

// Function to publish messages
export const publishMessage = async (message: any) => {
  if (!channel) {
    console.error("RabbitMQ channel is not initialized.");
    return;
  }

  try {
    const msgBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(QUEUE_NAME, msgBuffer);
    
  } catch (error) {
    console.error("Error publishing message to RabbitMQ:", error);
  }
};

