import mongoose from "mongoose";
<<<<<<< Updated upstream
import { getNextSequence } from "../../counters/helper/getNextSequence";
=======
import { getNextSequence } from "../../../utils/getNextSequence";
>>>>>>> Stashed changes
import Booking from '../../../models/booking.model';
import { bookingValidationError, validateBookingUpdateData } from "./booking.validation";
import roomModel from "../../../models/room.model";
import bookingInterface from '../../../models/room.model'
import User from '../../../models/user.model';
import userModel from "../../../models/user.model";
<<<<<<< Updated upstream
=======
import { checkBookingConflicts } from "./helpers/conflictchecker.helper";
import { sendInvitation } from "../../../utils/email.util";

>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
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
=======
    status?:'cancelled'|'confirmed';
    roomid?:number;
}

interface paginatedBookingsResult{
    booking:any[];
    currentpage:number;
    totalpages:number;
    hasNextPage:boolean;
    hasPreviousPage:boolean;
    totalBookings:number;
    limit:number;
    sortBy:string;
    sortOrder:string;
}

interface paginationOptions{
    page:number;
    limit:number;
    sortBy:string;
    sortOrder:'asc'|'desc'
}
>>>>>>> Stashed changes

//create booking
export const createBookingService=async(
    bookingData:createBookingData,
    currentUserId:number
)=>{
<<<<<<< Updated upstream
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const{starttime,endtime,roomid,userid,attendees}=bookingData;

        const room=await roomModel.findOne({roomid}).session(session);
=======
    let committed=false;
        const{starttime,endtime,roomid,userid,attendees}=bookingData;

        const room=await roomModel.findOne({roomid})
>>>>>>> Stashed changes
        if(!room){
            throw new bookingValidationError("Room not found",["The specified room does not exist"]);
        }

<<<<<<< Updated upstream
        const user=await userModel.findOne({userid}).session(session);
=======
        const user=await userModel.findOne({userid})
>>>>>>> Stashed changes
        if(!user){
            throw new bookingValidationError("User not found",["The specified user does not exist"]);
        }

<<<<<<< Updated upstream
        const hasConflict=await checkBookingConflicts(roomid,starttime,endtime,undefined,session);
=======
        const hasConflict=await checkBookingConflicts(roomid,starttime,endtime,undefined);
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                const attendeeUser=await User.findOne({userid:attendee.userid}).session(session);
=======
                const attendeeUser=await User.findOne({userid:attendee.userid});
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        const nextBookingId=await getNextSequence('bookingid',session);
=======
        const nextBookingId=await getNextSequence('bookingid');
>>>>>>> Stashed changes

        try{
            await Booking.create({
                bookingid:nextBookingId,
                starttime,
                endtime,
                roomid:roomid,
                createdBy:{userid:user.userid,name:user.name},
                attendees:processedAttendees||[],
<<<<<<< Updated upstream
                status:'pending'
            },{session});
=======
            });
>>>>>>> Stashed changes
        }catch(err:any){
            if(err.code===11000){
                throw new bookingValidationError("Time slot conflicts with existing booking",["There is a conflict in booking timings"]);
            }
            throw err;
        }
<<<<<<< Updated upstream
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
=======
        

        const populatedBooking=await Booking.findOne({bookingid:nextBookingId})
        .populate({path:'roomid',foreignField:"roomid",select:'roomname capacity roomlocation -_id'})
        .select("-_id -__v -updatedAt -attendees._id -attendees.acceptedAt ");

        if (populatedBooking && populatedBooking.attendees && populatedBooking.attendees.length > 0) {
            try {
                for (const attendee of populatedBooking.attendees) {
                    // Fetch attendee user to get email
                    const attendeeUser = await User.findOne({ userid: attendee.userid });
                    if (attendeeUser && attendeeUser.email) {
                        await sendInvitation({
                            to: attendeeUser.email,
                            attendeeName: attendee.name,
                            booking: populatedBooking,
                            attendeeUserId: attendee.userid
                        });
                    }
                }
            } catch (emailError) {
                console.error("Failed to send invitation emails:", emailError);
            }
        }

        return populatedBooking;
>>>>>>> Stashed changes
    
}

//get all bookings
<<<<<<< Updated upstream
export const getBookingsService=async()=>{
    const bookings=await Booking.find({status:{$ne:'cancelled'}}).select("-_id -__v -updatedAt -createdAt -attendees._id -attendees.acceptedAt");
    if(!bookings){
        throw new Error("There are currently no bookings");
    }
    return bookings.map(booking=>booking.toObject());
}
=======
export const getBookingsService=async(filters:{
    roomid?:number,
    status?:string,
    createdBy?:number,
    starttime?:Date,
    endtime?:Date,
    date?:Date,
},paginationOption:paginationOptions):Promise<paginatedBookingsResult>=>{

    const query:any={
        status:{$ne:"cancelled"}
    };

    if(filters.roomid)query.roomid=filters.roomid;
    if(filters.status)query.status=filters.status;
    if(filters.createdBy)query["createdBy.userid"]=filters.createdBy;


    if(filters.date){
        const startOfDay=new Date(filters.date);
        startOfDay.setHours(0,0,0,0);

        const endOfDay=new Date(filters.date);
        endOfDay.setHours(23,59,59,999);

        query.$or=[
            {starttime:{$gte:startOfDay,$lte:endOfDay}},
            {endtime:{$gte:startOfDay,$lte:endOfDay}},
            {starttime:{$lte:startOfDay},endtime:{$gte:endOfDay}}
        ];
    }

    if(filters.starttime && filters.endtime){
        query.$or=[
            {starttime:{$lte:filters.starttime},endtime:{$gt:filters.starttime}},
            {starttime:{$lt:filters.endtime},endtime:{$gte:filters.endtime}},
            {starttime:{$gte:filters.starttime},endtime:{$lte:filters.endtime}},
            {starttime:{$lte:filters.starttime},endtime:{$gte:filters.endtime}}
        ]
    }else if(filters.starttime){
        query.$or=[
            {starttime:{$gte:filters.starttime}},
            {endtime:{$gte:filters.starttime}}
        ];
    }else if(filters.endtime){
        query.$or=[
            {endtime:{$lte:filters.endtime}},
            {starttime:{$lte:filters.endtime}}
        ]
    }

    const totalBookings=await Booking.countDocuments(query);

    if(totalBookings===0){
        throw new Error("There are currently no bookings that fit the parameters");
    }

    const{page,limit,sortBy,sortOrder}=paginationOption;
    const skip=(page-1)*limit;
    const totalPages=Math.ceil(totalBookings/limit);

    const sortObject:any={};

    if(sortBy==="createdBy"){
        sortObject['createdBy.userid']=sortOrder==='asc'?1:-1;
    }else{
        sortObject[sortBy]=sortOrder==='asc'?1:-1;
    }

    const bookings=await Booking.find(query).populate({path:"roomid",foreignField:"roomid",select:"roomlocation roomname capacity -_id"})
    .select("-_id -__v -updatedAt -createdAt -attendees._id -attendees.acceptedAt")
    .sort(sortObject)
    .skip(skip)
    .limit(limit);

    return {
        booking:bookings,
        currentpage:page,
        totalpages:totalPages,
        hasNextPage:page<totalPages,
        hasPreviousPage:page>1,
        totalBookings:totalBookings,
        limit:limit,
        sortBy:sortBy,
        sortOrder:sortOrder
    }
};
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
        status:{$in:["pending","confirmed"]},
=======
        status:{$in:["confirmed"]},
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
}
=======
}
>>>>>>> Stashed changes
