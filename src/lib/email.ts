import nodemailer from 'nodemailer';

type EmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
};

const SMTP_SERVER = "smtp.gmail.com";
const SMTP_PORT = 587;
const SENDER_EMAIL = "hmlsol2025@gmail.com";
const SENDER_PASSWORD = "koli hjbl kxdz rbix";
const CC_EMAILS = ["abdulsameer146@gmail.com"];

const transporter = nodemailer.createTransport({
  host: SMTP_SERVER,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SENDER_EMAIL,
    pass: SENDER_PASSWORD,
  },
});

export async function sendEmail(options: EmailOptions) {
  try {
    // Always include the CC emails
    const cc = Array.isArray(options.cc) 
      ? [...options.cc, ...CC_EMAILS]
      : options.cc 
        ? [options.cc, ...CC_EMAILS]
        : CC_EMAILS;

    const mailOptions = {
      from: `"Event Scheduler" <${SENDER_EMAIL}>`,
      to: options.to,
      cc: cc,
      subject: options.subject,
      html: options.html,
    };

    console.log('Sending email with options:', {
      to: mailOptions.to,
      cc: mailOptions.cc,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export function formatEventEmail(
  organizationName: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string,
  venue: string,
  performanceType: string,
  participants: Array<{ name: string; email: string; phone: string }>,
  isVirtual: boolean = false,
  zoomDetails?: {
    joinUrl?: string;
    password?: string;
    hostUrl?: string;
  }
) {
  const participantList = participants
    .map(p => `- ${p.name} (${p.email}, ${p.phone})`)
    .join('\n');

  const formattedDate = new Date(date).toLocaleDateString();
  const formattedStartTime = new Date(startTime).toLocaleTimeString();
  const formattedEndTime = new Date(endTime).toLocaleTimeString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .greeting { font-size: 18px; margin-bottom: 20px; }
        .event-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-item { display: flex; margin-bottom: 12px; }
        .detail-icon { margin-right: 12px; color: #2563eb; width: 20px; text-align: center; }
        .detail-content { flex: 1; }
        .participants { margin-top: 25px; }
        .participant-list { margin-top: 10px; padding-left: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .btn-zoom { 
          display: inline-block; 
          background-color: #2d8cff; 
          color: white !important; 
          padding: 10px 20px; 
          text-decoration: none; 
          border-radius: 5px; 
          font-weight: 500;
          margin: 5px 0;
          text-align: center;
        }
        .password-box {
          background-color: #f0f7ff;
          padding: 8px 15px;
          border-radius: 5px;
          display: inline-block;
          margin-top: 5px;
          font-family: monospace;
          font-size: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Event Confirmation</h1>
      </div>
      
      <div class="content">
        <div class="greeting">
          Dear <strong>${organizationName}</strong>,
        </div>
        
        <p>We're excited to inform you that your event has been successfully scheduled! Here are the details:</p>
        
        <div class="event-details">
          <h2 style="margin-top: 0; color: #1f2937;">${eventName}</h2>
          
          <div class="detail-item">
            <div class="detail-icon">📅</div>
            <div class="detail-content">
              <strong>Date:</strong> ${formattedDate}<br>
              <strong>Time:</strong> ${formattedStartTime} – ${formattedEndTime}
            </div>
          </div>
          
          ${isVirtual ? `
            <div class="detail-item">
              <div class="detail-icon">💻</div>
              <div class="detail-content">
                <strong>Meeting Type:</strong> Virtual (Zoom)
              </div>
            </div>
            
            ${zoomDetails?.joinUrl ? `
              <div class="detail-item">
                <div class="detail-icon">🔗</div>
                <div class="detail-content">
                  <strong>Join Meeting:</strong><br>
                  <a href="${zoomDetails.joinUrl}" class="btn-zoom" target="_blank">Join Zoom Meeting</a>
                </div>
              </div>
            ` : ''}
            
            ${zoomDetails?.password ? `
              <div class="detail-item">
                <div class="detail-icon">🔑</div>
                <div class="detail-content">
                  <strong>Meeting Password:</strong><br>
                  <span class="password-box">${zoomDetails.password}</span>
                </div>
              </div>
            ` : ''}
          ` : `
            <div class="detail-item">
              <div class="detail-icon">📍</div>
              <div class="detail-content">
                <strong>Venue:</strong> ${venue}
              </div>
            </div>
          `}
          
          <div class="detail-item">
            <div class="detail-icon">🎭</div>
            <div class="detail-content">
              <strong>Performance Type:</strong> ${performanceType.charAt(0).toUpperCase() + performanceType.slice(1)}
            </div>
          </div>
        </div>
        
        <div class="participants">
          <h3 style="margin-bottom: 5px;">👥 Participants (${participants.length})</h3>
          <div class="participant-list">
            ${participants.map(p => `
              <div style="margin-bottom: 8px;">
                <strong>${p.name}</strong>
                ${p.email ? `<br>✉️ ${p.email}` : ''}
                ${p.phone ? `<br>📞 ${p.phone}` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="footer">
          <p>If you have any questions or need to make changes to your event, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>Event Scheduler Team</strong><br>
          Hamal Data Solutions</p>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
