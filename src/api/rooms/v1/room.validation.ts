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

    if(/^[a-zA-Z\s\-\d]+$/.test(roomname)){
        errors.push("Roomnames can only contain letters, spaces, hyphens and digits");
    }

    if(/\{2,}/.test(roomname)){
        errors.push("Roomname cannot have two consecutive spaces");
    }

    if(roomname.length<2){
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

    if(roomlocation.length<8){
        errors.push("Room location should be atleast 8 characters long");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

const validCapacity=(capacity:number):void=>{
    const errors:string[]=[];
    if(!capacity || isNaN(capacity)){
        errors.push("Capacity should be provided and should be a number");
    }

    if(capacity<=0 || capacity>50){
        errors.push("Capacity cannot be less than or equal to zero and can only lie in the range of 0-50");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}

const validEquipment=(equipment:string[]):void=>{
    const errors:string[]=[];
    if(equipment.length<2){
        errors.push("Atleast 2 equipment must be mentioned");
    }

    if(!equipment || equipment.length===0){
        errors.push("Equipment is required and cannot be left empty");
    }

    if(errors.length>0){
        throw new roomValidationError("Room validation failed:",errors);
    }
}




