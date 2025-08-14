import mongoose,{Schema,Document, mongo} from 'mongoose';

interface Attendee{
    userid:mongoose.Types.ObjectId,
    name:string,
    status:'accepted'|'declined'|'invited',
    acceptedAt:Date
}

interface bookingInterface extends Document{
    bookingid:number,
    starttime:Date,
    endtime:Date,
    roomid:mongoose.Types.ObjectId,
    userid:mongoose.Types.ObjectId,
    status:'pending'|'confirmed'|'cancelled',
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
        type:mongoose.Schema.Types.ObjectId,
        ref:"Rooms",
        required:true,
    },
    status:{
        type:String,
        required:true,
        enum:['pending','confirmed','cancelled'],
        default:'pending'
    },
    attendees:[{
        userid:{
            type:mongoose.Schema.ObjectId,
            ref:"Users",
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
            default:Date.now
        }
    }]
},{timestamps:true});

export default mongoose.model<bookingInterface>("booking",bookingSchema,"Bookings");