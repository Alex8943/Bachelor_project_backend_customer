import amqp from "amqplib";
import amqplib from 'amqplib';
import { error } from "console";
import dotenv from 'dotenv';

dotenv.config();

let channel: amqp.Channel | null = null;

const PROD_RABBITMQ_URL = process.env.rabbitmq_port || 'amqp://localhost:5672'; 
console.log('RabbitMQ URL:', PROD_RABBITMQ_URL);
const QUEUE_NAME = "authentication queue"; 

export const connectRabbitMQ = async () => {
  let connection;
  try {
    connection = await amqplib.connect(PROD_RABBITMQ_URL);
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to rabbitMQ,', error);
    throw error;
   
  }

  const channel = await connection.createChannel();
  console.log('RabbitMQ Channel created. ');
  return channel;
};


// Initialize RabbitMQ connection
export const initializeRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(PROD_RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(
      `RabbitMQ initialized. Connected to queue: ${QUEUE_NAME}`
    );
  } catch (error) {
    console.error("Error initializing RabbitMQ:", error);
  }
};


export const publishMessage = async (message: any) => {
  if (!channel) {
    console.warn("Channel not initialized. Initializing now...");
    await initializeRabbitMQ();  // Reinitialize if null
  }

  try {
    const msgBuffer = Buffer.from(JSON.stringify(message));
    channel!.sendToQueue(QUEUE_NAME, msgBuffer);
    console.log("Message sent to queue:", message);
  } catch (error) {
    console.error("Error publishing message to RabbitMQ:", error);
  }
};



