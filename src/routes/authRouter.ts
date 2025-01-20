import express, {Request, Response, NextFunction} from "express"; 
import { signUpSchema, loginSchema } from "./validator";
import Joi from "joi"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../other_services/model/seqModel";
import logger from "../other_services/winstonLogger";
import { Role } from "../other_services/model/seqModel";
import dotenv from "dotenv";
import { publishMessage } from "../rabbitmqPublisher";

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
        const { name, lastname, email, password } = req.body;

        // Create the user
        const result: any = await createUser(name, lastname, email, password);

        // Fetch the user with role details
        const userWithRole = await User.findOne({
            where: { id: result.id },
            attributes: ["id", "name", "lastname", "email", "password", "role_fk"],
            include: [{ model: Role, attributes: ["name"] }],
        });

        if (!userWithRole) {
            throw new Error("Failed to fetch user role after signup");
        }

        const userData = userWithRole.get();

        // Prepare the JWT payload
        const jwtUser = {
            id: userData.id,
            name: userData.name,
            lastname: userData.lastname,
            email: userData.email,
            role_fk: userData.role_fk,
            roleName: userData.Role ? userData.Role.name : null, // Ensure Role.name is included
        };

        // Generate JWT token
        const token = jwt.sign({ user: jwtUser }, "secret");

        // Prepare response
        const resultWithToken = { authToken: token, user: userData };

        // Publish to RabbitMQ
        const resultWithTokenForRabbitMQ = {
            event: "signup",
            name: userData.name,
            email: userData.email,
            authToken: token,
        };

        await publishMessage(resultWithTokenForRabbitMQ);

        console.log("User:", jwtUser.name, "has signed up");
        res.status(200).json(resultWithToken);
    } catch (err: any) {
        console.error("Error in /auth/signup:", err);

        if (err.code === 409) {
            res.status(409).json({ message: err.message });
        } else if (err.code === 400) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(500).json({ message: "Something went wrong while creating user" });
        }
    }
});

export async function createUser(name: string, lastname: string, email: string, password: string) {
    try {
        // Check if the user already exists
        const alreadyExists = await User.findOne({ where: { email } });
        if (alreadyExists) {
            throw { code: 409, message: "User already exists" };
        }

        // Hash the password
        const hash_password = bcrypt.hashSync(password, 10);

        // Create the user with the default role_fk
        const newUser = await User.create({
            name,
            lastname,
            email,
            password: hash_password,
            role_fk: 3, // Default role_fk for "customer"
        });

        return newUser;
    } catch (error) {
        throw error;
    }
}

  

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
        };
        console.log("Role fk: ", jwtUser.role_fk);
        
        const resultWithToken = {"authToken": jwt.sign({ user: jwtUser }, "secret"), "user": result};

        // Respond to the client
        res.status(200).send(resultWithToken);
        console.log("User:", jwtUser.name, "has logged in");
        return resultWithToken;

    } catch (err: any) {
        if (err.message == "No user found with the given credentials") {
            res.status(404).send(err.message);
            logger.error(err.message);
            return err.message;
        } else if (err.message == "Incorrect email or password") {
            res.status(401).send(err.message);
            logger.error(err.message);
            return err.message;
        } else {
            res.status(500).send("Something went wrong while logging in");
            console.log("Error: ", err);
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
            attributes: [
                "id", 
                "name", 
                "lastname", 
                "email", 
                "password", 
                "role_fk", 
                "isBlocked" 
            ], 
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







export default router;
