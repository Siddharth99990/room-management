import mongoose from "mongoose";
import { getNextSequence } from "../../counters/helper/getNextSequence";
import Booking from '../../../models/booking.model';
import { bookingValidationError, validateBookingUpdateData } from "./booking.validation";
import roomModel from "../../../models/room.model";
import bookingInterface from '../../../models/room.model'
import User from '../../../models/user.model';
import userModel from "../../../models/user.model";

interface createBookingData{
    starttime:Date;
    endtime:Date;
    roomid:number;
    userid:number;
    attendees?:any[]|undefined;
}

interface updateBookingData{
    starttime?:Date;
    endtime?:Date;
    status?:'cancelled'|'pending'|'confirmed';
}

//conflict check
export const checkBookingConflicts=async(roomid:number,starttime:Date,endtime:Date,excludeBookingId?:number,session?:mongoose.ClientSession):Promise<Boolean>=>{
    const conflitQuery:any={
        roomid:roomid,
        status:{$ne:'cancelled'},
        $or:[{
            starttime:{$lte:starttime},
            endtime:{$gt:starttime}
        },
        {
            starttime:{$lt:endtime},
            endtime:{$gte:endtime}
        },
        {
            starttime:{$gte:starttime},
            endtime:{$lte:endtime}
        }]
    };

    if(excludeBookingId){
        conflitQuery.bookingid={$ne:excludeBookingId}
    }
    const conflicts=await Booking.find(conflitQuery).session(session||null);
    return conflicts.length>0;
};

//create booking
export const createBookingService=async(
    bookingData:createBookingData,
    currentUserId:number
)=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const{starttime,endtime,roomid,userid,attendees}=bookingData;

        const room=await roomModel.findOne({roomid}).session(session);
        if(!room){
            throw new bookingValidationError("Room not found",["The specified room does not exist"]);
        }

        const user=await userModel.findOne({userid}).session(session);
        if(!user){
            throw new bookingValidationError("User not found",["The specified user does not exist"]);
        }

        const hasConflict=await checkBookingConflicts(roomid,starttime,endtime,undefined,session);
        if(hasConflict){
            throw new bookingValidationError("Time slot conflicts with existing booking",["There is a conflict in booking timings"]);
        }

        if(attendees && attendees.length>room.capacity){
            throw new Error(`Number of attendees (${attendees.length}) exceeds room capacity(${room.capacity})`);
        }

        let processedAttendees:any[]=[];
        if(attendees && attendees.length>0){
            const userIds=attendees.map(a=>a.userid);
            const uniqueUserIds=[...new Set(userIds)];
            if(userIds.length!==uniqueUserIds.length){
                throw new Error('Duplicate attendees are not allowed');
            }

            for(const attendee of attendees){
                const attendeeUser=await User.findOne({userid:attendee.userid}).session(session);
                if(!attendeeUser){
                    throw new Error(`Attendee with ID ${attendee.userid} not found`);
                }
                processedAttendees.push({
                    userid:attendee.userid,
                    name:attendee.name,
                    status:attendee.status||'invited'
                });
            }
        }
        const nextBookingId=await getNextSequence('bookingid',session);

        try{
            await Booking.create({
                bookingid:nextBookingId,
                starttime,
                endtime,
                roomid:roomid,
                createdBy:{userid:user.userid,name:user.name},
                attendees:processedAttendees||[],
                status:'pending'
            },{session});
        }catch(err:any){
            if(err.code===11000){
                throw new bookingValidationError("Time slot conflicts with existing booking",["There is a conflict in booking timings"]);
            }
            throw err;
        }
        await session.commitTransaction();

        const populatedBooking=await Booking.findOne({bookingid:nextBookingId})
        .populate('roomid','name capacity roomlocation')
        .select("-_id -__v -updatedAt ");

        return populatedBooking;
    }catch(error){
        await session.abortTransaction();
        throw error;
    }finally{
        session.endSession();
    }
    
}

//get all bookings
export const getBookingsService=async()=>{
    const bookings=await Booking.find({status:{$ne:'cancelled'}}).select("-_id -__v -updatedAt -createdAt -attendees._id -attendees.acceptedAt");
    if(!bookings){
        throw new Error("There are currently no bookings");
    }
    return bookings.map(booking=>booking.toObject());
}

//bookings by id
export const getBookingByIdService=async(bookingid:number)=>{
    const booking=await Booking.findOne({bookingid}).select("-_id -__v -updatedAt -createdAt -attendees._id -attendees.acceptedAt");
    if(!booking){
        throw new Error("The Booking you are trying to find either does not exist or is cancelled");
    }
    return booking;
}

//update times or status
export const updateStatusandTimingsService=async(bookingid:number,currentuserId:number,data:Partial<updateBookingData & {attendees?:any[]}>)=>{
    const booking=await Booking.findOne({bookingid});
    if(!booking){
        throw new Error("The booking you are trying to update either does not exist or is cancelled");
    }
    if(booking.createdBy.userid!==currentuserId){
        throw new Error("Bookings can only be updated by the creator");
    }

    const updates=await validateBookingUpdateData(data,booking.roomid);

    if(updates.starttime && updates.endtime){
        const hasConflict=await checkBookingConflicts(
            booking.roomid,
            updates.starttime,
            updates.endtime,
            bookingid
        );
        if(hasConflict){
            throw new Error("Updated timings conflict with another booking");
        }
    }
    const updateddata=await Booking.findOneAndUpdate({bookingid},
        {$set:updates},
        {new:true}
    ).select("-_id -__v -createdAt -attendees._id -attendees.acceptedAt");
    
    return updateddata;
}

//get available rooms
export const getAvailableRoomsService=async(
    starttime:Date,
    endtime:Date
)=>{
    if(!starttime||!endtime){
        throw new Error("Start time and end time are required");
    }

    if(starttime>=endtime){
        throw new Error("Start time must be before end time");
    }

    if(starttime<new Date()){
        throw new Error("Start time cannot be in the past");
    }

    const conflictingBookings=await Booking.find({
        status:{$in:["pending","confirmed"]},
        $or:[
           {
                starttime: { $lte: starttime },
                endtime: { $gt: starttime }
            },
            {
                starttime: { $lt: endtime },
                endtime: { $gte: endtime }
            },
            {
                starttime: { $gte: starttime },
                endtime: { $lte: endtime }
            },
            {
                starttime: { $lte: starttime },
                endtime: { $gte: endtime }
            }
        ]
    }).select("roomid");

    const bookedRoomIds=conflictingBookings.map(booking=>booking.roomid);

    const availableRooms=await roomModel.find({
        roomid:{$nin:bookedRoomIds},
        $or:[
            {isDeleted:{$ne:true}},
            {isDeleted:{$exists:false}}
        ]
    }).select("-_id -__v -createdAt -updatedAt -isDeleted -deletedAt");

    if(!availableRooms||availableRooms.length===0){
        return{
            message:"No rooms available for the requested time slot",
            requestedTimeSlot:{
                starttime,
                endtime
            }
        };
    }

    return{
        message:`${availableRooms.length} rooms available for the requested time slot`,
        availableRooms:availableRooms.map(room=>room.toObject())
    };
}
