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

export const validateCreateBookingData=async (data:{
    starttime:string|Date;
    endtime:string|Date;
    roomid:number;
    attendees?:any[]|undefined;
}):Promise<{
    starttime:Date;
    endtime:Date;
    roomid:number;
    attendees?:any[]|undefined;
}>=>{
    const {starttime,endtime,roomid,attendees}=data;

    validateDateTime(starttime,"Start time");
    validateDateTime(endtime,"End time");
    validateRoomId(roomid);

    const startDate=new Date(starttime);
    const endDate=new Date(endtime);

    validateTimeRange(startDate,endDate);

    let roomcapacity;

    if(attendees && attendees.length>0){
        try{
            const room=await Room.findById({roomid});
            if(room){
                roomcapacity=room.capacity;
            }
        }catch(err:any){
            console.warn("Could not fetch room capacity",err);
        }
    }
    validateAttendees(roomcapacity,attendees);

    return{
        starttime:startDate,
        endtime:endDate,
        roomid,
        attendees
    };
};

export const validateBookingUpdateData=async(data:{
    starttime?:string|Date;
    endtime?:string|Date;
    status?:string,
    attendees?:any[];
},currentRoomId?:number):Promise<{
    starttime?:Date;
    endtime?:Date;
    status?:'pending'|'confirmed'|'cancelled';
    attendees?:any[];
}>=>{
    const updates:any={};

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

    if(data.status!==undefined){
        if(!['pending','confirmed','cancelled'].includes(data.status)){
            throw new bookingValidationError("Status validation failed",["Invalid status provided"]);
        }
        updates.status=data.status;
    }

    if(data.attendees !== undefined){
        let roomcapacity;
        const roomIdToCheck=currentRoomId;

        if(roomIdToCheck && data.attendees.length>0){
                const room=await Room.findOne({roomid:roomIdToCheck});
                if(room){
                    roomcapacity=room.capacity;
                }
            }
        validateAttendees(roomcapacity,data.attendees);
        updates.attendees=data.attendees;
    }

    if(Object.keys(updates).length===0){
        throw new bookingValidationError("Update validation failed",["Atleast one field is required for update"]);
    }

    return updates;
};
