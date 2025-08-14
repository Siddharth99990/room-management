import mongoose,{Schema,Document} from 'mongoose';

interface roomInterface extends Document{
    roomid:number,
    roomname:string,
    roomlocation:string,
    capacity:number,
    equipement:[string],
    createdBy:mongoose.Types.ObjectId
}

const roomSchema=new Schema<roomInterface>({
    roomid:{
        type:Number,
        required:true,
        unique:true
    },
    roomname:{
        type:String,
        required:true,
    },
    roomlocation:{
        type:String,
        required:true,
    },
    capacity:{
        type:Number,
        required:true,
    },
    equipement:{
        type:[String],
        required:true,
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Users",
        required:true
    }
},{timestamps:true});

export default mongoose.model<roomInterface>('Room',roomSchema,"Rooms");