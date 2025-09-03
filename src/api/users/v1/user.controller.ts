import { Request,Response } from 'express';
import { createUserService ,
        getUsersService,
        finduserByIdService,
        updateUserInfoService,
        softDeleteUsersByIdService} from './user.service';
import {validationError,validateUserRegistrationData,validateUserUpdateData} from './user.validation';
import User from '../../../models/user.model';
import { errors } from 'mongodb-memory-server';


//create
export const registerUser= async(req:Request,res:Response)=>{
    try{
        const validatedData=validateUserRegistrationData(req.body);
        const user=await createUserService(
            validatedData.name,
            validatedData.email,
            validatedData.password,
            validatedData.role
        );
        
        return res.status(201).json({
            success:true,
            message:"User validated successfully",
            data:user
        });
    }catch(err:any){
        console.error("error registering",err);
        if(err instanceof validationError){
            return res.status(err.statusCode).json(
                {success:false,
                message:"Something went wrong",
                errors:err.errors
            });
        }
        if(err.code===11000 && err.keyPattern?.email){
            return res.status(400).json({
                success:false,
                message:"The email entered is a duplicate",
                error:"The email you provided is a duplicate value please provide a valid email"
            });
        }
        return res.status(400).json({
            success:false,
            message:"Something went wrong",
            error:err.message
        });
    }
};

//read
export const getAllUsers=async(req:Request,res:Response)=>{
    try{
        const users=await getUsersService();
        return res.status(200).json(users);
    }
    catch(err:any){
        console.error("there was an error fetching the users");
        return res.status(404).json({message:"there was an internal server error",error:err.message});
    }
};

export const getUserById=async(req:Request,res:Response)=>{
    try{
        const userid=Number(req.params.userid);
        const result=await finduserByIdService(userid);
        return res.status(200).json(result);
    }catch(err:any){
        console.error("There was an error while retrieving the information: ",err.message);
        return res.status(404).json({message:`There was an error retrieving the information`,error:err.message});
    }
};

//update
export const updateUserInfo=async(req:Request,res:Response)=>{
    try{
        const {validatedData,userid}=validateUserUpdateData(req.body,Number(req.params.userid));
        const result=await updateUserInfoService(userid,validatedData);
        return res.status(200).json({
            success:true,
            message:"User updated successfully",
            data:result
        });
    }catch(err:any){
        console.error("There was an error updating the user information:",err.message);
        if(err instanceof validationError){
            return res.status(err.statusCode).json(
                {success:false,
                message:err.message,
                error:err.errors
            });
        }
        return res.status(404).json({
            success:false,
            message:"Error updating user information",
            error:err.message
        });
    }
}

//deletebyid
export const deleteUserById=async(req:Request,res:Response)=>{
    try{
        const result=await softDeleteUsersByIdService(Number(req.params.userid));
        return res.status(200).json(result);
    }catch(err:any){
        console.error("Error deleting user:",err.message);
        return res.status(404).json({
            message:"There was an error deleting user",
            error:err.message
        });
    }
};

/*restore
// export const restoreDeletedUsers=async(req:Request,res:Response)=>{
//     try{
//         const restoredusers=await restoreDeletedUsersService(Number(req.params.userid));
//         return res.status(200).json(restoredusers);
//     }catch(err:any){
//         console.error("There was an error restoring ",err.message);
//         return res.status(404).json({message:"There was an error while restoring the users",error:err.message});
//     }
 }*/

//delete all
/*export const deleteAllUsers=async(req:Request,res:Response)=>{
//     try{
//         const result=await softdeleteUsersService();
//         return res.status(200).json(result);
//     }catch(err:any){
//         console.error("Error deleting the users,",err.message);
//         return res.status(404).json({message:"There was an internal server error",error:err.message});
//     }
 };*/
