import express from 'express';
import logger from './other_services/winstonLogger'
import { testDBConnection } from "./db_services/db_connection";
import dump from './db_services/backup'
import authRouter from './routes/authRouter';
import userRouter from './routes/userRouter'


const app = express();

//testDBConnection();
//dump();

app.use(authRouter); 
app.use(userRouter);

process.on('SIGINT', () => {
    logger.end(); 
    console.log('See ya later silly');
    process.exit(0);
});

app.listen(3001, () => {
    console.log('customer server is running on localhost:3001');
});
