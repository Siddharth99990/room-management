import { Router } from "express";
import { createRoom,deleteRoom,getAllRoooms,getRoomById,restoreRoom,updateRoomInfo } from "./room.controller";
import { authenticateToken, requireAdmin } from "../../../middleware/authmiddleware";
const router=Router();

//create
router.post('/createroom',authenticateToken,requireAdmin,createRoom);

//find
router.get('/getrooms',authenticateToken,requireAdmin,getAllRoooms);

//find by id
router.get('/getroom/:roomid',authenticateToken,requireAdmin,getRoomById);

//update room info
router.put('/updateroominfo/:roomid',authenticateToken,requireAdmin,updateRoomInfo);

//delete room
router.delete('/deleteroom/:roomid',authenticateToken,requireAdmin,deleteRoom);

//restore room
router.put('/restoreroom/:roomid',authenticateToken,requireAdmin,restoreRoom);

export default router;
