import express from 'express';
import {connectDatabase} from './config/connectDatabase';
import dotenv from 'dotenv';
import routes from './api/index';
import cookieParser from 'cookie-parser'

dotenv.config();

const app=express();
app.use(express.json());
app.use(cookieParser());

const PORT=process.env.PORT;

connectDatabase();

app.use('/api',routes);

app.listen(PORT,()=>{
    console.log(`Server active on port ${PORT}`);
});