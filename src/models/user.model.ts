import mongoose,{ Document,Schema,Query } from "mongoose";
import bcrypt from "bcrypt";

export interface userInterface extends Document{
    userid:number,
    name:string,
    email:string,
    password:string,
    role:string,
    isTemporaryPassword?:boolean,
    passwordChangedAt?:Date,
    createdAt?:Date,
    updatedAt?:Date,
    isDeleted?:boolean,
    deletedAt?:Date
}

const userSchema=new Schema<userInterface>({
    userid:{
        type:Number,
        required:true,
        unique:true
    },
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        match:/^\S+@\S+\.\S+$/
    },
    password:{
        type:String,
        required:true,
        minLength:6
    },
    role:{
        type:String,
        enum:["employee","admin"],
        default:"employee"
    },
    isTemporaryPassword:{
        type:Boolean,
        default:true
    },
    passwordChangedAt:{
        type:Date,
        default:null
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    deletedAt:{
        type:Date,
        default:null
    }
},{
    timestamps:true
});

userSchema.pre(/^find/,function(this:Query<any,any>){
    this.where({
        $or:[
            {isDeleted:{$ne:true}},
            {isDeleted:{$exists:false}}
        ]
    });
});

userSchema.pre("save",async function(next){
    if(!this.isModified("password"))return next();
    const salt=await bcrypt.genSalt(10);
    this.password=await bcrypt.hash(this.password,salt);

    if(!this.isNew){
        this.isTemporaryPassword=false;
        this.passwordChangedAt=new Date();
    }
    next();
});

userSchema.pre("findOneAndUpdate",async function(next){
    const update = this.getUpdate() as any;
    if(update?.password){
        const salt=await bcrypt.genSalt(10);
        update.password=await bcrypt.hash(update.password,salt);
        this.setUpdate(update);
    }
    next();
});

export default mongoose.model<userInterface>('User',userSchema,"Users");