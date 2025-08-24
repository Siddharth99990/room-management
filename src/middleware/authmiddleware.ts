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
            const decoded=jwt.verify(token,secret)as JwtPayload;
            req.user=decoded;
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
        return res.status(401).json({success:false,
            message:"Access denied cannot perform this action"
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
        message:"You can only view and update your own information"
    });
}

export const requirePasswordChange=(req:Request,res:Response,next:NextFunction)=>{
    if(!req.user){
        return res.status(401).json({
            success:false,
            message:"Authentication required"
        });
    }

    if(req.user.isTemporaryPassword){
        return res.status(400).json({
            success:false,
            message:"change password to access",
            requiresPasswordChange:true,
            userid:req.user.userid,
            email:req.user.email
        });
    }
    next();
}

export const allowPasswordChangeOnly=(req:Request,res:Response,next:NextFunction)=>{
    if(!req.user){
        return res.status(401).json({
            success:false,
            message:"Authentication required"
        });
    }
    next();
}

export const errorHandler=(
    err:any,
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    if(err instanceof SyntaxError && "body" in err){
        return res.status(400).json({
            success:false,
            message:"Malformed JSON in request body"
        });
    }
};