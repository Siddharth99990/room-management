import { Request,Response } from "express";
import { createBookingService,getAvailableRoomsService,getBookingByIdService,getBookingsService, updateStatusandTimingsService } from "./booking.service";
import { bookingValidationError, validateCreateBookingData } from "./booking.validation";

export const createBooking=async(req:Request,res:Response)=>{
    try{
        const validatedData=await validateCreateBookingData(req.body);
        const currentUserId=req.user?.userid;

        if(!currentUserId){
            return res.status(401).json({
                success:false,
                message:"User authentication required"
            });
        }
        
        const booking= await createBookingService(
            {...validatedData,userid:currentUserId},
            currentUserId
        );

        return res.status(201).json({
            success:true,
            message:"Room has been booked",
            data:booking
        });
    }catch(err:any){
        console.error("Error booking the room:",err);

        if(err instanceof bookingValidationError){
            return res.status(err.statusCode).json({
                success:false,
                message:err.message,
                errors:err.errors
            });
        }

        return res.status(400).json({
            success:false,
            message:"There was an error creating the room",
            error:err.message
        });
    }
}

export const getallbookings=async(req:Request,res:Response)=>{
    try{
        const result=await getBookingsService();
        res.status(200).json({
            success:true,
            message:"Successfully fetched all bookings",
            bookings:result
        });
    }catch(err:any){
        res.status(404).json({
            success:false,
            message:"There was an error fetching bookings",
            error:err.message
        });
    }
}

export const getbookingbyid=async(req:Request,res:Response)=>{
    try{
        const result=await getBookingByIdService(Number(req.params.bookingid));
        res.status(200).json({
            success:true,
            message:"Successfully fetched the booking",
            booking:result
        });
    }catch(err:any){
        res.status(404).json({
            success:false,
            message:"There was an error fetching the booking",
            error:err.message
        });
    }
}

export const updateStatusAndTimings=async(req:Request,res:Response)=>{
    try{
        const currentUserId=req.user?.userid;
        if(!currentUserId){
            res.status(401).json({
                success:false,
                message:"Unauthoried user not authorized"
            })
        }
        const result=await updateStatusandTimingsService(Number(req.params.bookingid),currentUserId,req.body);
        res.status(200).json({
            success:true,
            message:"The booking details have been successfully updated",
            data:result
        });
    }catch(err:any){
        console.error("There was an error updating the booking details",err);
        res.status(400).json({
            success:false,
            message:"There was an error updating booking details",
            error:err.errors||err.message
        });
    }
}

export const getAvailableRooms=async(req:Request,res:Response)=>{
    try{
        const {starttime,endtime}=req.query;

        if(!starttime||!endtime){
            return res.status(400).json({
                error:"Start time and end time, both are required"
            });
        }

        const startDate=new Date(starttime as string);
        const endDate=new Date(endtime as string);

        if(isNaN(startDate.getTime())||isNaN(endDate.getTime())){
            return res.status(400).json({
                success:false,
                message:"Invalid date format",
                error:"Please provide valid date and time formats"
            });
        }

        const result=await getAvailableRoomsService(startDate,endDate);

        return res.status(200).json({
            success:true,
            message:`These are the available rooms`,
            data:result.availableRooms
        });
    }catch(err:any){
        console.error("Error fetching available rooms:",err);
        return res.status(400).json({
            success:false,
            message:"Something went wrong",
            error:err.message
        });
    }
}
