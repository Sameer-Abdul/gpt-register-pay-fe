import { NextResponse } from 'next/server';
import { db, findEventById } from '@/lib/mockDb';
import { v4 as uuidv4 } from 'uuid';
import { Participant, Event } from '@/types/event';

// Extend the Event type to include participants
interface EventWithParticipants extends Event {
  participants?: Participant[];
}

// GET /api/events/[eventId]/participants - Get all participants for an event
export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  try {
    const event = findEventById(eventId);
    
    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Cast to include participants
    const eventWithParticipants = event as unknown as EventWithParticipants;
    return NextResponse.json(eventWithParticipants.participants || []);
  } catch (error) {
    console.error(`Error fetching participants for event ${eventId}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/participants - Add a new participant to an event
export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  try {
    const eventIdNum = parseInt(eventId, 10);
    const eventIndex = db.events.findIndex(e => e.id === eventIdNum);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const participantData: Omit<Participant, 'id' | 'event_id' | 'created_at'> = await request.json();
    
    const newParticipant: Participant = {
      ...participantData,
      id: Date.now(),
      event_id: eventIdNum,
      created_at: new Date().toISOString(),
    };
    
    // Cast to include participants
    const event = db.events[eventIndex] as unknown as EventWithParticipants;
    event.participants = event.participants || [];
    event.participants.push(newParticipant);
    
    // Update the updated_at timestamp
    event.updated_at = new Date().toISOString();
    
    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error(`Error adding participant to event ${eventId}:`, error);
    return NextResponse.json(
      { message: 'Error adding participant' },
      { status: 500 }
    );
  }
}
