import express from 'express';
import mongoose,{Document} from 'mongoose';
import User,{userInterface} from "../../../models/user.model";
import { getNextSequence } from '../../counters/helper/getNextSequence';

//create
export const createUserService=async(name:string,email:string,password:string,role:string)=>{
    const existinguser=await User.findOne({email});
    if(existinguser){
        throw new Error("User already exists");
    }
    const nextid=await getNextSequence('userid');
    const newUser=await User.create({
        userid:nextid,
        name,
        email,
        password,
        role
    });
    const userResponse=newUser.toObject() as any;
    delete userResponse.password;
    delete userResponse.deletedAt;
    delete userResponse.isDeleted;

    return userResponse;
};

//read
export const getUsersService = async () => {
  const users=await User.find().select('-password -isDeleted -deletedAt -_id -createdAt -updatedAt');
  if(!users){
    throw new Error("There are no users in the database");
  }
  return users.map(user=>user.toObject());
};

interface IUser extends Document{
    userid:number,
    name:string,
    email:string,
    readonly role:string
}

export const finduserByIdService=async(userid:number):Promise<IUser>=>{
    if(typeof userid!=='number' || isNaN(userid)){
        throw new Error("The entered userid is not a number please enter a valid userid number");
    }
    const user=await User.findOne({userid}).select('-password -isDeleted -deletedAt -_id -createdAt -updatedAt')as IUser|null;
    if(!user){
        throw new Error(`There is no such user with the id ${userid}`);
    }
    return user;  
}

//update
export const updateUserInfoService=async(userid:number,updatedata:Partial<Omit<userInterface,'password'|'userid'|'role'>>):Promise<IUser>=>{
    if(typeof userid!=='number'){
        throw new Error("The entered userid is not a number please enter a valid userid number");
    }
    const updateduser=await User.findOneAndUpdate(
        {userid},
        {$set:updatedata},
        {new:true,runValidators:true,projection:{password:0,createdAt:0,isDeleted:0,deletedAt:0,_id:0}}
    )as IUser|null;
    
    if(!updateduser){
        throw new Error(`No user found with the id ${userid}`);
    }
    return updateduser;
}

//delete
export const softdeleteUsersService=async ()=>{
    try{
        const count=await User.countDocuments({$or:[
        {isDeleted:{$ne:true}},
        {isDeleted:{$exists:false}}
        ]});
        if(count===0){
            throw new Error("Couldnt delete user data as there are no entries");
        }
        const users=await User.find({$or:[{isDeleted:{$ne:true}},{isDeleted:{$exists:false}}]});
        const userList=users.map(user=>user.name);

        await User.updateMany(
                {$or: [{ isDeleted: { $ne: true } },{ isDeleted: { $exists: false } }]},
                    {
                        $set: {
                            isDeleted: true,
                            deletedAt: new Date()
                        }
                    },
                );
        return{
        message:`The number of users marked as deleted are ${count}`,
        deletedUserList:userList
        };
    }catch(err:any){
        return{
            message:"There was an error marking users for delete",
            error:err.message
        }
    }
};

//deletebyid
export const softDeleteUsersByIdService = async (useridentity: number) => {
  try {
    const filter = {
      $and: [
        { userid: useridentity },
        { $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }] }
      ]
    };

    const user = await User.findOne(filter);
    if (!user) {
      throw new Error("The user you are trying to delete does not exist or is already deleted");
    }

    await User.findOneAndUpdate(
      filter,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      },
      { new: true }
    );

    return {
      message: `User '${user.name}' has been marked as deleted.`,
      deletedUser: user.name
    };

  } catch (err: any) {
    return {
      message: "There was an error marking the user for delete",
      error: err.message
    };
  }
};


export const getUsersMarkedForDeleteService=async()=>{
    const deletedUsers=await User.find({$or:[{isDeleted:{$eq:true}},{isDeleted:{$exists:true}}]}).select('-password');
    if(deletedUsers.length===0){
        throw new Error("There are no users currently marked for delete");
    }
    return deletedUsers.map(user=>user.toObject());
};

//restore
export const restoreDeletedUsersService=async(userid:number)=>{
    if(typeof userid!=='number'||isNaN(userid)){
        throw new Error("Please enter a valid user id to restore");
    }
        const filter = {
        $and: [
            { userid: {$eq:userid} },
            { isDeleted:true }
        ]
    };
    const user=await User.collection.findOne(filter);
    if(!user){
        throw new Error("The user you are trying to restore either does not exist or is already restored");
    }

    await User.collection.findOneAndUpdate(
        filter,
        { $set:{ isDeleted: false, deletedAt: null }},
    )

    return{
        message:"The user has been successfully restored",
        restoreduser:user.name
    };
}
     
