import mongoose,{Schema,Document, mongo} from 'mongoose';

interface Attendee{
    userid:number,
    name:string,
    status:'accepted'|'declined'|'invited',
    acceptedAt:Date
}

interface createdBy{
    userid:number,
    name:string
}

export interface bookingInterface extends Document{
    bookingid:number,
    starttime:Date,
    endtime:Date,
    roomid:number,
    createdBy:createdBy,
    status:'confirmed'|'cancelled',
    attendees:Attendee[]
}

const bookingSchema=new Schema<bookingInterface>({
    bookingid:{
        type:Number,
        required:true,
        unique:true
    },
    starttime:{
        type:Date,
        required:true
    },
    endtime:{
        type:Date,
        required:true,
    },
    roomid:{
        type:Number,
        required:true,
        ref:"Room"
    },
    createdBy: {
      userid: {
        type: Number,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    status:{
        type:String,
        required:true,
        enum:['confirmed','cancelled'],
        default:'confirmed'
    },
    attendees:[{
        userid:{
            type:Number,
            required:true
        },
        name:{
            type:String,
            required:true,
        },
        status:{
            type:String,
            enum:['accepted','declined','invited'],
            default:'invited',
            required:true,
        },
        acceptedAt:{
            type:Date,
            default:null
        }
    }]
},{timestamps:true});

bookingSchema.index(
    {roomid:1,starttime:1,endtime:1},
    {unique:true}
);

export default mongoose.model<bookingInterface>("booking",bookingSchema,"Bookings");