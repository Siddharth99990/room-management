import { Request,Response } from "express";
import { changePasswordService, loginUserService, resetPasswordService,forgetPasswordService, deleteOwnAccountService } from "./auth.service";
import { authValidationError, validateChangePasswordData } from "./auth.validation";
import { bookingValidationError } from "../../bookings/v1/booking.validation";
import { validationError } from "../../users/v1/user.validation";
import User from '../../../models/user.model';

export const userLogin=async(req:Request,res:Response)=>{
    try{
        const {email,password}=req.body;
        const result=await loginUserService({email,password});

        if(result.requiresPasswordChange){
            return res.cookie("token",result.token,{
                httpOnly:true,
                sameSite:"strict",
                secure:process.env.NODE_ENV==="production",
                maxAge:24*60*60*1000
            }
            ).status(200).json({
                success:true,
                message:"login successful but please change password for all access",
                data:{user:result.user}
            });
        }
        res.cookie("token",result.token,{
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV==="production",
            maxAge:24*60*60*1000
        }).status(200).json({
            success:true,
            message:"Login Successful",
            data:{user:result.user}
        });
    }catch(err:any){
        if(err instanceof authValidationError){
            res.status(400).json({
                success:false,
                message:err.message,
                error:err.errors
            });
        }
        res.status(err.statusCode||400).json({
            success:false,
            message:err.message,
            error:err.errors||[err.message]
        });
    }
};

export const changePassword=async(req:Request,res:Response)=>{
    try{
        const validatedData=validateChangePasswordData(req.body);

        if(req.user?.email!==req.body.email){
            return res.status(403).json({
                success:false,
                message:"Cannot change other users password",
                error:"Cannot change other users password"
            });
        }
        const result=await changePasswordService(validatedData);

        return res.cookie("token",result.token,{
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV==="production",
            maxAge:24*60*60*1000
        }).status(200).json({
            success:true,
            message:result.message,
            data:{user:result.user}
        });
    }catch(err:any){
        if(err instanceof authValidationError){
            return res.status(400).json({
                success:false,
                message:err.message,
                error:err.errors
            });
        }
        return res.status(err.statusCode||400).json({
            success:false,
            message:err.message,
            error:err.errors
        });
    }
}

export const userLogout=(req:Request,res:Response)=>{
    res.clearCookie("token",{
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:"strict"
    });
    res.status(200).json({
        success:true,
        message:"LogOut successful"
    });
}

export const checkAuthStatus=async(req:Request,res:Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Not authenticated"
            });
        }
        const user=await User.findOne({
                userid:req.user.userid,
                isDeleted:{$ne:true}
        }).select('-password');

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        const userResponse={
            userid:user.userid,
            name:user.name,
            email:user.email,
            role:user.role,
            createdAt:user.createdAt,
            updatedAt:user.updatedAt
        };

        res.status(200).json({
            success:true,
            message:"Authentication verified",
            data:{user:userResponse}
        });
    }catch(err:any){
        console.error("Auth check error:",err);
        res.status(400).json({
            success:false,
            message:"Something went wrong",
            error:err.message
        });
    }
};

export const forgetPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const result = await forgetPasswordService(email);
        res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        if (err instanceof authValidationError) {
            res.status(400).json({
                success: false,
                message: err.message,
                error: err.errors,
            });
        }
        res.status(err.statusCode || 400).json({
            success: false,
            message: err.message,
            error: err.errors || [err.message],
        });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await resetPasswordService(email, otp, newPassword);
        res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        if (err instanceof authValidationError) {
            res.status(400).json({
                success: false,
                message: err.message,
                error: err.errors,
            });
        }
        res.status(err.statusCode || 400).json({
            success: false,
            message: err.message,
            error: err.errors || [err.message],
        });
    }
};

export const deleteOwnAccount = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const result = await deleteOwnAccountService(email, password);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (err: any) {
        if (err instanceof authValidationError) {
            return res.status(400).json({
                success: false,
                message: err.message,
                error: err.errors
            });
        }
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Internal Server Error",
            error: err.errors || [err.message || "Unknown error"]
        });
    }
};
