<<<<<<< Updated upstream
import { Request,Response } from 'express';
import { createRoomService,getRoomsService,getRoomByIdService, updateRoomInfoService,deleteRoomService, restoreRoomService } from './room.service';
import { validateRegisterData,roomValidationError,validateUpdateData } from './room.validation';

//registerroom
export const createRoom=async(req:Request,res:Response)=>{
    try{
        const validatedData=validateRegisterData(req.body);
        const room=await createRoomService(
            validatedData.roomname,
            validatedData.roomlocation,
            validatedData.capacity,
            validatedData.equipment,
        )
        return res.status(201).json(
            {success:true,
            message:"Room created Successfully",
            data:room
        });
    }catch(err:any){
        console.error("Error creating room",err.message);
        if(err instanceof roomValidationError){
            console.error("There was an error creating the room",err.errors);
            return res.status(err.statusCode).json({
                success:false,
                message:"Something went wrong",
                errors:err.errors
            });
        }
        if(err.code===11000 && err.keyPattern?.roomname){
            console.error("There was an error creating the room: the room is duplicate");
            return res.status(400).json({
                success:false,
                message:"Duplicate value",
                errors:"The roomname you entered is a duplicate"
            });
        }
    }
};

//find all rooms
export const getAllRoooms=async(req:Request,res:Response)=>{
    try{
        const roomresult=await getRoomsService();
        res.status(200).json({
            success:true,
            message:"Successfully fetched the rooms data",
            rooms:roomresult
        });
    }catch(err:any){
        console.error("There was an error fetching the rooms:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error fetching the rooms data",
            error:err.message
        });
    }
};

//find room by id
export const getRoomById=async(req:Request,res:Response)=>{
    try{
        const roomresult=await getRoomByIdService(Number(req.params.roomid));
        res.status(200).json({
            success:true,
            message:"Successfully retrieved room",
            room:roomresult
        });
    }catch(err:any){
        console.error("There was an error fetching the room:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error fetching the room",
            error:err.message
        });
    }
}

//update room info
export const updateRoomInfo=async(req:Request,res:Response)=>{
    try{
        const {roomname,roomlocation,capacity,equipment}=req.body;
        const validatedData=validateUpdateData({roomname,
                                                  roomlocation,
                                                  capacity,
                                                  equipment});

        const updatedInfo=await updateRoomInfoService(Number(req.params.roomid),validatedData);
        res.status(200).json({
            success:true,
            message:"The room information has been successfully updated",
            updatedInfo:updatedInfo
        });
    }catch(err:any){
        console.error("There was an error updating room information:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error in updating room information",
            error:err.message
        });
    }
};

//delete room
export const deleteRoom=async(req:Request,res:Response)=>{
    try{
        const result=await deleteRoomService(Number(req.params.roomid));
        res.status(200).json({
            success:true,
            message:"The room has been successfully deleted",
            deletedroomdata:result
        });
    }catch(err:any){
        console.error("There was an error deleting the room:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error deleting the room",
            error:err.message
        });
    }
}

//restore room
export const restoreRoom=async(req:Request,res:Response)=>{
    try{
        const result=await restoreRoomService(Number(req.params.roomid));
        res.status(200).json({
            success:true,
            message:"The room has been successfully restored",
            restoredroom:result.roomname
        });
    }catch(err:any){
        console.error("There was an error restoring the room",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error restoring the room",
            error:err.message
        });
    }
};
=======
import { Request,Response } from 'express';
import { createRoomService,getRoomsService,getRoomByIdService, updateRoomInfoService,deleteRoomService} from './room.service';
import { validateRegisterData,roomValidationError,validateUpdateData } from './room.validation';
import { errors } from 'mongodb-memory-server';

//registerroom
export const createRoom=async(req:Request,res:Response)=>{
    try{
        const validatedData=validateRegisterData(req.body);
        const room=await createRoomService(
            validatedData.roomname,
            validatedData.roomlocation,
            validatedData.capacity,
            validatedData.equipment,
        )
        return res.status(201).json(
            {success:true,
            message:"Room created Successfully",
            data:room
        });
    }catch(err:any){
        console.error("Error creating room",err.message);
        if(err instanceof roomValidationError){
            console.error("There was an error creating the room",err.errors);
            return res.status(err.statusCode).json({
                success:false,
                message:"Something went wrong",
                errors:err.errors
            });
        }
        if(err.code===11000 && err.keyPattern?.roomname){
            console.error("There was an error creating the room: the room is duplicate");
            return res.status(400).json({
                success:false,
                message:"Duplicate value",
                errors:"The roomname you entered is a duplicate"
            });
        }
    }
};

//find all rooms
export const getAllRoooms=async(req:Request,res:Response)=>{
    try{
        const roomresult=await getRoomsService();
        res.status(200).json({
            success:true,
            message:"Successfully fetched the rooms data",
            rooms:roomresult
        });
    }catch(err:any){
        console.error("There was an error fetching the rooms:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error fetching the rooms data",
            error:err.message
        });
    }
};

//find room by id
export const getRoomById=async(req:Request,res:Response)=>{
    try{
        const roomresult=await getRoomByIdService(Number(req.params.roomid));
        res.status(200).json({
            success:true,
            message:"Successfully retrieved room",
            room:roomresult
        });
    }catch(err:any){
        console.error("There was an error fetching the room:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error fetching the room",
            error:err.message
        });
    }
}

//update room info
export const updateRoomInfo=async(req:Request,res:Response)=>{
    try{
        const {roomname,roomlocation,capacity,equipment}=req.body;
        const validatedData=validateUpdateData(req.body);

        const updatedInfo=await updateRoomInfoService(Number(req.params.roomid),validatedData);
        res.status(200).json({
            success:true,
            message:"The room information has been successfully updated",
            updatedInfo:updatedInfo
        });
    }catch(err:any){
        console.error("There was an error updating room information:",err.message);
        if(err instanceof roomValidationError){
            res.status(400).json({
            success:false,
            message:"There was an error in updating room information",
            error:err.errors
        });
        }
    }
};

//delete room
export const deleteRoom=async(req:Request,res:Response)=>{
    try{
        const result=await deleteRoomService(Number(req.params.roomid));
        res.status(200).json({
            success:true,
            message:"The room has been successfully deleted",
            deletedroomdata:result
        });
    }catch(err:any){
        console.error("There was an error deleting the room:",err.message);
        res.status(400).json({
            success:false,
            message:"There was an error deleting the room",
            error:err.message
        });
    }
}

//restore room
// export const restoreRoom=async(req:Request,res:Response)=>{
//     try{
//         const result=await restoreRoomService(Number(req.params.roomid));
//         res.status(200).json({
//             success:true,
//             message:"The room has been successfully restored",
//             restoredroom:result.roomname
//         });
//     }catch(err:any){
//         console.error("There was an error restoring the room",err.message);
//         res.status(400).json({
//             success:false,
//             message:"There was an error restoring the room",
//             error:err.message
//         });
//     }
// };
>>>>>>> Stashed changes
