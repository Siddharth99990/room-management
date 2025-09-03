import mongoose from "mongoose";
import Booking from '../../../../models/booking.model';
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