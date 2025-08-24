<<<<<<< Updated upstream
import { Router } from "express";
import { createBooking,getallbookings,getAvailableRooms,getbookingbyid, updateStatusAndTimings } from "./booking.controller";
import { authenticateToken,requireAdmin,requireEmployeeOrAdmin,requirePasswordChange } from "../../../middleware/authmiddleware";

const router=Router();

router.post('/createbooking',authenticateToken,requirePasswordChange,createBooking);

router.get('/getbookings',authenticateToken,requirePasswordChange,getallbookings);

router.get('/getbookingbyid/:bookingid',authenticateToken,requirePasswordChange,getbookingbyid);

router.put('/updatestatusortimings/:bookingid',authenticateToken,requirePasswordChange,updateStatusAndTimings);

router.get('/availablerooms',authenticateToken,requirePasswordChange,getAvailableRooms);
export default router;
=======
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
>>>>>>> Stashed changes
