import express from 'express';
import Logger from '../other_services/winstonLogger';
import conn from '../db_services/db_connection';
import verifyUser from './authenticateUser';

const router = express.Router();

//Get role id's
router.get("/roles", verifyUser, async function (req, res) {
    try {
        const roles = await getRoles();
        console.log('Roles fetched successfully');
        res.status(200).send(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).send('Something went wrong while fetching roles');
    }
});

export async function getRoles() {
    try{
        const connection = await conn.getConnection();
        const result = await connection.query('select * from stohtpsd_company.role');
        Logger.info("Roles fetched successfully");
        return result[0];

    }catch(error){
        Logger.error("Error fetching roles: ", error);
        throw error;
    }
}

export default router;