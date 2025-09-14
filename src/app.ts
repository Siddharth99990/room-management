import express, { NextFunction,Request,Response } from 'express';
import {connectDatabase} from './config/connectDatabase';
import dotenv from 'dotenv';
import routes from './api/index';
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/authmiddleware';
import cors from 'cors';

dotenv.config();

const corsOptions = {
  origin:true,
  credentials: true,  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ]
};


const app=express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api',routes);
app.use(errorHandler);


export default app;