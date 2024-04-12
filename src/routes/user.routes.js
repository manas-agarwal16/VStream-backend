import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();
//these coded execute when user meets the endpoint /users and all endpoints mentioned here r  after /api/v1/users/ => /api/v1/users/.....


router.route("/register").post(registerUser);


export default router;