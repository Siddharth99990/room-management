import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.SMTP_USER,
        pass:process.env.SMTP_PASS
    }
});

interface emailOptions{
    to:string,
    subject:string,
    text?:string,
    html?:string
}

export const sendEmail=async({to,subject,text,html}:emailOptions)=>{
    try{
        const info=await transporter.sendMail({
            from:`Room-Management <${process.env.SMTP_USER}`,
            to,
            subject,
            text,
            html
        });
        console.log("Email sent");
        return info;
    }catch(err:any){
        console.error("Error sending email:",err.message);
        throw err;
    }
}
