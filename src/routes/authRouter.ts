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
import verifyUser from "./authenticateUser";

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


router.post("/auth/signup", validation(signUpSchema), verifyUser, async (req, res) => {
    try {
      const { name, lastname, email, password, role_fk } = req.body;
  
      // Create user
      const result: any = await createUser(name, lastname, email, password, role_fk);
      console.log("Result from createUser:", result);
  
      // Prepare JWT payload
      const jwtUser = {
        id: result.id,
        name: result.name,
        lastname: result.lastname,
        email: result.email,
        role_fk: result.role_fk,
        roleName: result.rolename, // Include role name in the payload
      };
      
      // Generate JWT token
      const token = jwt.sign({ user: jwtUser }, "secret");
      const resultWithToken = { authToken: token, user: result };
      const resultWithTokenForRabbitMQ = { event: "signup", authToken: resultWithToken };
      console.log("Message to be published to RabbitMQ:", resultWithTokenForRabbitMQ);
  
     
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
  

router.post("/auth/login", validation(loginSchema), verifyUser, async (req, res) => {
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

        const resultWithTokenForRabbitMQ = {
            event: "login", 
            authToken: resultWithToken
        };

        // Publish the message to RabbitMQ
        await publishMessage(resultWithTokenForRabbitMQ);
        console.log("Message published to RabbitMQ: Successfully sent");

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
            attributes: ["id", "name", "lastname", "email", "password", "role_fk", "isBlocked"], // Include role_fk in attributes
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

export async function createUser(name: string, lastname: string, email: string, password: string, role_fk: number) {
    try {
        console.log("Received data in createUser:", { name, lastname, email, password, role_fk });

        // Check if the user already exists
        const alreadyExists = await User.findOne({ where: { email: email } });
        if (alreadyExists) {
            throw { code: 409, message: "User already exists" };
        }

        // Validate the role_fk and fetch the role
        const role = await Role.findOne({ where: { id: role_fk } });
        if (!role) {
            throw { code: 400, message: "Invalid role ID" };
        }

        // Hash the password
        const hash_password = bcrypt.hashSync(password, 10);

        // Create the user with the role_fk
        const user = await User.create({
            name,
            lastname,
            email,
            password: hash_password,
            role_fk,
        });

        // Prepare the response including the role name
        const userWithRole = {
            ...user.get({ plain: true }),
            rolename: role.name, // Include the role name
        };

        console.log("Created user with role:", userWithRole);
        return userWithRole;
    } catch (error) {
        console.error("Error in createUser:", error);
        throw error;
    }
}




router.put("/auth/updateUser/:id", verifyUser, async (req, res) => {
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

        // Include the email field if provided
        if (value.email) {
            updatedFields.email = value.email;
        }

        // Hash the password if it's being updated
        if (value.password) {
            const hashedPassword = await bcrypt.hash(value.password, 10);
            updatedFields.password = hashedPassword;
        }

        if (value.email && value.email !== user.email) {
            const existingEmail = await User.findOne({ where: { email: value.email } });
            if (existingEmail) {
                throw new Error("Email is already in use.");
            }
            updatedFields.email = value.email;
        }

        // Update the user
        await User.update(updatedFields, { where: { id: userId } });

        // Fetch the updated user details
        const updatedUser = await User.findOne({
            where: { id: userId },
            attributes: ['id', 'name', 'lastname', 'email'], // Return only the necessary fields
        });

        console.log("User updated successfully:", updatedUser);
        return updatedUser;
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}



export default router;
