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

export const sendEmail=({to,subject,text,html}:emailOptions)=>{
    transporter.sendMail({
            from:`Room-Management <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html
    }).then(info=>{
            console.log("Email sent")
    }).catch(err=>{
            console.error("Failed to send email:",err.message);
    });
};

// export const sendInvitation=async({
//     to,
//     attendeeName,
//     booking,
//     attendeeUserId
// }:{
//     to:string,
//     attendeeName:string,
//     booking:any,
//     attendeeUserId:number,
// })=>{
//     const baseUrl=process.env.BASE_URL;
//     const meetingStartTime=new Date(booking.starttime);

//     const acceptToken=generateInvitationToken(booking.bookingid,attendeeUserId,'accept',meetingStartTime);
//     const declineToken=generateInvitationToken(booking.bookingid,attendeeUserId,'decline',meetingStartTime);

//     const acceptUrl=`${baseUrl}/api/notifications/respond?token=${acceptToken}`;
//     const declineUrl=`${baseUrl}/api/notifications/respond?token=${declineToken}`;

//     const starttime=meetingStartTime.toISOString();
//     const endtime=new Date(booking.endtime).toISOString();

//     const timeUntilMeeting=meetingStartTime.getTime()-Date.now();
//     const hoursUntilMeeting=Math.floor(timeUntilMeeting/(1000*60*60));
//     const daysUntilMeeting=Math.floor(hoursUntilMeeting/24);

//     let expiryText="";

//     if(daysUntilMeeting>0){
//         expiryText=`This invitation expires when the meeting starts in ${daysUntilMeeting}`;
//     }else if(hoursUntilMeeting>0){
//         expiryText=`This invitation expires when the meeting start in ${hoursUntilMeeting}`;
//     }else{
//         expiryText=`This invitation expires soon`;
//     }

//     const htmlContent=`
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//       <h2 style="color: #333;">Meeting Invitation</h2>
      
//       <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
//         <h3 style="margin-top: 0;">Meeting Details</h3>
//         <p><strong>Room:</strong> ${booking.roomid?.roomname || 'Room ' + booking.roomid}</p>
//         <p><strong>Location:</strong> ${booking.roomid?.roomlocation || 'N/A'}</p>
//         <p><strong>Start Time:</strong> ${starttime}</p>
//         <p><strong>End Time:</strong> ${endtime}</p>
//         <p><strong>Organizer:</strong> ${booking.createdBy.name}</p>
//       </div>
      
//       <p>Dear ${attendeeName},</p>
//       <p>You have been invited to attend the above meeting. Please respond by clicking one of the buttons below:</p>
      
//       <div style="text-align: center; margin: 30px 0;">
//         <a href="${acceptUrl}" 
//            style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
//           Accept
//         </a>
//         <a href="${declineUrl}" 
//            style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
//           Decline
//         </a>
//       </div>
      
//       <p style="color: #ff6b35; font-weight: bold; text-align: center;">
//           ${expiryText}
//       </p>
      
//       <p style="color: #666; font-size: 12px;">
//         Note: You can respond until the meeting starts. If you're unable to click the buttons, 
//         you can copy and paste these URLs into your browser:
//       </p>
//       <p style="color: #666; font-size: 11px; word-break: break-all;">
//         Accept: ${acceptUrl}<br>
//         Decline: ${declineUrl}
//       </p>
//     </div>
//   `;

//     sendEmail({
//         to,
//         subject:`Meeting Inviatation -${starttime}`,
//         text:`You have been invited to a meeting from ${starttime} to ${endtime}. ${expiryText} Accept:${acceptUrl} Decline:${declineUrl}`,
//         html:htmlContent
//   });
// };