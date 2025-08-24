import mongoose,{Schema,Document,Query} from 'mongoose';

export interface roomInterface extends Document{
    roomid:number,
    roomname:string,
    roomlocation:string,
    capacity:number,
    equipment:[string],
    isDeleted?:boolean,
    deletedAt?:Date
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
        unique:true,
    },
    roomlocation:{
        type:String,
        required:true,
    },
    capacity:{
        type:Number,
        required:true,
    },
    equipment:{
        type:[String],
        required:true,
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    deletedAt:{
        type:Date,
        default:null
    }
},{timestamps:true});

roomSchema.pre(/^find/,function(this:Query<any,any>){
    this.where({
        $or:[
            {isDeleted:{$ne:true}},
            {isDeleted:{$exists:false}}
        ]
    });
});


export default mongoose.model<roomInterface>('Room',roomSchema,"Rooms");