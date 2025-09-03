import mongoose from "mongoose";

export const connectDatabase=async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Successfully connected to MongoDB");
    }catch(err:any){
        console.error("Was not able to connect to MongoDB due to some error ",err.message);
        process.exit(1);
    }
}