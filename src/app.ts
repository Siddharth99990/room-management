import express, { NextFunction,Request,Response } from 'express';
import {connectDatabase} from './config/connectDatabase';
import dotenv from 'dotenv';
import routes from './api/index';
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/authmiddleware';

dotenv.config();

const app=express();
app.use(express.json());
app.use(errorHandler);
app.use(cookieParser());
app.use('/api',routes);


export default app;