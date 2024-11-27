import Joi from "joi";
import { Role } from "../other_services/model/seqModel";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const signUpSchema = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    lastname: Joi.string().min(3).max(20).required(),
    email: Joi.string()
        .pattern(emailPattern)
        .message("Email must be valid and not contain special characters other than '.', '_', '%', '+', and '-'")
        .required(),
    password: Joi.string().min(8).required(),
    role_fk: Joi.number()
        .integer()
        .required() // Add this field to allow and validate role_fk
        .messages({ "any.required": "Role is required", "number.base": "Role must be a valid number" })
});


export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

