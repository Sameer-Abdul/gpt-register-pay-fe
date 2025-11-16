import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7753907098:AAGbDxcP76t3m7z1VOv6TNr4JuzsIVBmD50';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function sendMessage(chatId: string | number, text: string) {
  const url = `${TELEGRAM_API}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { ok: false, error };
  }
}

// Handle OPTIONS method for CORS preflight
// @ts-ignore
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    let update;
    try {
      update = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    console.log('Received update:', JSON.stringify(update, null, 2));
    
    // Handle the /link command
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const messageText = update.message.text.trim();
      
      // Handle /link command
      if (messageText.startsWith('/link')) {
        // Extract phone number (remove '/link' and any whitespace)
        const phoneNumber = messageText.replace(/^\/link\s*/, '').trim();
        
        // Basic phone number validation (10 digits)
        if (/^\d{10}$/.test(phoneNumber)) {
          const formattedNumber = `+91${phoneNumber}`; // Assuming Indian numbers
          
          try {
            // Create the table if it doesn't exist
            await query(`
              CREATE TABLE IF NOT EXISTS telegram_links (
                id SERIAL PRIMARY KEY,
                chat_id BIGINT UNIQUE NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              )
            `);
            
            // Insert or update the link
            await query(
              `INSERT INTO telegram_links (chat_id, phone_number, created_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (chat_id) 
               DO UPDATE SET 
                 phone_number = EXCLUDED.phone_number, 
                 updated_at = NOW()
               RETURNING *`,
              [chatId, formattedNumber]
            );
            
            await sendMessage(
              chatId,
              `✅ *Success!* \n\nYour phone number *${formattedNumber}* has been linked to receive event notifications.\n\nYou will now receive updates about your events.`
            );
          } catch (dbError) {
            console.error('Database error:', dbError);
            await sendMessage(
              chatId,
              '⚠️ *Error*\n\nWe encountered an issue saving your number. Please try again later.'
            );
          }
        } else {
          // Invalid phone number format
          await sendMessage(
            chatId,
            '❌ *Invalid Format*\n\nPlease send your 10-digit phone number after /link.\n\nExample: `/link 9876543210`'
          );
        }
      }
      
      // Help command
      else if (messageText === '/start' || messageText === '/help') {
        await sendMessage(
          chatId,
          `👋 *Welcome to Event Notifications*\n\nTo receive event notifications, link your phone number using:\n\`/link YOUR_PHONE_NUMBER\`\n\nExample: \`/link 9876543210\``
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Telegram webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
