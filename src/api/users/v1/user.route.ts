import express from 'express';
import { deleteAllUsers, getAllUsers, registerUser,getUserById, updateUserInfo,restoreDeletedUsers,deleteUserById} from './user.controller';
import { requireAdmin,requireEmployeeOrAdmin,authenticateToken } from '../../../middleware/authmiddleware';
const router=express.Router();

router.post('/registeruser',authenticateToken,requireAdmin,registerUser);

router.get('/getallusers',authenticateToken,requireAdmin,getAllUsers);
router.get('/getuserbyid/:userid',authenticateToken,requireEmployeeOrAdmin,getUserById);

router.put('/updateuserinfo/:userid',authenticateToken,requireEmployeeOrAdmin,updateUserInfo);
router.put('/restoreusers/:userid',authenticateToken,requireAdmin,restoreDeletedUsers);

router.delete('/deleteallusers',authenticateToken,requireAdmin,deleteAllUsers);
router.delete('/deleteuserbyid/:userid',authenticateToken,requireAdmin,deleteUserById);


export default router;




















































