import express from 'express';
import { User, Review } from '../other_services/model/seqModel';
import Logger from '../other_services/winstonLogger';
import sequelize from '../other_services/sequelizeConnection';
import conn from '../db_services/db_connection';
import { get } from 'http';

const router = express.Router();

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await getUsers();
        console.log('Users fetched successfully');
        res.status(200).send(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Something went wrong while fetching users');
    }});

export async function getUsers() {
    try{
        const userResult = await User.findAll();
        Logger.info("Users fetched successfully");
        return userResult;
        
    }catch(error){
        Logger.error("Error fetching users: ", error);
        throw error;
    }
};


export default router;