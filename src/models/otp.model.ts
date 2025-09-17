import mongoose,{Document,Schema} from "mongoose";
import bcrypt from 'bcrypt';

export interface OTPInterface extends Document{
    email:string;
    otp:string;
    createdAt:Date;
    expiresAt:Date;
}

const OTPSchema:Schema=new Schema<OTPInterface>({
    email:{type:String,required:true},
    otp:{type:String,required:true},
    createdAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true },
});

OTPSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

OTPSchema.pre('save', async function(this: OTPInterface, next) {
    if (!this.isModified('otp')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.otp = await bcrypt.hash(this.otp.toString(), salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

export default mongoose.default.model<OTPInterface>('OTP',OTPSchema);