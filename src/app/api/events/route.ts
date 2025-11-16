import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getEvents, 
  getEventById, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  getEventParticipants
} from '@/lib/eventDb';
import { sendEmail, formatEventEmail } from '@/lib/email';
import { 
  sendTelegramMessage, 
  formatOrganizerMessage, 
  formatParticipantMessage,
  setNotificationLogger 
} from '@/lib/telegram';
import * as notificationDb from '@/lib/notificationDb';
import { zoomService } from '@/lib/zoom';
import pool from '@/lib/db';
import type { Event, Participant } from '@/types/event';

interface ZoomMeetingDetails {
  join_url: string;
  start_url: string;
  password: string;
  meeting_id?: string;
  host_email?: string;
}

// GET /api/events - Get all events or a single event by ID
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    
    if (eventId) {
      // Get single event by ID with participants (filtered by user)
      const event = await getEventById(Number(eventId), Number(session.user.id));
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or access denied' },
          { status: 404 }
        );
      }
      
      // Get participants for the event
      const participants = await getEventParticipants(Number(eventId));
      
      return NextResponse.json({ 
        success: true, 
        data: {
          ...event,
          participants
        } 
      });
    }
    
    // Get all events for the current user
    const events = await getEvents(Number(session.user.id));
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: Request) {
  console.log('[POST /api/events] Starting request processing');
  
  try {
    console.log('[POST /api/events] Getting session');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      const errorMsg = 'Unauthorized: No session or user ID found';
      console.error(`[POST /api/events] ${errorMsg}`, { session });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[POST /api/events] Parsing request body');
    const eventData = await request.json();
    console.log('[POST /api/events] Received event data:', JSON.stringify(eventData, null, 2));
    
    // Basic validation
    const requiredFields = ['name', 'date', 'start_time', 'end_time', 'venue', 'organization_name', 'organization_contact'];
    const missingFields = requiredFields.filter(field => {
      const value = eventData[field];
      const isMissing = value === undefined || value === null || value === '';
      if (isMissing) {
        console.log(`[POST /api/events] Missing required field: ${field}`);
      }
      return isMissing;
    });
    
    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(`[POST /api/events] Validation error: ${errorMsg}`);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }
    
    // Type assertion with proper typing
    const typedEventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { 
      participants?: Omit<Participant, 'id' | 'event_id' | 'created_at'>[] 
    } = eventData;
    
    // Add created_by to the event data
    const eventWithUser = {
      ...typedEventData,
      created_by: Number(session.user.id)
    };
    
    console.log('[POST /api/events] Creating event with data:', JSON.stringify(eventWithUser, null, 2));
    
    const { participants, ...eventPayload } = typedEventData;
    
    try {
      console.log('[POST /api/events] Calling createEvent with payload:', JSON.stringify({
        ...eventPayload,
        created_by: Number(session.user.id),
        participants: participants || []
      }, null, 2));
      
      let zoomMeeting: ZoomMeetingDetails | null = null;
      
      // Create Zoom meeting if it's a virtual event
      if (eventData.mode_of_event === 'Virtual') {
        try {
          console.log('[POST /api/events] Creating Zoom meeting for virtual event');
          const startDateTime = new Date(`${eventData.date}T${eventData.start_time}`).toISOString();
          
          // Create the Zoom meeting
          const meeting = await zoomService.createMeeting(
            eventData.name,
            startDateTime,
            eventData.duration || 60 // Default to 60 minutes if not specified
          );
          
          zoomMeeting = {
            join_url: meeting.join_url,
            start_url: meeting.start_url,
            password: meeting.password,
            meeting_id: meeting.id, // Make sure to include the meeting ID
            host_email: session.user.email || undefined
          };
          
          console.log('[POST /api/events] Zoom meeting created:', zoomMeeting);
          
          // Add Zoom details to event data
          eventData.zoom_meeting_id = zoomMeeting.meeting_id;
          eventData.zoom_join_url = zoomMeeting.join_url;
          eventData.zoom_host_url = zoomMeeting.start_url;
          eventData.zoom_password = zoomMeeting.password;
          
        } catch (error) {
          console.error('[POST /api/events] Error creating Zoom meeting:', error);
          // Don't fail the event creation if Zoom fails
          // The event will still be created, just without Zoom integration
        }
      }
      
      // Prepare the event data with Zoom details
      const eventDataWithZoom = {
        ...eventPayload,
        created_by: Number(session.user.id),
        participants: participants || [],
      };
      
      // Only add Zoom fields if we have a meeting
      if (zoomMeeting) {
        Object.assign(eventDataWithZoom, {
          zoom_meeting_id: zoomMeeting.meeting_id,
          zoom_join_url: zoomMeeting.join_url,
          zoom_host_url: zoomMeeting.start_url,
          zoom_password: zoomMeeting.password
        });
      }
      
      console.log('[POST /api/events] Creating event with data:', JSON.stringify(eventDataWithZoom, null, 2));
      
      // Create the event with or without Zoom details
      const newEvent = await createEvent(eventDataWithZoom);
      
      // Debug: Log the created event to verify Zoom fields
      console.log('[POST /api/events] Event created with Zoom details:', {
        id: newEvent.id,
        name: newEvent.name,
        mode_of_event: newEvent.mode_of_event,
        zoom_meeting_id: (newEvent as any).zoom_meeting_id,
        zoom_join_url: (newEvent as any).zoom_join_url,
        zoom_host_url: (newEvent as any).zoom_host_url,
        zoom_password: (newEvent as any).zoom_password ? '***' : 'not set'
      });
      
      console.log('[POST /api/events] Event created successfully:', newEvent);
      
      // Set up notification logger
      setNotificationLogger({
        logNotification: notificationDb.logNotification
      });

      // Helper function to send event notifications
      async function sendEventNotifications(
        newEvent: any,
        eventData: any, 
        participants: any[]
      ) {
        try {
          // Prepare Zoom details if this is a virtual event
          const zoomDetails = eventData.mode_of_event === 'Virtual' ? {
            joinUrl: eventData.zoom_join_url,
            password: eventData.zoom_password,
            hostUrl: eventData.zoom_host_url
          } : undefined;

          // Send email notification
          try {
            const emailHtml = formatEventEmail(
              eventData.organization_name || 'Event Organizer',
              eventData.name,
              eventData.date,
              eventData.start_time,
              eventData.end_time,
              eventData.venue,
              eventData.performance_type || 'Group Participants',
              participants.map(p => ({
                name: p.name,
                email: p.email,
                phone: p.phone_no
              })),
              eventData.mode_of_event === 'Virtual',
              zoomDetails
            );

            const emailResult = await sendEmail({
              to: eventData.organization_email,
              subject: `Invite for ${eventData.name}`,
              html: emailHtml,
              cc: participants.map(p => p.email).filter(Boolean) as string[]
            });

            // Log email notification
            await notificationDb.logNotification({
              event_id: newEvent.id,
              recipient_type: 'organization',
              recipient_id: eventData.organization_email,
              message_type: 'email',
              status: emailResult.success ? 'sent' : 'failed',
              error_message: emailResult.success ? undefined : 'Failed to send email'
            });

            if (!emailResult.success) {
              console.error('[POST /api/events] Failed to send email:', emailResult.error);
            } else {
              console.log('[POST /api/events] Email notification sent successfully');
            }
          } catch (emailError) {
            console.error('[POST /api/events] Error sending email notification:', emailError);
            await notificationDb.logNotification({
              event_id: newEvent.id,
              recipient_type: 'organization',
              recipient_id: eventData.organization_email,
              message_type: 'email',
              status: 'failed',
              error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
            });
          }

          // Send Telegram notifications
          try {
            // Send to organization
            if (eventData.organization_contact) {
              const orgMessage = formatOrganizerMessage(eventData, participants);
              const orgResult = await sendTelegramMessage(
                eventData.organization_contact, 
                orgMessage,
                {
                  eventId: newEvent.id,
                  recipientType: 'organization'
                }
              );
              
              if (orgResult.success) {
                console.log('[POST /api/events] Telegram notification sent to organization');
              }
            }

            // Send to participants
            for (const participant of participants) {
              if (participant.phone_no) {
                const participantMessage = formatParticipantMessage(participant, eventData);
                const participantResult = await sendTelegramMessage(
                  participant.phone_no, 
                  participantMessage,
                  {
                    eventId: newEvent.id,
                    recipientType: 'participant'
                  }
                );
                
                if (participantResult.success) {
                  console.log(`[POST /api/events] Telegram notification sent to participant: ${participant.name}`);
                }
              }
            }
          } catch (telegramError) {
            console.error('[POST /api/events] Error sending Telegram notifications:', telegramError);
          }
        } catch (error) {
          console.error('[POST /api/events] Error in notification handling:', error);
        }
      }

      // Send notifications if we have participants and organization email
      if (eventData.organization_email && participants && participants.length > 0) {
        await sendEventNotifications(newEvent, eventData, participants);
      }
      
      // Prepare success response
      const responseData = {
        success: true,
        data: {
          ...newEvent,
          participants: participants || []
        }
      };
      
      console.log('[POST /api/events] Sending response:', JSON.stringify(responseData, null, 2));
      return NextResponse.json(responseData, { status: 201 });
      
    } catch (error) {
      console.error('[POST /api/events] Error creating event:', error);
      
      let errorMessage = 'Failed to create event in database';
      let statusCode = 500;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('duplicate key')) {
          statusCode = 409; // Conflict
        } else if (errorMessage.includes('violates foreign key constraint')) {
          statusCode = 400; // Bad Request
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('[POST /api/events] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).stack })
      },
      { status: 500 }
    );
  } finally {
    console.log('[POST /api/events] Request processing completed');
  }
}


// PUT /api/events - Update an existing event
export async function PUT(request: Request) {
  console.log('[PUT /api/events] Starting request processing');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('[PUT /api/events] Session:', { 
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session?.user?.id) {
      console.log('[PUT /api/events] Unauthorized: No session or user ID');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[PUT /api/events] Parsing request body');
    
    // Log raw body for debugging
    const rawBody = await request.text();
    console.log('[PUT /api/events] Raw request body:', rawBody);
    
    let eventData: Partial<Event> & { 
      id: number; 
      participants?: Omit<Participant, 'id' | 'event_id' | 'created_at'>[];
    };
    
    try {
      eventData = JSON.parse(rawBody);
      console.log('[PUT /api/events] Parsed request body:', JSON.stringify(eventData, null, 2));
    } catch (parseError) {
      console.error('[PUT /api/events] Error parsing JSON:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    if (!eventData.id) {
      console.error('[PUT /api/events] Missing event ID');
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!eventData.id) {
      console.error('[PUT /api/events] Missing event ID in request');
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the event exists and user has permission
    console.log(`[PUT /api/events] Fetching event with ID: ${eventData.id}`);
    const existingEvent = await getEventById(eventData.id);
    
    if (!existingEvent) {
      console.error(`[PUT /api/events] Event not found with ID: ${eventData.id}`);
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    console.log('[PUT /api/events] Found existing event:', {
      id: existingEvent.id,
      name: existingEvent.name,
      createdBy: existingEvent.created_by,
      currentUser: session.user.id
    });
    
    if (existingEvent.created_by !== Number(session.user.id)) {
      console.error(`[PUT /api/events] User ${session.user.id} is not authorized to update event ${eventData.id}`);
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this event' },
        { status: 403 }
      );
    }
    
    // Update the event
    const { participants, ...eventUpdateData } = eventData;
    
    console.log('[PUT /api/events] Updating event with data:', JSON.stringify(eventUpdateData, null, 2));
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the event
      const updatedEvent = await updateEvent(eventData.id, eventUpdateData);
      
      if (!updatedEvent) {
        throw new Error('Failed to update event');
      }
      
      // Handle participants if provided
      if (Array.isArray(participants)) {
        console.log(`[PUT /api/events] Processing ${participants.length} participants`);
        
        // Delete existing participants for this event
        await client.query('DELETE FROM participant WHERE event_id = $1', [eventData.id]);
        
        // Insert updated participants
        for (const participant of participants) {
          if (participant.name && participant.phone_no) {
            await client.query(
              `INSERT INTO participant (
                event_id, name, age, phone_no, email, 
                address, gender, latitude, longitude, prerequisites_completed
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                eventData.id,
                participant.name,
                participant.age || null,
                participant.phone_no,
                participant.email || null,
                participant.address || '',
                participant.gender || 'other',
                participant.latitude || null,
                participant.longitude || null,
                participant.prerequisites_completed || false
              ]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      console.log('[PUT /api/events] Event updated successfully');
      
      // Fetch the complete updated event with participants
      const completeEvent = await getEventById(eventData.id);
      const eventParticipants = await getEventParticipants(eventData.id);
      
      const responseData = {
        success: true,
        data: {
          ...completeEvent,
          participants: eventParticipants
        }
      };
      
      console.log('[PUT /api/events] Sending response:', JSON.stringify(responseData, null, 2));
      
      return NextResponse.json(responseData);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PUT /api/events] Error in transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: (error as Error).stack })
      },
      { status: 500 }
    );
  }
}

// DELETE /api/events - Delete an event
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // First, verify the event exists and belongs to the user
    const existingEvent = await getEventById(Number(eventId), Number(session.user.id));
    if (!existingEvent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event not found or you do not have permission to delete it' 
        },
        { status: 403 }
      );
    }
    
    // Delete the event (participants will be deleted due to CASCADE)
    const success = await deleteEvent(Number(eventId));
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete event' },
        { status: 500 }
      );
    }
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
