import mongoose from 'mongoose';
import Counter from '../models/counter.model';

export const getNextSequence=async (counterName:String,session?:mongoose.ClientSession):Promise<number>=>{
    const counter=await Counter.findByIdAndUpdate(
        counterName,
        {$inc:{sequencecounter:1}},
        {new:true,upsert:true}
    );
    return counter.sequencecounter;
};