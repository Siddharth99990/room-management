import { Request,Response } from "express";
import { changePasswordService, loginUserService } from "./auth.service";
import { authValidationError, validateChangePasswordData } from "./auth.validation";
import { bookingValidationError } from "../../bookings/v1/booking.validation";
import { validationError } from "../../users/v1/user.validation";

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
        const result=await changePasswordService(validatedData);

        res.cookie("token",result.token,{
            httpOnly:true,
            sameSite:"lax",
            secure:process.env.NODE_ENV==="production",
            maxAge:24*60*60*1000
        }).status(200).json({
            success:true,
            message:result.message,
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