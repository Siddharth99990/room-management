import mongoose from "mongoose";

export const connectDatabase=async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Successfully connected to MongoDB");
    }catch(err){
        console.error("Was not able to connect to MongoDB due to some error ",err);
        process.exit(1);
    }
}