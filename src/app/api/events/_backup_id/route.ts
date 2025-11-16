import { NextResponse } from 'next/server';
import { db, findEventById } from '@/lib/mockDb';
import { Event } from '@/types/event';

// GET /api/events/[id] - Get a specific event by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = findEventById(params.id);
    
    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(event);
  } catch (error) {
    console.error(`Error fetching event ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update an existing event
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure we have a valid ID parameter
    if (!params.id) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Convert ID to number and validate
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { message: 'Invalid event ID format' },
        { status: 400 }
      );
    }
    
    // Find the event by ID
    const eventIndex = db.events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const updates: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'userId'>> = await request.json();
    
    const updatedEvent: Event = {
      ...db.events[eventIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    db.events[eventIndex] = updatedEvent;
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error(`Error updating event ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error updating event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure we have a valid ID parameter
    if (!params.id) {
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Convert ID to number and validate
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { message: 'Invalid event ID format' },
        { status: 400 }
      );
    }
    
    // Find the event by ID
    const eventIndex = db.events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Remove the event from the array
    db.events.splice(eventIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting event ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error deleting event' },
      { status: 500 }
    );
  }
}
