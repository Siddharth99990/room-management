import { Request,Response } from "express";
import { loginUserService } from "./auth.service";

export const userLogin=async(req:Request,res:Response)=>{
    try{
        const {email,password}=req.body;
        const {user,token}=await loginUserService({email,password});

        res.cookie("token",token,{
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV==="production",
            maxAge:24*60*60*1000
        }).status(200).json({
            success:true,
            message:"Login Successful",
            data:{user}
        });
    }catch(err:any){
        res.status(err.statusCode||400).json({
            success:false,
            message:err.message,
            error:err.errors||[err.message]
        });
    }
};

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