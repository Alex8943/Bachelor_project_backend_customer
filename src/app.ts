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
//import { initializeRabbitMQ, startListening } from './rabbitmqSubscriber'


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
    //await initializeRabbitMQ();
    //startListening(); 
    console.log('customer server is running on localhost:3001');
});
