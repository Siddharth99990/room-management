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
            if(err.message.includes("Time slot conflicts with existing booking")) {
                return res.status(409).json({
                    success:false,
                    message:err.message,
                    errors:err.errors
                });
            }
            return res.status(err.statusCode||409).json({
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
        const filters:any={};

        if(req.query.roomid){
            const roomid=Number(req.query.roomid);
            if(isNaN(roomid)){
                return res.status(400).json({
                    success:false,
                    message:"Invalid roomid, roomid must be a number"
                });
            }
            filters.roomid=roomid;
        }

        if(req.query.createdBy){
            const createdBy=Number(req.query.createdBy);
            if(isNaN(createdBy)){
                return res.status(400).json({
                    success:false,
                    message:"Invalid createdBy, it must be a number"
                });
            }
            filters.createdBy=createdBy;
        }

        if(req.query.status){
            const validstatus=['confirmed','cancelled'];
            if(!validstatus.includes(req.query.status as string)){
                return res.status(400).json({
                    success:false,
                    message:`Invalid status. must be one of the valid status:${validstatus.join(', ')} `
                });
            }
            filters.status=req.query.status as string;
        }

        if(req.query.date){
            const date=new Date(req.query.date as string);
            if(isNaN(date.getTime())){
                return res.status(400).json({
                    success:false,
                    message:"Invalid date format please enter date in proper format"
                });
            }
            filters.date=date;
        }else{
            if(req.query.starttime){
                const starttime=new Date(req.query.starttime as string);
                if(isNaN(starttime.getTime())){
                    return res.status(400).json({
                        success:false,
                        message:"Invalid starttime format please enter the date in proper format"
                    });
                }
                filters.starttime=starttime;
            }
            if(req.query.endtime){
                const endtime=new Date(req.query.endtime as string);
                if(isNaN(endtime.getTime())){
                    return res.status(400).json({
                        success:false,
                        message:"Invalid starttime format please enter the date in proper format"
                    });
                }
                filters.endtime=endtime;
            }
        }

        if(filters.starttime && filters.endtime && filters.starttime>= filters.endtime){
            return res.status(400).json({
                success:false,
                message:"Start time must be before end time"
            });
        }

        const page=Number(req.query.page)||1;
        const limit=Number(req.query.limit)||10;

        if(page<1){
            return res.status(400).json({
                success:false,
                message:"Page number cannot be less than 1"
            });
        }

        if(limit<1||limit>100){
            return res.status(400).json({
                success:false,
                message:"Limit cannot be less than 0 or greater than 100"
            });
        }

        const sortBy=req.query.sortBy as string|| 'starttime';
        const sortOrder=req.query.sortOrder as string||'asc';

        const validSortFields = ['starttime', 'endtime', 'status', 'createdBy', 'roomid', 'bookingid'];
        if(!validSortFields.includes(sortBy)){
            return res.status(400).json({
                success:false,
                message:`Invalid sortBy field. Valid options are: ${validSortFields.join(', ')}`
            });
        }

        if(!['asc','desc'].includes(sortOrder.toLowerCase())){
            return res.status(400).json({
                success:false,
                message:"sortOrder must be either asc or desc"
            });
        }

        const paginationOptions={
            page,
            limit,
            sortBy,
            sortOrder:sortOrder.toLowerCase() as'asc'|'desc'
        };

        const result= await getBookingsService(filters,paginationOptions);

        res.status(200).json({
            success:true,
            message:"Successfully fetched all bookings",
            bookings:result.booking,
            pagination:{
                currentpage:result.currentpage,
                totalpages:result.totalpages,
                totalBookings:result.totalBookings
            },
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
            return res.status(401).json({
                success:false,
                message:"Unauthoried user not authorized"
            })
        }
        const result=await updateStatusandTimingsService(Number(req.params.bookingid),currentUserId,req.body);
        return res.status(200).json({
            success:true,
            message:"The booking details have been successfully updated",
            data:result
        });
    }catch(err:any){
        console.error("There was an error updating the booking details",err);
        return res.status(400).json({
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
