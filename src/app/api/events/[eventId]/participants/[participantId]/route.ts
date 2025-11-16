import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db, findEventById } from '@/lib/mockDb';
import { getEventParticipants } from '@/lib/eventDb';
import { Event, Participant } from '@/types/event';

// GET /api/events/[eventId]/participants/[participantId] - Get a specific participant
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; participantId: string }> }
) {
  const { eventId, participantId } = await context.params;
  try {
    
    // Fetch participants for the event
    const participants = await getEventParticipants(parseInt(eventId));
    const participant = participants.find((p: Participant) => p.id.toString() === participantId);
    
    if (!participant) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(participant);
  } catch (error) {
    console.error(`Error fetching participant ${participantId}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]/participants/[participantId] - Update a participant
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; participantId: string }> }
) {
  const { eventId, participantId } = await context.params;
  try {
    
    // Get the participant
    const participants = await getEventParticipants(parseInt(eventId));
    const participant = participants.find((p: Participant) => p.id.toString() === participantId);
    
    if (!participant) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Update participant
    const participantData = await request.json();
    const updatedParticipant = {
      ...participant,
      ...participantData,
      id: participantId,
      updated_at: new Date().toISOString()
    };
    
    // In a real implementation, you would update the participant in the database here
    // For now, we'll just return the updated participant
    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error(`Error updating participant ${participantId}:`, error);
    return NextResponse.json(
      { message: 'Error updating participant' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/participants/[participantId] - Delete a participant
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; participantId: string }> }
) {
  const { eventId, participantId } = await context.params;
  try {
    
    // Check if participant exists
    const participants = await getEventParticipants(parseInt(eventId));
    const participantIndex = participants.findIndex((p: Participant) => p.id.toString() === participantId);
    
    if (participantIndex === -1) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would delete the participant from the database here
    // For now, we'll just return success
    return NextResponse.json(
      { message: 'Participant deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting participant ${participantId}:`, error);
    return NextResponse.json(
      { message: 'Error deleting participant' },
      { status: 500 }
    );
  }
}
