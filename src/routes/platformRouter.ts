import express from 'express';
import logger from '../other_services/winstonLogger';
import {Platform} from '../other_services/model/seqModel';
import sequelize from '../other_services/sequelizeConnection';
import {Review} from '../other_services/model/seqModel';
import verifyUser from './authenticateUser';
const router = express.Router();

router.get('/platforms', verifyUser, async (req, res) => {
    try {
        const platforms = await getAllPlatforms();
        res.status(200).send(platforms);
    } catch (err) {
        console.error('Error fetching platforms: ', err);
        res.status(500).send('Something went wrong while fetching platforms');
    }
});


export async function getAllPlatforms() {
    try {

        const platforms = await Platform.findAll();
        logger.info('Platforms fetched successfully');
        return platforms;

    }catch (error){
        console.error('Error fetching all platforms:', error);
        throw error;
    }
}


export default router;