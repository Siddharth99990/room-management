import mongoose from "mongoose";

export class roomValidationError extends Error{
    public statusCode:number;
    public errors:string[];

    constructor(message:string,errors:string[]=[]){
        super(message);
        this.name="roomValidationError";
        this.statusCode=400;
        this.errors=errors;
    }
}

const isValidRoomName=(roomname:string):void=>{
    const errors:string[]=[];
    if(!roomname ||roomname.trim().length===0){
        errors.push("Roomname should not be empty");
    }

    if(!/^[a-zA-Z\s\-\d]+$/.test(roomname)){
        errors.push("Roomnames can only contain letters, spaces, hyphens and digits");
    }

    if(/\s{2,}/.test(roomname)){
        errors.push("Roomname cannot have two consecutive spaces");
    }

    if(roomname.trim().length<2){
        errors.push("Roomname must have atleast 2 characters");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

const isValidRoomLocation=(roomlocation:string):void=>{
    const errors:string[]=[];
    if(!roomlocation || roomlocation.trim().length==0){
        errors.push("Room location must be provided");
    }

    if(!/^[a-zA-Z\s\-\d]+$/.test(roomlocation)){
        errors.push("Room location can only contain letters,spaces,hyphens and digits");
    }

    if(roomlocation && roomlocation.trim().length<8 ){
        errors.push("Room location should be atleast 8 characters long");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

const isValidCapacity=(capacity:number):void=>{
    const errors:string[]=[];
    if(typeof capacity!=='number' || isNaN(capacity)){
        errors.push("Capacity should be provided and should be a number");
    }

    if(capacity<=4 || capacity>50){
        errors.push("Capacity must lie in the range of 4-50");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

const isValidEquipment=(equipment:string[]):void=>{
    const errors:string[]=[];

    if(!equipment || equipment.length===0){
        errors.push("Equipment is required and cannot be left empty");
    }

    if(Array.isArray(equipment) && equipment.length<2){
        errors.push("Atleast 2 equipment must be mentioned");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

export const validateRegisterData=(data:{
    roomname:string,
    roomlocation:string,
    capacity:number,
    equipment:string[],

}):{
    roomname:string;
    roomlocation:string;
    capacity:number;
    equipment:string[];
}=>{
    const {roomname,roomlocation,capacity,equipment}=data;

<<<<<<< Updated upstream
=======
    const errors:string[]=[];

    if (!data.roomname || data.roomname.trim() === "") {
        errors.push("Roomname should not be empty");
    }
    if (!data.roomlocation || data.roomlocation.trim() === "") {
        errors.push("Room location must be provided");
    }
    if (capacity === null || capacity === undefined || typeof capacity !== "number" || isNaN(capacity)) {
        errors.push("Capacity should be provided and should be a number");
    } else if (capacity < 4 || capacity > 50) {
        errors.push("Capacity must lie in the range of 4-50");
    }

    if (errors.length > 0) {
        throw new roomValidationError("Room validation failed",errors); 
    }

>>>>>>> Stashed changes
    isValidRoomName(roomname);
    isValidRoomLocation(roomlocation);
    isValidCapacity(capacity);
    isValidEquipment(equipment);

    return{
        roomname,
        roomlocation,
        capacity,
        equipment
    }
};

export const validateUpdateData=(updateData:any)=>{
    const{roomname,roomlocation,capacity,equipment}=updateData;

    if(!roomname && !roomlocation && capacity===undefined && !equipment && Object.keys(updateData).length===0){
        throw new roomValidationError("Update validation failed",["Atleast one field is needed for updating information"]);
    }

    const updates:any={};

    if(roomname!=undefined){
        isValidRoomName(roomname);
        updates.roomname=roomname;
    }

    if(roomlocation!=undefined){
        isValidRoomLocation(roomlocation);
        updates.roomlocation=roomlocation;
    }

    if(capacity!==undefined){
        isValidCapacity(capacity);
        updates.capacity=capacity;
    }

    if(equipment!==undefined){
        isValidEquipment(equipment);
        updates.equipment=equipment;
    }

<<<<<<< Updated upstream
    const restrictedFields=["_id","roomid"];
=======
    const restrictedFields=["_id","roomid","isDeleted","deletedAt"];
>>>>>>> Stashed changes
    const invalidFields=Object.keys(updateData).filter(field=>restrictedFields.includes(field));

    if(invalidFields.length>0){
        throw new roomValidationError("Update validation failed",[`The update body cannot contain the following fields: ${restrictedFields.join(', ')}`]);
    }

    return updates;
};
<<<<<<< Updated upstream
=======


export const roomValidation={
    isValidRoomLocation,
    isValidRoomName,
    isValidCapacity,
    isValidEquipment,
};

>>>>>>> Stashed changes


export const roomValidation={
    isValidRoomLocation,
    isValidRoomName,
    isValidCapacity,
    isValidEquipment,
};
