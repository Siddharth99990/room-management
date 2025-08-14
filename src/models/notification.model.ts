import mongoose,{Schema,Document, mongo} from 'mongoose';

interface notificationInterface extends Document{
    userid:mongoose.Types.ObjectId,
    message:string,
    read:boolean,
    createdAt:Date
}

const notificationSchema=new Schema<notificationInterface>({
    userid:{
        type:mongoose.Schema.ObjectId,
        ref:"Users",
        required:true
    },
    message:{
        type:String,
        required:true
    },
   read:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
});

export default mongoose.model<notificationInterface>("notification",notificationSchema,"Notifications");