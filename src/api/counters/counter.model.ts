import mongoose,{Schema} from "mongoose";

const counterSchema=new Schema({
    _id:{type:String,required:true},
    sequencecounter:{type:Number,default:0}
});

export default mongoose.model('counter',counterSchema,"counters")