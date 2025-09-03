import mongoose from "mongoose";
import Room from '../../../models/room.model';

export class bookingValidationError extends Error{
    public statusCode:number;
    public errors:string[];

    constructor(message:string,errors:string[]=[]){
        super(message);
        this.name="BookingValidationError";
        this.statusCode=400;
        this.errors=errors;
    }
}

const validateDateTime=(dateTime:string|Date,fieldName:string):void=>{
    const errors:string[]=[];

    if(!dateTime){
        errors.push(`${fieldName} is required`);
    }
    const date=new Date(dateTime);

    if(isNaN(date.getTime())){
        errors.push(`${fieldName} must be a valid date`);
    }

    if(date<new Date()){
        errors.push(`${fieldName} date must be either higher or current date cannot be of past`);
    }

    if(errors.length>0){
        throw new bookingValidationError(`${fieldName} validation failed:`,errors);
    }
};

const validateTimeRange=(starttime:Date,endtime:Date):void=>{
    const errors:string[]=[];

    if(starttime>=endtime){
        errors.push("Start time cannot be after end time");
    }

    const duration=endtime.getTime()-starttime.getTime();
    const maxDuration=8*60*60*1000;

    if(duration>maxDuration){
        errors.push("The meeting duration cannot exceed 8 hours");
    }

    const minDuration=15*60*1000;
    if(duration<minDuration){
        errors.push("The meeting duration cannot be less than 15 minutes");
    }

    if(errors.length>0){
        throw new bookingValidationError("Time range validation failed",errors);
    }
};

const validateRoomId=(roomid:number):void=>{
    const errors:string[]=[];

    if(!roomid){
        errors.push("Room ID is required");
    }

    if(typeof roomid!=='number'||roomid<=0){
        errors.push("Invalid Room ID format");
    }

    if(errors.length>0){
        throw new bookingValidationError("Room ID validation failed",errors);
    }
};

const validateAttendees=(capacity?:number,attendees?:any[]):void=>{
    if(!attendees)return;

    const errors:string[]=[];

    if(capacity && attendees.length>capacity){
        errors.push(`Maximum ${capacity} attendees are allowed per booking`);
    }

    const userIds=attendees.map(a=>a.userid);
    const uniqueUserIds=new Set(userIds);

    if(userIds.length!==uniqueUserIds.size){
        errors.push("Duplicate attendees are not allowed");
    }

    attendees.forEach((attendee,index)=>{
        if(!attendee.userid||isNaN(attendee.userid)){
            errors.push(`Attendee ${index+1}:Invalid user ID`);
        }
        if(!attendee.name||attendee.name.trim().length===0){
            errors.push(`Attendee ${index+1}:Name is required`);
        }
        if(attendee.status && !['accepted','declined','invited'].includes(attendee.status)){
            errors.push(`Attendee ${index+1}: Invalid status`);
        }
    });

    if(errors.length>0){
        throw new bookingValidationError("Attendees validation failed",errors);
    }
};

const validateTitle = (title: string): void => {
    const errors: string[] = [];
    
    if (!title || title.trim().length === 0) {
        errors.push("Title is required");
    }
    
    if (title && title.length > 200) {
        errors.push("Title cannot exceed 200 characters");
    }
    
    if (errors.length > 0) {
        throw new bookingValidationError("Title validation failed", errors);
    }
};

export const validateCreateBookingData=async (data:{
    title:string;
    description?:string;
    starttime:string|Date;
    endtime:string|Date;
    roomid:number;
    attendees?:any[]|undefined;
}):Promise<{
    title:string;
    description?:string;
    starttime:Date;
    endtime:Date;
    roomid:number;
    attendees?:any[]|undefined;
}>=>{
    const {title,description,starttime,endtime,roomid,attendees}=data;

    validateTitle(title);

    validateDateTime(starttime,"Start time");
    validateDateTime(endtime,"End time");
    validateRoomId(roomid);

    const startDate=new Date(starttime);
    const endDate=new Date(endtime);

    validateTimeRange(startDate,endDate);

    let roomcapacity;

    if(attendees && attendees.length>0){
        try{
            const room=await Room.findOne({roomid:roomid});
            if(room){
                roomcapacity=room.capacity;
            }
        }catch(err:any){
            console.warn("Could not fetch room capacity",err);
        }
    }
    validateAttendees(roomcapacity,attendees);

    return{
        title:title,
        description:description as any,
        starttime:startDate,
        endtime:endDate,
        roomid,
        attendees
    };
};

export const validateBookingUpdateData=async(data:{
    title?:string;
    description?:string;
    starttime?:string|Date;
    endtime?:string|Date;
    status?:string,
    roomid?:number,
    attendees?:any[];
},currentRoomId?:number):Promise<{
    title?:string;
    description?:string;
    starttime?:Date;
    endtime?:Date;
    status?:'confirmed'|'cancelled';
    roomid?:Number;
    attendees?:any[];
}>=>{
    const updates:any={};

    if (data.title !== undefined) {
        validateTitle(data.title);
        updates.title = data.title.trim();
    }

    if (data.description !== undefined) {
        updates.description = data.description?.trim();
    }

    if(data.starttime!==undefined){
        validateDateTime(data.starttime,"Start time");
        updates.starttime=new Date(data.starttime);
    }

    if(data.endtime!==undefined){
        validateDateTime(data.endtime,"End time");
        updates.endtime=new Date(data.endtime);
    }

    if(updates.starttime && updates.endtime){
        validateTimeRange(updates.starttime,updates.endtime);
    }

    if(data.roomid!==undefined){
        validateRoomId(data.roomid);
        const newRoom=await Room.findOne({roomid:data.roomid});
        if(!newRoom){
            throw new bookingValidationError("Booking validation failed",[`The room you are trying to book does not exist`]);
        }
        updates.roomid=data.roomid;
    }

    if(data.status!==undefined){
        if(!['confirmed','cancelled'].includes(data.status)){
            throw new bookingValidationError("Status validation failed",["Invalid status provided"]);
        }
        updates.status=data.status;
    }

    if(data.attendees !== undefined){
        let roomcapacity;
        const roomIdToCheck=data.roomid ?? currentRoomId;

        if(roomIdToCheck && data.attendees.length>0){
                const room=await Room.findOne({roomid:roomIdToCheck});
                if(!room){
                    throw new bookingValidationError("Booking validation failed",["The room you are trying to book does not exist"]);
                }
                roomcapacity=room.capacity;
            }
        validateAttendees(roomcapacity,data.attendees);
        updates.attendees=data.attendees;
    }

    if(Object.keys(updates).length===0){
        throw new bookingValidationError("Update validation failed",["Atleast one field is required for update"]);
    }

    return updates;
};
