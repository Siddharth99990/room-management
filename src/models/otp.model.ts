import mongoose,{Document,Schema} from "mongoose";

export interface OTPInterface extends Document{
    email:string;
    otp:string;
    createdAt:Date;
    expiresAt:Date;
}

const OTPSchema:Schema=new Schema({
    email:{type:String,required:true},
    otp:{type:String,required:true},
    createdAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true },
});

export default mongoose.default.model<OTPInterface>('OTP',OTPSchema);