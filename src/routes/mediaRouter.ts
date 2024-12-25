import express from 'express';
import logger from '../other_services/winstonLogger';
import {Media} from '../other_services/model/seqModel';
import sequelize from '../other_services/sequelizeConnection';
import {Review} from '../other_services/model/seqModel';
import verifyUser from './authenticateUser';
const router = express.Router();


router.get('/medias', verifyUser, async (req, res) => {
    try {
        const medias = await getAllMedias();
        res.status(200).send(medias);
    } catch (err) {
        console.error('Error fetching medias: ', err);
        res.status(500).send('Something went wrong while fetching medias');
    }
});

export async function getAllMedias() {
    try {

        const medias = await Media.findAll();
        logger.info('Medias fetched successfully');
        return medias;

    }catch (error){
        console.error('Error fetching all medias:', error);
        throw error;
    }
}

export default router;