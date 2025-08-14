import userroutes from './users/v1/user.route';
import express from 'express';
import authroutes from './auth/v1/auth.routes';

const router=express.Router();

router.use('/users/v1',userroutes);

router.use('/auth/v1',authroutes);

export default router;
