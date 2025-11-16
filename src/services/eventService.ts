import { Event, Participant } from '@/types/event';
import api from '@/lib/api';

export interface CreateEventData {
  name: string;
  description: string;
  start: Date | string;
  end: Date | string;
  venue: string;
  organizationName: string;
  participants: Omit<Participant, 'id' | 'eventId'>[];
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

const eventService = {
  // Get all events
  async getEvents(): Promise<Event[]> {
    try {
      const response = await api.get<Event[]>('/events');
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get a single event by ID
  async getEventById(id: string): Promise<Event> {
    try {
      const response = await api.get<Event>(`/events/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new event
  async createEvent(eventData: CreateEventData): Promise<Event> {
    try {
      // Ensure dates are properly formatted as ISO strings
      const formattedData = {
        ...eventData,
        start: new Date(eventData.start).toISOString(),
        end: new Date(eventData.end).toISOString(),
      };
      
      const response = await api.post<Event>('/events', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update an existing event
  async updateEvent({ id, ...eventData }: UpdateEventData): Promise<Event> {
    try {
      // Format dates if they exist in the update data
      const formattedData = { ...eventData };
      
      if (formattedData.start) {
        formattedData.start = new Date(formattedData.start).toISOString();
      }
      
      if (formattedData.end) {
        formattedData.end = new Date(formattedData.end).toISOString();
      }
      
      const response = await api.put<Event>(`/events/${id}`, formattedData);
      return response.data;
    } catch (error) {
      console.error(`Error updating event with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete an event
  async deleteEvent(id: string): Promise<void> {
    try {
      await api.delete(`/events/${id}`);
    } catch (error) {
      console.error(`Error deleting event with ID ${id}:`, error);
      throw error;
    }
  },

  // Add a participant to an event
  async addParticipant(eventId: string, participant: Omit<Participant, 'id' | 'eventId'>): Promise<Participant> {
    try {
      const response = await api.post<Participant>(`/events/${eventId}/participants`, participant);
      return response.data;
    } catch (error) {
      console.error(`Error adding participant to event ${eventId}:`, error);
      throw error;
    }
  },

  // Remove a participant from an event
  async removeParticipant(eventId: string, participantId: string): Promise<void> {
    try {
      await api.delete(`/events/${eventId}/participants/${participantId}`);
    } catch (error) {
      console.error(`Error removing participant ${participantId} from event ${eventId}:`, error);
      throw error;
    }
  },
};

export default eventService;
