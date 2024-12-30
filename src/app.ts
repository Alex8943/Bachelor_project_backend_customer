import express from 'express';
import logger from './other_services/winstonLogger'
import { testDBConnection } from "./db_services/local_database/db_connection";
import { testProductionDatabase } from './db_services/prod_database/db_connection';
import { seedData } from './db_services/prod_database/seed_data';
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
import { connectRabbitMQ, initializeRabbitMQ, publishMessage } from './rabbitmqPublisher';


const app = express();
app.use(cors());

//testDBConnection();
//dump();

//testProductionDatabase();
//seedData();

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
