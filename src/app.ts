import express from 'express';
import logger from './other_services/winstonLogger'
import { testDBConnection } from "./db_services/local_database/db_connection";
import { testProductionDatabase } from './db_services/prod_database/db_connection';
import dump from './db_services/local_database/backup'
import authRouter from './routes/authRouter';
import userRouter from './routes/userRouter'
import reviewRouter from './routes/reviewRouter'
import roleRouter from './routes/roleRouter'
import userTapRouter from './routes/userTapRouter';
import genreRouter from './routes/genreRouter';
import platformRouter from './routes/platformRouter';
import mediaRouter from './routes/mediaRouter';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRabbitMQ, initializeRabbitMQ, publishMessage } from './rabbitmqPublisher';

dotenv.config();

const app = express();

// Simplified CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true, // Needed for cookies or auth headers
}));




//testDBConnection();
//dump();

//testProductionDatabase();


app.use(authRouter); 
app.use(userRouter);
app.use(reviewRouter);
app.use(roleRouter);
app.use(userTapRouter);
app.use(genreRouter);
app.use(platformRouter);
app.use(mediaRouter);

process.on('SIGINT', () => {
    logger.end(); 
    console.log('See ya later silly');
    process.exit(0);
});

app.listen(4000, async () => {
    await connectRabbitMQ();
    await initializeRabbitMQ();
    console.log("Customer backend server is running on port 4000");
    
});
