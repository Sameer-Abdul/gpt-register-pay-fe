import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getEventParticipants as getEventRegistrations, registerParticipant } from '@/lib/eventDb';
import { EventRegistration, Participant } from '@/types/event';

// GET /api/events/[eventId]/registrations - Get all registrations for an event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const registrations = await getEventRegistrations(eventIdNum);
    return NextResponse.json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/registrations - Register for an event
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const requestData = await request.json();
    
    // Map the request data to match the Participant type
    const participantData = {
      name: requestData.attendee_name,
      email: requestData.attendee_email,
      // Add other fields as needed
    };

    // Basic validation
    if (!participantData.name || !participantData.email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Register the participant with required fields
    const registrationData = {
      name: participantData.name,
      email: participantData.email,
      phone_no: requestData.phone || '', // Default empty string if not provided
      address: requestData.address || '', // Default empty string if not provided
      gender: requestData.gender || 'other', // Default to 'other' if not provided
      event_id: eventIdNum, // Use the parsed number
      age: requestData.age ? parseInt(requestData.age) : 0, // Default to 0 if not provided
      latitude: requestData.latitude ? String(requestData.latitude) : undefined,
      longitude: requestData.longitude ? String(requestData.longitude) : undefined,
      prerequisites_completed: requestData.mandatoryPrerequisite || false
    };

    const registration = await registerParticipant(registrationData);

    return NextResponse.json(
      { success: true, data: registration },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering for event:', error);
    
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { success: false, error: 'You are already registered for this event' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
