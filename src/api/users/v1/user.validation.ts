import {Request,Response} from 'express';

export class validationError extends Error{
    public statusCode:number;
    public errors:string[];

    constructor(message:string,errors:string[]=[]){
        super(message);
        this.name='validationError';
        this.statusCode=400;
        this.errors=errors;
    }
}

const isValidEmail=(email:string):boolean=>{
    const emailregex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailregex.test(email);
};

const validatePassword=(password:string):void=>{
    const errors:string[]=[];

    if(password.length<6){
        errors.push("Passwords must be atleast 6 characters long");
    }
    if(password.length>128){
        errors.push("Password must not exceed 128 characters");
    }
    if(!/(?=.*[a-z])/.test(password)){
        errors.push("Password must contain atleast one lowercase character");
    }
    if(!/(?=.*[A-Z])/.test(password)){
        errors.push("Password must contain atleast one uppercase character");
    }
    if(!/(?=.*\d)/.test(password)){
        errors.push("Password must contain atleast one number");
    }
    if(!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)){
        errors.push("Password must contain atleast one special character");
    }
    if(errors.length>0){
        throw new validationError("Password validation failed",errors);
    }
};

const validateName=(name:string):void=>{
    const errors:string[]=[];
    if(!name||name.trim().length===0){
        errors.push('Name is required');
    }
    if(!/^[a-zA-Z\s\-]+$/.test(name)){
        errors.push("Name can only contain letters,spaces and hyphens")
    }
    if(/\{2,}/.test(name)){
        errors.push("Name cannot contain two consecutive spaces");
    }
    if(errors.length>0){
        throw new validationError("Name validation failed",errors);
    }
}

const validateRole=(role:string):void=>{
    const validRoles=['employee','admin'];
    if(!validRoles.includes(role.toLowerCase())){
        throw new validationError("Role validation failed",["Role must be either employee or admin"]);
    }
}

export const validateUserRegistrationData=(data:{
    name:string;
    email:string;
    password:string;
    role?:string;
}):{
    name:string;
    email:string;
    password:string;
    role:string;
}=>{
    const {name,email,password,role='employee'}=data;

    if(!name)throw new validationError("Registration Validation failed",["Name is required for user registration"]);
    if(!email)throw new validationError('Registration validation failed', ['Email is required for user registration']);
    if(!password)throw new validationError('Registration validation failed', ['Password is required for user registration']);

    validateName(name);

    if(!isValidEmail(email)){
        throw new validationError("Email validation failed",['please provide a valid email for registration']);
    }

    validatePassword(password);
    validateRole(role);

    return{
        name,
        email,
        password,
        role:role.toLowerCase()
    };
};

export const validateUserUpdateData=(data:any,userid:number):{
    validatedData:any;
    userid:number;
}=>{
    const{name,email}=data;

    if(!name && !email &&Object.keys(data).length===0){
        throw new validationError("Update validation failed",["Atleast one field(name or email) is needed for the update"]);
    }

    const updates:any={};

    if(name!==undefined){
        if(typeof name !=='string'){
            throw new validationError("Name validation failed",["Name must be a string"]);
        }
        validateName(name);
        updates.name=name;
    }
     if (email !== undefined) {
        if (typeof email !== 'string') {
            throw new validationError('Email validation failed', ['Email must be a string']);
        }
        if (!isValidEmail(email)) {
            throw new validationError('Email validation failed', ['Please provide a valid email address']);
        }
        updates.email = email;
    }

    const restrictedFields=['userid','_id','isDeleted'];
    const providedFields=Object.keys(data);
    const invalidFields=providedFields.filter(field=>restrictedFields.includes(field));

    if(invalidFields.length>0){
        throw new validationError("Update validation failed",[`The following fields cannot be updated: ${invalidFields.join(', ')}`]);
    }

    return{
        validatedData:updates,
        userid:userid
    };
}

export const validationUtils={
    isValidEmail,
    validateName,
    validatePassword,
    validateRole
};

