import jwt,{JwtPayload} from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../../../models/user.model';
import { validateLoginData,validateTokenFormat,authValidationError } from './auth.validation';

interface loginCredentials{
    email:string;
    password:string;
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
            isTemporaryPassword:user.isTemporaryPassword||false
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