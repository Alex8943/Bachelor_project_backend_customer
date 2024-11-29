import express from 'express';
import logger from './other_services/winstonLogger'
import { testDBConnection } from "./db_services/db_connection";
import dump from './db_services/backup'
import authRouter from './routes/authRouter';
import userRouter from './routes/userRouter'
import reviewRouter from './routes/reviewRouter'
import roleRouter from './routes/roleRouter'
import userTapRouter from './routes/userTapRouter';
import genreRouter from './routes/genreRouter';
import cors from 'cors';
import { connectRabbitMQ, initializeRabbitMQ, publishMessage } from './rabbitmqPublisher';


const app = express();
app.use(cors());

//testDBConnection();
//dump();

app.use(authRouter); 
app.use(userRouter);
app.use(reviewRouter);
app.use(roleRouter);
app.use(userTapRouter);
app.use(genreRouter);

process.on('SIGINT', () => {
    logger.end(); 
    console.log('See ya later silly');
    process.exit(0);
});

app.listen(3001, async () => {
    await connectRabbitMQ();

    console.log('Connected to RabbitMQ');

    await initializeRabbitMQ();
    console.log('RabbitMQ initialized');

    await publishMessage({ message: 'Hello from customer backend' });
    console.log('Message published to RabbitMQ');
     
    
    console.log("Customer backend server is running on http://localhost:3001");
    
   
});
