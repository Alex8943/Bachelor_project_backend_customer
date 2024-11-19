import express, {Request, Response, NextFunction} from "express"; 
import { signUpSchema, loginSchema } from "./validator";
import Joi from "joi"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../other_services/model/seqModel";
import logger from "../other_services/winstonLogger";
import { Role } from "../other_services/model/seqModel";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
router.use(express.json()); //middleware for at pars JSON

const validation = (schema: Joi.Schema) => (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if(error){
        res.status(400).send(error.details[0].message);
    } else {
        next();
    }
}


router.post("/auth/signup", validation(signUpSchema), async (req, res) => {
    try {
        const result: any = await createUser(req.body.name, req.body.lastname, req.body.email, req.body.password);
      
        let jwtUser = {
            "id": result.id,
            "name": result.name,
            "lastname": result.lastname,
            "email": result.email,
            "password": result.password,
        }
        let resultWithToken = {"authToken": jwt.sign({ user: jwtUser }, "secret"), "user": result};
        res.status(200).send(resultWithToken);
        console.log("Only token: ", jwtUser)
        return resultWithToken;
    } catch (err:any) {
        if (err.code == 409){
            res.status(409).send(err.message);
            return err.message;
        } else {
            res.status(500).send("Something went wrong while creating user ");
            console.log("Error: ", err)
            logger.error(err.message);
            return "Something went wrong while creating user (returning 500)";
        }
    }
})

router.post("/auth/login", validation(loginSchema), async (req, res) => {
    try {
        const result: any = await getUser(req.body.email, req.body.password);
        let jwtUser = {
            "id": result.id,
            "name": result.name,
            "lastname": result.lastname,
            "email": result.email,
            "password": result.password,
            "role_fk": result.role_fk, // Include role_fk in the JWT payload
            "roleName": result.role ? result.role.name : null // Include role name if available
        }
        console.log("Role fk: ", jwtUser.role_fk);
       
        let resultWithToken = {"authToken": jwt.sign({ user: jwtUser }, "secret"), "user": result};
        res.status(200).send(resultWithToken);
        console.log("User:", jwtUser.name, "has signed in");
        return resultWithToken;
    }catch(err:any){
        if (err.message == "No user found with the given credentials"){
            res.status(404).send(err.message);
            logger.error(err.message);
            return err.message;
        }else if (err.message == "Incorrect email or password"){
            res.status(401).send(err.message);
            logger.error(err.message);
            return err.message;
        }else{
            res.status(500).send("Something went wrong while logging in");
            console.log("Error: ", err)
            logger.error(err.message);
            return "Something went wrong while logging in (returning 500)";
        }
    }
}); 



export async function getUser(email: string, password: string) {
    try {
        // Fetch user details using the email, including the role_fk
        const user = await User.findOne({
            where: { email: email },
            attributes: ["id", "name", "lastname", "email", "password", "role_fk"], // Include role_fk in attributes
            include: [
                {
                    model: Role,
                    attributes: ["name"],
                }
            ]
        });

        if (!user) {
            logger.error("No user found with the given credentials");
            console.log("No user found with the given credentials");
            throw new Error("No user found with the given credentials");
        }

        const userData = user.get(); // Extract user data, including role_fk and role name
        console.log("User's data with role_fk and role name:", userData); // Log the data to verify

        return userData;
    } catch (error) {
        console.log("error: ", error);
        throw error;
    }
}


export async function createUser(name: string, lastname: string, email: string, password: string) {
    try{
        const alreadyExists = await User.findOne({where: {email: email}});
        if(alreadyExists){
            throw {code: 409, message: "User already exists"};
        }
        let hash_password = bcrypt.hashSync(password, 10);
        
        const result = await User.create({
            name: name,
            lastname: lastname,
            email: email,
            password: hash_password,
            role_fk: 1,
        });

        console.log("Created user: ", result);
        
        return result;
    }catch(error){
        throw error;
    }
};

router.put("/auth/updateUser/:id", async (req, res) => {
    try {
        
        const result = await updateUser(req.params.id, req.body);
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send("Something went wrong while updating user");
        console.log("Error: ", err);
    }
});

export async function updateUser(userId: any, value: any) {
    try {
        // Check if the user exists
        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error("User not found");
        }

        // Prepare the updated fields
        const updatedFields: any = {
            name: value.name,
            lastname: value.lastname,
        };

        // Hash the password if it's being updated
        if (value.password) {
            const hashedPassword = await bcrypt.hash(value.password, 10);
            updatedFields.password = hashedPassword;
        }

        // Update the user
        await User.update(updatedFields, { where: { id: userId } });

        // Fetch the updated user details
        const updatedUser = await User.findOne({
            where: { id: userId },
            attributes: ['id', 'name', 'lastname'], // Return only the necessary fields
        });

        console.log("User updated successfully:", updatedUser);
        return updatedUser;
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}


export default router;
