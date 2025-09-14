import jwt,{JwtPayload} from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../../../models/user.model';
import OTP from '../../../models/otp.model';
import { validateLoginData,validateTokenFormat,authValidationError } from './auth.validation';
import { sendEmail } from '../../../utils/email.util';

interface loginCredentials{
    email:string;
    password:string;
}

interface forgetPasswordCredentials{
    email:string;
    otp:number;
    newPassword:string;
    confirmNewPassword:string;
}

interface safeUserResponse{
    userid:number;
    name:string;
    email:string;
    role:string;
    isTemporaryPassword?:Boolean;
    createdAt?:Date;
    updatedAt?:Date;
}

interface changePasswordCredentials{
    email:string,
    oldPassword:string,
    newPassword:string
}

export const loginUserService=async(credentials:loginCredentials)=>{
        const validatedCredentials=validateLoginData(credentials);
        const {email,password}=validatedCredentials;

        const user=await User.collection.findOne({email});
        if(!user){
            throw new authValidationError("Invalid email or password",["User not found"]);
        }
        if(user.isDeleted){
            throw new authValidationError("Account is deactivated please contact an admin",["Account is deleted"]);
        }
        const isPasswordValid=await bcrypt.compare(password,user.password);
        if(!isPasswordValid){
            throw new authValidationError("Invalid email or password",["Password mismatch"]);
        }
        const jwtSecret=process.env.JWT_SECRET;
        if(!jwtSecret){
            throw new Error("JWT token is not present in the environment variables");
        }

        const tokenPayload:object={
            userid:user.userid,
            email:user.email,
            role:user.role,
            isTemporaryPassword:user.isTemporaryPassword
        };
        const expiresvalue=process.env.JWT_EXPIRES_IN||'24h'
        const token=jwt.sign(
            tokenPayload,
            jwtSecret,
            {expiresIn:expiresvalue as jwt.SignOptions['expiresIn']||'24h'}
        );

        const userResponse:safeUserResponse={
            userid:user.userid,
            name:user.name,
            email:user.email,
            role:user.role,
            isTemporaryPassword:user.isTemporaryPassword
        };

        if(user.isTemporaryPassword){
            return{
                user:userResponse,
                statusCode:200,
                requiresPasswordChange:true,
                message:"Change password to login",
                token
            };
        }
    
    return{
        user:userResponse,
        token
    }
};

export const changePasswordService=async(credentials:changePasswordCredentials)=>{
    const{email,oldPassword,newPassword}=credentials;

    const user=await User.findOne({email}).select('+password');

    if(!user){
        throw new authValidationError("Invalid credentials",["User not found"]);
    }

     if(user.isDeleted){
        throw new authValidationError("Account is deactivated please contact an admin");
    }

    const isOldPassValid=await bcrypt.compare(oldPassword,user.password);
    if(!isOldPassValid){
        throw new authValidationError("Invalid Password",["Old password does not match"]);
    }

    const isSamePassword=await bcrypt.compare(newPassword,user.password);

    if(isSamePassword){
        throw new authValidationError("New password cannot be the old password",["Password must be different"]);
    }

    user.password=newPassword;
    await user.save();

    const jwtSecret=process.env.JWT_SECRET;
    if(!jwtSecret){
        throw new Error("Jwt secret is not present in the environment variables");
    }

    const tokenPayload:object={
        userid:user.userid,
        email:user.email,
        role:user.role,
        isTemporaryPassword:false
    };
    const expiresvalue=process.env.JWT_EXPIRES_IN||'24h'
    const token=jwt.sign(tokenPayload,
        jwtSecret,
        {expiresIn:expiresvalue as jwt.SignOptions['expiresIn']||'24h'}
    );

    const userResponse:safeUserResponse={
        userid:user.userid,
        name:user.name,
        email:user.email,
        role:user.role,
        isTemporaryPassword:false
    };

    return{
        user:userResponse,
        token,
        message:"Password changed successfully"
    };
};

export const forgetPasswordService=async(email:string)=>{
    const user=await User.findOne({email});
    if(!user){
        throw new authValidationError("Invalid email",["User not found"]);
    }

    const otp=crypto.randomInt(10000,999999).toString();
    const otpExpires=new Date(Date.now()+10*60*1000);

    await OTP.create({
        email,
        otp,
        expiresAt:otpExpires
    });

    sendEmail({
        to:email,
        subject:"Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}`
    });

    return {
        message:"OTP sent to your email"
    };
};

export const resetPasswordService = async (email: string, otp: string, newPassword: string) => {
    const otpDoc = await OTP.findOne({ email, otp });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
        throw new authValidationError("Invalid or expired OTP", ["Invalid or expired OTP"]);
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new authValidationError("User not found", ["User not found"]);
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpDoc._id });


    return {
        message: "Password has been reset successfully.",
    };
};