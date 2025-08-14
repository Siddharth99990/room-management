import { Router } from "express";
import { userLogin, userLogout } from "./auth.controller";
import { authenticateToken } from "../../../middleware/authmiddleware";

const router=Router();

router.post('/login',userLogin);

router.post('/logout',authenticateToken,userLogout);

export default router;