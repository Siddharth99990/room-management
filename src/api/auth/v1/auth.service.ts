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
    createdAt?:Date;
    updatedAt?:Date;
}

export const loginUserService=async(credentials:loginCredentials)=>{
        const validatedCredentials=validateLoginData(credentials);
        const {email,password}=validatedCredentials;

        const user=await User.findOne({email}).select('+password');
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
            role:user.role
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
    
    return{
        user:userResponse,
        token
    }
};