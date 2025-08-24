import express from 'express';
import { getAllUsers, registerUser,getUserById, updateUserInfo,deleteUserById} from './user.controller';
import { requireAdmin,requireEmployeeOrAdmin,authenticateToken, requirePasswordChange } from '../../../middleware/authmiddleware';
const router=express.Router();

//POST
router.post('/user',authenticateToken,requirePasswordChange,requireAdmin,registerUser);

//GET
router.get('/users',authenticateToken,requireAdmin,requirePasswordChange,getAllUsers);
router.get('/:userid',authenticateToken,requireEmployeeOrAdmin,requirePasswordChange,getUserById);

//PUT
router.put('/:userid',authenticateToken,requireEmployeeOrAdmin,requirePasswordChange,updateUserInfo);

//DELETE
router.delete('/:userid',authenticateToken,requireAdmin,requirePasswordChange,deleteUserById);

// router.delete('/deleteallusers',authenticateToken,requireAdmin,requirePasswordChange,deleteAllUsers);
export default router;




















































