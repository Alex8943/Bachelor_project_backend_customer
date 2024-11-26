import express from 'express';
import { User, Review, Role } from '../other_services/model/seqModel';
import Logger from '../other_services/winstonLogger';
import sequelize from '../other_services/sequelizeConnection';
import conn from '../db_services/db_connection';
import logger from '../other_services/winstonLogger';

import { RowDataPacket } from "mysql2/promise";

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
        try {
            const userResult = await User.findAll({
                where: { isBlocked: false }, 
                include: [
                    {
                        model: sequelize.models.Role, // Include the Role model
                        attributes: ['name'], // Only fetch the 'name' attribute from the Role model
                    },
                ],
                attributes: { exclude: ['password'] }, // Exclude sensitive fields like 'password' from the result
            });
            Logger.info("Users fetched successfully");
            return userResult;
        } catch (error) {
            Logger.error("Error fetching users: ", error);
            throw error;
        }
    }
    
//Get specfic user where role_fk = ?
router.get('/user/:id', async (req, res) => {
    try {
        const users = await getUserById(req.params.id);
        console.log('Specific users fetched successfully');
        res.status(200).send(users);
    } catch (error) {
        console.error('Error fetching specific users:', error);
        res.status(500).send('Something went wrong while fetching specific users');
    }});



export async function getUserById(value: any){
    try{
        const userResult = await User.findOne({
            where: {id: value}
        });
        Logger.info("Specific users fetched successfully");
        return userResult;
    }catch(error){
        Logger.error("Error fetching specific users: ", error);
        throw error;
    }
}

router.get('/users/role/:userRole', async (req, res) => {
    try {
        const users = await getUsersByRole(req.params.userRole);
        console.log('Specific users fetched successfully');
        res.status(200).send(users);
    } catch (error) {
        console.error('Error fetching specific users:', error);
        res.status(500).send('Something went wrong while fetching specific users');
    }});
    


    export async function getUsersByRole(role_fk: any) {
        try {
          const users = await User.findAll({
            where: { role_fk }, // Filter users by role_fk
            include: [
              {
                model: Role,
                as: "Role", // Ensure the alias matches the Sequelize association
                attributes: ["id", "name"], // Include only necessary Role attributes
              },
            ],
          });
          return users;
        } catch (error) {
          Logger.error("Error fetching users by role: ", error);
          throw error;
        }
      }
      

//Get all reviews made by a specific user
router.get("/user/:id/reviews", async (req, res) => {
    try{
        
        const reviews = await getReviewsByUserId(req.params.id);
        console.log('Specific reviews fetched successfully');
        res.status(200).send(reviews);
        
    }catch(error){
        console.error('Error fetching specific reviews:', error);
        res.status(500).send('Something went wrong while fetching specific reviews');
    
    }});

export async function getReviewsByUserId(value: any){
    try{

        const reviews = await Review.findAll({
            where: { user_fk: value }, // Filter reviews by user foreign key
        });
        return reviews;

    }catch(error){
        Logger.error("Error fetching specific reviews: ", error);
        throw error;
    }

};

router.get('/softDeletedUsers', async (req, res) => {
    try {
        const users = await showAllDeletedUsers();
        console.log('Deleted users fetched successfully');
        res.status(200).send(users);
    } catch (error) {
        console.error('Error fetching deleted users:', error);
        res.status(500).send('Something went wrong while fetching deleted users');
    }});


export async function showAllDeletedUsers(){
    try{
        const deletedUsers = await User.findAll({
            where: { isBlocked: true }, // Filter users by `isBlocked` attribute
            attributes: { exclude: ['password'] }, // Exclude sensitive fields like 'password' from the result
            include: [
                {
                    model: sequelize.models.Role, // Include the Role model
                    attributes: ['name'], // Only fetch the 'name' attribute from the Role model
                    
                },
            ],
        });
        Logger.info("Deleted users fetched successfully");
        return deletedUsers;
    }catch(error){
        Logger.error("Error fetching deleted users: ", error);
        throw error;
    }
}


router.get('/findUser/:name', async (req, res) => {
    try {
        const user = await searchUserByName(req.params.name);
        
        console.log('Specific user fetched successfully');
        res.status(200).send(user);
    } catch (error) {
        console.error('Error fetching specific user:', error);
        res.status(500).send('Something went wrong while fetching the user');
    }
});

export async function searchUserByName(value: string) {
    const connection = await conn.getConnection();
    try {
        const query = `
            SELECT u.*, r.name AS roleName
            FROM stohtpsd_company.user u
            LEFT JOIN stohtpsd_company.role r ON u.role_fk = r.id
            WHERE u.name LIKE ?
        `;
        // Properly type the result to match the structure
        const [rows] = await connection.execute<RowDataPacket[]>(query, [`%${value}%`]);
        
        if (rows.length === 0) {
            Logger.error("User does not exist");
            return null;
        }

        Logger.info("User searched successfully");
        return rows;
    } catch (error) {
        Logger.error("Error searching user: ", error);
        throw error;
    } finally {
        connection.release(); // Release the database connection
    }
}

router.put("/delete/user/:id", async (req, res) => {
    try{
        console.log("req.params.id: ", req.params.id);
        const result = await softDeleteUser(req.params.id); // Pass `userId` and `req.body` separately
        res.status(200).send(result);

    }catch(error){
        console.error("error updating user: ", error)
        res.status(500).send("Something went wrong with updating the user " )
    }
});


export async function softDeleteUser(id: any){
    try{
        const user = await User.findByPk(id);

        if(!user){
            console.log("User does not exist");
            Logger.error("User does not exist");
            return "User does not exist";

        }else if(user.isBlocked == true){
            console.log("User is already blocked");
            Logger.error("User is already blocked");
            return "User is already blocked";
        }
        
        console.log("User exists");

        // Soft delete the user by setting `isBlocked` to true
        await User.update(
            { isBlocked: true },
            { where: { id: id } }
        );

        Logger.info("User blocked successfully");
        return { message: "User blocked successfully" };
    }catch(error){
        Logger.error("Error deleting user: ", error);
        throw error;
    }
}


router.put('/update/user/:id', async (req, res) => {
    try {
        const result = await updateUser(req.params.id, req.body);
        res.status(200).send(result);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Something went wrong while updating the user');
    }
});

export async function updateUser(id: any, data: any) {
    try {
        const user = await User.findByPk(id);
        if (!user) {
            console.log('User does not exist');
            Logger.error('User does not exist');
            return 'User does not exist';
        }
        console.log('User exists');

        await User.update(data, { where: { id: id } });
        Logger.info('User updated successfully');

        return { message: 'User updated successfully' };
    } catch (error) {
        console.error('Error updating user:', error);
        Logger.error('Error updating user:', error);
        throw error;
    }
}

router.put('/undelete/user/:id', async (req, res) => {
    try {
        const result = await undeleteUser(req.params.id);
        res.status(200).send(result);
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).send('Something went wrong while unblocking the user');
    }
});

export async function undeleteUser(id: any){
    try{
        const user = await User.findByPk(id);

        if(!user){
            console.log("User does not exist");
            Logger.error("User does not exist");
            return "User does not exist";

        }else if(user.isBlocked == false){
            console.log("User is already unblocked");
            Logger.error("User is already unblocked");
            return "User is already unblocked";
        }
        
        console.log("User exists");

        // Soft delete the user by setting `isBlocked` to true
        await User.update(
            { isBlocked: false },
            { where: { id: id } }
        );

        Logger.info("User unblocked successfully");
        return { message: "User unblocked successfully" };
    }catch(error){
        Logger.error("Error unblocking user: ", error);
        throw error;
    };

}

export default router



