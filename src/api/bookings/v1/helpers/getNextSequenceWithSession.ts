import Counter from '../../../../models/counter.model';
import mongoose from 'mongoose';

export const getNextSequenceWithSession = async (sequenceName: string, session: mongoose.ClientSession): Promise<number> => {
    // Assuming you have a Counter collection for sequence generation
    const counter = await Counter.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequencecounter: 1 } },
        { 
            new: true, 
            upsert: true,
            session 
        }
    );
    
    return counter.sequencecounter;
};