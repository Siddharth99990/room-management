export class authValidationError extends Error{
    public statusCode:number;
    public errors:string[];

    constructor(message:string,errors:string[]=[]){
        super(message);
        this.name="AuthValidationError";
        this.statusCode=400;
        this.errors=errors;
    }
}

const isValidEmail=(email:string):boolean=>{
    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validateLoginEmail=(email:string):void=>{
    const errors:string[]=[];
    
    if(!email||email.trim().length===0){
        errors.push("Email is required for Login");
    }

    if(email && !isValidEmail(email)){
        errors.push("please provide a valid email address");
    }

    if(email && email.length>254){
        errors.push("Email is too long");
    }

    if(errors.length>0){
        throw new authValidationError("Email verification failed",errors);
    }
};

const validateLoginPassword=(password:string):void=>{
    const errors:string[]=[];

    if(!password||password.trim().length===0){
        errors.push("Password is required for login");
    }

    if(password && password.length<6){
        errors.push("Password length must be atleast 6 characters long");    
    }

    if(password && password.length>128){
        errors.push("Password is too long");
    }

    if(errors.length>0){
        throw new authValidationError("Password validation failed",errors);
    }
};

export const validateLoginData=(data:{
    email:string;
    password:string;
}):{
    email:string;
    password:string;
}=>{
    const {email,password}=data;
    if(!email && !password){
        throw new authValidationError("Login Validation failed",["Please enter both email and password"]);
    }

    if(!email){
        throw new authValidationError("Login Validation failed",["please enter email"]);
    }

    if(!password){
        throw new authValidationError("Login validation failed",["please enter password"]);
    }

    validateLoginEmail(email);

    validateLoginPassword(password);

    return{
        email:email,
        password:password
    };
};

export const validateTokenFormat=(token:string):void=>{
    const errors:string[]=[];

    if(!token||token.trim().length===0){
        errors.push("Authentication token is needed");
    }

    if(token && token.split('.').length!==3){
        errors.push("Invalid token format");
    }

    if(errors.length>0){
        throw new authValidationError("Token Validation failed",errors);
    }
};

export const validateAuthorizationHeader=(authHeader:string|undefined):string|undefined=>{
    const errors:string[]=[];
    if(!authHeader){
        errors.push("Authorization header is needed");
        throw new authValidationError("Authorization validation failed",errors);
    }
    const parts=authHeader.split('.');

    if(parts.length!==2){
        errors.push("Authorization header should be in the format: Bearer<token>");
    }

    if(parts[0]!=='Bearer'){
        errors.push("Authorization header must start with Bearer");
    }

    if(!parts[1]||parts[1].trim().length===0){
        errors.push("Token should be present after Bearer");
    }

    if(errors.length>0){
        throw new authValidationError("Authorization validation failed",errors);
    }
    return parts[1];
};

export const authValidationUtils={
    isValidEmail,
    validateLoginEmail,
    validateLoginPassword,
    validateTokenFormat,
    validateAuthorizationHeader
};





