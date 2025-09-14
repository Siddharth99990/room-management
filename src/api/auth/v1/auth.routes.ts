import { Router } from "express";
import { changePassword, checkAuthStatus, forgetPassword, resetPassword, userLogin, userLogout } from "./auth.controller";
import { allowPasswordChangeOnly, authenticateToken } from "../../../middleware/authmiddleware";

const router=Router();

router.post('/login',userLogin);

router.post('/logout',authenticateToken,userLogout);

router.get('/check',authenticateToken,checkAuthStatus);

router.put('/changepassword',authenticateToken,allowPasswordChangeOnly,changePassword);

router.post('/forgetpassword',forgetPassword);

router.post('/resetpassword',resetPassword);
export default router;