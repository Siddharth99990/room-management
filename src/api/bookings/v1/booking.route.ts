import { Router } from "express";
import { createBooking,getallbookings,getbookingbyid, updateStatusAndTimings,getAvailableRooms } from "./booking.controller";
import { authenticateToken,requireAdmin,requireEmployeeOrAdmin,requirePasswordChange } from "../../../middleware/authmiddleware";

const router=Router();

router.post('/booking',authenticateToken,requirePasswordChange,createBooking);

router.get('/bookings',authenticateToken,requirePasswordChange,getallbookings);

router.get('/availablerooms',authenticateToken,requirePasswordChange,getAvailableRooms);

router.get('/:bookingid',authenticateToken,requirePasswordChange,getbookingbyid);

router.put('/:bookingid',authenticateToken,requirePasswordChange,updateStatusAndTimings);

export default router;
