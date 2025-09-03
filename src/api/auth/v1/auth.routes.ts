import { Router } from "express";
import { changePassword, userLogin, userLogout } from "./auth.controller";
import { allowPasswordChangeOnly, authenticateToken } from "../../../middleware/authmiddleware";

const router=Router();

router.post('/login',userLogin);

router.post('/logout',authenticateToken,userLogout);

router.put('/changepassword',authenticateToken,allowPasswordChangeOnly,changePassword);
export default router;