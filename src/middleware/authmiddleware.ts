import { Request,Response,NextFunction } from "express";
import jwt,{JwtPayload}from 'jsonwebtoken';

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken=(req:Request,res:Response,next:NextFunction)=>{
        const token=req.cookies?.token;

        if(!token){
            return res.status(401).json({
                success:false,
                message:"Access token is required",
                error:"No token provided"
            });
        }
        const secret=process.env.JWT_SECRET;
        if(!secret){
            throw new Error("JWT secret is not configured");
        }
        try{
            const decoded=jwt.verify(token,secret);
            (req as any).user=decoded;
            next();
        }catch(err:any){
        return res.status(403).json({
            success:false,
            message:"Invalid or expired token",
            error:err.message
        });
    }
};

export const requireAdmin=(req:Request,res:Response,next:NextFunction)=>{
    if(!req.user||req.user.role.toLowerCase()!=="admin"){
        return res.status(403).json({success:false,
            message:"Admin access required to perform this action"
        });
    }
    next();
}

export const requireEmployeeOrAdmin=(req:Request,res:Response,next:NextFunction)=>{
    if(!req.user){
        return res.status(401).json({
            success:false,
            message:"Authentication required"
        });
    }
    const requestedUserId=Number(req.params.userid);
    const currentUserId=req.user.userid;
    const role=req.user.role.toLowerCase();

    if(role==="admin"||(role==="employee"&& currentUserId===requestedUserId)){
        return next();
    }
    return res.status(403).json({
        success:false,
        message:"You can only update your own information, admin access required to update any other"
    });
}