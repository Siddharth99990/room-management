import userroutes from './users/v1/user.route';
import express from 'express';
import authroutes from './auth/v1/auth.routes';
import roomroutes from './rooms/v1/room.route';
import bookingroutes from './bookings/v1/booking.route'

const router=express.Router();

router.use('/users/v1',userroutes);

router.use('/auth/v1',authroutes);

router.use('/rooms/v1',roomroutes);

router.use('/booking/v1',bookingroutes);

export default router;
