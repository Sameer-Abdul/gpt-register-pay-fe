import { v4 as uuidv4 } from 'uuid';
import { Event, Participant } from '@/types/event';

// In-memory database for development
const db = {
  events: [] as Event[],
  participants: new Map<number, Participant[]>(),
};

// Helper function to find an event by ID
const findEventById = (id: string): Event | undefined => {
  return db.events.find(event => event.id.toString() === id);
};

// Helper function to find events by user ID (for filtering)
const findEventsByUserId = (userId: number): Event[] => {
  return db.events.filter(event => event.created_by === userId);
};

// Create a new event
const createEvent = (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>, userId: number): Event => {
  const newEvent: Event = {
    ...eventData,
    id: Date.now(),
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  db.events.push(newEvent);
  return newEvent;
};

// Update an existing event
const updateEvent = (id: number, updates: Partial<Event>): Event | null => {
  const eventIndex = db.events.findIndex(e => e.id === id);
  if (eventIndex === -1) return null;
  
  const updatedEvent = {
    ...db.events[eventIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  db.events[eventIndex] = updatedEvent;
  return updatedEvent;
};

// Delete an event
const deleteEvent = (id: number): boolean => {
  const initialLength = db.events.length;
  db.events = db.events.filter(e => e.id !== id);
  return db.events.length !== initialLength;
};

// Initialize with some mock data if needed
const initializeMockData = () => {
  if (db.events.length === 0) {
    const event1: Event = {
      id: 1,
      name: 'Team Meeting',
      mode_of_event: 'In-Person',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      start_time: '10:00:00',
      end_time: '11:00:00',
      venue: 'Conference Room A',
      organization_name: 'Acme Inc',
      organization_contact: '1234567890',
      organization_email: 'contact@acme.com',
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const event2: Event = {
      id: 2,
      name: 'Product Demo',
      mode_of_event: 'Online',
      date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // 2 days later
      start_time: '14:00:00',
      end_time: '16:00:00',
      venue: 'Online',
      organization_name: 'Tech Corp',
      organization_contact: '+1987654321',
      organization_email: 'alice@example.com',
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.events.push(event1, event2);

    db.events = [event1, event2];
  }
};

// Initialize mock data
initializeMockData();

export { 
  db, 
  findEventById, 
  findEventsByUserId, 
  createEvent, 
  updateEvent, 
  deleteEvent 
};

export default db;
