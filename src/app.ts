import express from 'express';
import logger from './other_services/winstonLogger'

const app = express();

process.on('SIGINT', () => {
    logger.end(); 
    console.log('See ya later silly');
    process.exit(0);
});

app.listen(3000, () => {
    console.log('customer server is running on localhost:3000');
});
