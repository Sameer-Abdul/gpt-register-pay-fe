const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7753907098:AAGbDxcP76t3m7z1VOv6TNr4JuzsIVBmD50";
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

import { query } from './db';

// Function to get chat ID by phone number
async function getChatIdByPhoneNumber(phoneNumber: string): Promise<string | null> {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const result = await query(
      'SELECT chat_id FROM telegram_links WHERE phone_number = $1 LIMIT 1',
      [formattedNumber]
    );
    return result.rows[0]?.chat_id?.toString() || null;
  } catch (error) {
    console.error('Error getting chat ID:', error);
    return null;
  }
}

// For logging notifications
let notificationLogger: {
  logNotification: (notification: {
    event_id: number;
    recipient_type: 'organization' | 'participant';
    recipient_id: string;
    message_type: 'email' | 'telegram';
    status: 'pending' | 'sent' | 'failed';
    error_message?: string;
  }) => Promise<any>;
} | null = null;

export function setNotificationLogger(logger: typeof notificationLogger) {
  notificationLogger = logger;
}

type TelegramMessage = {
  chat_id: string | number;
  text: string;
  parse_mode?: string;
};

// Format phone number to international format if it's a phone number
function formatPhoneNumber(phone: string | number): string {
  const phoneStr = String(phone).trim();
  // Remove all non-digit characters
  const digits = phoneStr.replace(/\D/g, '');
  
  // If it starts with 0, replace with +91 (India country code)
  if (digits.startsWith('0')) {
    return `+91${digits.substring(1)}`;
  }
  
  // If it's 10 digits, assume it's an Indian number
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If it's 12 digits, assume it's already in international format without +
  if (digits.length === 12) {
    return `+${digits}`;
  }
  
  // Otherwise return as is (might already be in correct format)
  return phoneStr.startsWith('+') ? phoneStr : `+${phoneStr}`;
}

export async function sendTelegramMessage(
  chatIdOrPhone: string | number,
  text: string,
  options?: {
    eventId?: number;
    recipientType?: 'organization' | 'participant';
  }
): Promise<{ success: boolean; error?: any }> {
  let chatId: string | number | null = null;
  const originalInput = chatIdOrPhone;
  
  try {
    // If it's a phone number, try to find the linked chat ID
    if (typeof chatIdOrPhone === 'string' && /^\+?[0-9\s\-()]+$/.test(chatIdOrPhone)) {
      console.log(`[Telegram] Looking up chat ID for phone: ${chatIdOrPhone}`);
      const formattedPhone = formatPhoneNumber(chatIdOrPhone);
      chatId = await getChatIdByPhoneNumber(formattedPhone);
      
      if (!chatId) {
        console.log(`[Telegram] No linked chat ID found for phone number: ${formattedPhone}`);
        return { 
          success: false, 
          error: 'No linked Telegram account found. User needs to run /link command in the bot first.' 
        };
      }
      console.log(`[Telegram] Found chat ID ${chatId} for phone ${formattedPhone}`);
    } else {
      // It's already a chat ID
      chatId = chatIdOrPhone;
    }
    
    // Log the attempt
    console.log(`[Telegram] Sending message to chat ID: ${chatId} (original: ${originalInput})`);
    
    const url = `${TELEGRAM_API_BASE}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      } as TelegramMessage)
    });

    const data = await response.json();
    
    console.log('[Telegram] API Response:', JSON.stringify(data, null, 2));
    
    // Log the notification if logger is available
    if (notificationLogger && options?.eventId && options?.recipientType) {
      await notificationLogger.logNotification({
        event_id: options.eventId,
        recipient_type: options.recipientType,
        recipient_id: String(originalInput), // Store the original input (phone number) for reference
        message_type: 'telegram',
        status: data.ok ? 'sent' : 'failed',
        error_message: data.ok ? undefined : JSON.stringify(data)
      });
    }

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return { success: false, error: data };
    }
    
    console.log(`[Telegram] Successfully sent message to chat ID: ${chatId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error in sendTelegramMessage:', error);
    
    // Log the failed notification if logger is available
    if (notificationLogger && options?.eventId && options?.recipientType) {
      await notificationLogger.logNotification({
        event_id: options.eventId,
        recipient_type: options.recipientType,
        recipient_id: String(originalInput),
        message_type: 'telegram',
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      });
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export function formatOrganizerMessage(event: any, participants: any[]) {
  const isUpdate = !!event.id;
  
  let message = `🎯 *${isUpdate ? 'EVENT UPDATED' : 'NEW EVENT CREATED'}* 🎯\n\n`;
  
  // Event Details Section
  message += `📋 *Event Details*\n`;
  message += `🎭 *Name:* ${event.name || 'N/A'}\n`;
  message += `📅 *Date:* ${event.date || 'N/A'}\n`;
  message += `⏰ *Time:* ${event.start_time || ''} - ${event.end_time || ''}\n`;
  
  // Virtual/Physical Event Details
  if (event.mode_of_event === 'Virtual' && event.zoom_join_url) {
    message += `\n💻 *Virtual Event*\n`;
    message += `🔗 *Join Meeting:* ${event.zoom_join_url}\n`;
    if (event.zoom_password) {
      message += `🔑 *Password:* \`${event.zoom_password}\`\n`;
    }
  } else {
    message += `\n🏢 *Venue Details*\n`;
    message += `📍 *Location:* ${event.venue || 'To be announced'}\n`;
  }
  
  // Organization Details
  message += `\n🏛 *Organization*\n`;
  message += `🏢 *Name:* ${event.organization_name || 'N/A'}\n`;
  message += `👤 *POC:* ${event.event_coordinator || 'N/A'}\n`;
  message += `📞 *Contact:* ${event.organization_contact || 'N/A'}\n`;
  message += `✉️ *Email:* ${event.organization_email || 'N/A'}\n`;
  
  // Participants List
  if (participants && participants.length > 0) {
    message += `\n👥 *Participants (${participants.length})*\n`;
    participants.forEach((p, i) => {
      message += `${i + 1}. *${p.name}*`;
      if (p.email) message += ` (${p.email})`;
      if (p.phone_no) message += ` / ${p.phone_no}`;
      message += '\n';
    });
  }
  
  // Footer
  message += `\n${isUpdate ? '✅ Event updated successfully!' : '✨ Your event has been created and participants have been notified!'}\n`;
  message += `\n_Thank you for using our event management system!_`;
  
  return message;
}

export function formatParticipantMessage(participant: any, event: any) {
  const isVirtual = event.mode_of_event === 'Virtual';
  const eventType = isVirtual ? '🎥 Virtual Event' : '🏢 In-Person Event';
  
  // Format Zoom meeting details if it's a virtual event with a join URL
  let zoomInfo = '';
  if (isVirtual && event.zoom_join_url) {
    zoomInfo = '\n\n💻 *VIRTUAL EVENT DETAILS*\n';
    zoomInfo += `🔗 *Join Meeting:* ${event.zoom_join_url}\n`;
    
    if (event.zoom_password) {
      zoomInfo += `🔑 *Password:* \`${event.zoom_password}\`\n`;
    }
    
    zoomInfo += '\n💡 *Tip:* Click the link above to join the meeting at the scheduled time.\n';
  }

  const venueInfo = isVirtual 
    ? ''
    : `📍 *Venue:* ${event.venue || 'To be announced'}\n`;

  // Start building the message
  let message = `✨ *REGISTRATION CONFIRMED* ✨\n\n`;
  message += `Hello *${participant.name}*,\n\n`;
  message += `📌 *Event:* ${event.name}\n`;
  message += `📅 *Date:* ${event.date}\n`;
  message += `⏰ *Time:* ${event.start_time} – ${event.end_time}\n`;
  message += `🌐 *Type:* ${eventType}\n`;
  message += venueInfo;
  message += `\n🏛 *Organizer:* ${event.organization_name || 'N/A'}\n`;
  message += `👤 *Event Coordinator:* ${event.event_coordinator || 'N/A'}\n\n`;
  message += `📋 *Your Registration Details*\n`;
  message += `👤 *Name:* ${participant.name}\n`;
    
  // Add participant email if available
  if (participant.email) {
    message += `✉️ *Email:* ${participant.email}\n`;
  }
  
  // Add participant phone if available
  if (participant.phone_no) {
    message += `📞 *Phone:* ${participant.phone_no}\n`;
  }
  
  // Add Zoom info for virtual events
  if (isVirtual && zoomInfo) {
    message += zoomInfo;
  }
  
  // Add contact information
  message += `\n📞 *For Assistance:* ${event.organization_contact || 'N/A'}\n`;
  message += `✉️ *Email:* ${event.organization_email || 'N/A'}\n\n`;
  
  // Add closing message
  message += `We're excited to have you join us${isVirtual ? ' online' : ''}!\n`;
  message += `\nBest regards,\n*${event.organization_name || 'Event Organizer'}*`;
  
  return message;
}
