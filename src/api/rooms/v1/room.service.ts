import mongoose from "mongoose";
import User from '../../../models/user.model';
import Room,{roomInterface} from "../../../models/room.model";
import { getNextSequence } from "../../../utils/getNextSequence";
import { roomValidationError } from "./room.validation";

//create rooms
export const createRoomService=async(roomname:string,roomlocation:string,capacity:number,equipment:string[])=>{
    const existingroom=await Room.findOne({roomname});
    if(existingroom){
        throw new roomValidationError("Room validation failed",["The roomname you entered is a duplicate"]);
    }
    const nextid=await getNextSequence('roomid');
    const newRoom=await Room.create({
        roomid:nextid,
        roomname,
        roomlocation,
        capacity,
        equipment,
    });
    const roomResponse=newRoom.toObject()as any;
    delete roomResponse.__v;
    delete roomResponse._id;
    delete roomResponse.updatedAt;
    delete roomResponse.isDeleted;
    delete roomResponse.deletedAt;

    return roomResponse;
}

//find all rooms
export const getRoomsService=async()=>{
    const roomList=await Room.find().select("-_id -__v -createdAt -updatedAt -isDeleted -deletedAt");
    if(!roomList || roomList.length===0){
        throw new Error("There are no rooms created");
    }
    return roomList;    
};

//find rooms by id
export const getRoomByIdService=async(roomid:number)=>{
    if(typeof roomid!=='number' || isNaN(roomid)){
        throw new Error("Please enter a valid room id");
    }
    const room=await Room.findOne({roomid}).select("-_id -__v -createdAt -updatedAt -isDeleted -deletedAt");
    if(!room){
        throw new Error("The room you are trying to find does not exist");
    }
    return room;
};

//update by id
export const updateRoomInfoService=async(roomid:number,updateData:any)=>{
    const updatedRoom=await Room.findOneAndUpdate({roomid},
        {$set:updateData},
        {new:true,runValidators:true,projection:{_id:0,__v:0,createdAt:0}}
    );

    if(!updatedRoom){
        throw new roomValidationError("Room validation failed",["The room you were trying to update does not exist"]);
    }

    return updatedRoom;
}

//delete by id
export const deleteRoomService=async(roomid:number)=>{
    if(typeof roomid!=='number' || isNaN(roomid)){
        throw new Error("please enter a valid roomid");
    }
    const revokedRoom=await Room.findOneAndUpdate({
            roomid,
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
        },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true ,projection:{_id:0,__v:0,createdAt:0}}
    )as any;

    if(!revokedRoom){
        throw new Error("The room you are trying to delete either does not exist or is already deleted");
    }

    return revokedRoom;
}

//restore 
// export const restoreRoomService=async(roomid:number)=>{
//     const room=await Room.collection.findOne({roomid,$or:[{isDeleted:false},{isDeleted:{$exists:false}}]});

//     if(room){
//         throw new Error("The room you are trying to restore is already active");
//     }
    
//     const deletedRoom=await Room.collection.findOneAndUpdate({
//         roomid,
//         $or:[{isDeleted:true},{isDeleted:{$exists:true}}]},
//         {$set:{isDeleted:false, deletedAt:null}}
//     );

//     if(!deletedRoom){
//         throw new Error("The room you are trying to restore either does not exist or is already restored");
//     }

//     return deletedRoom;
// };
