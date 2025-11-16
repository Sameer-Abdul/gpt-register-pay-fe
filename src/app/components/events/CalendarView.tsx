'use client';

import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { 
  format, 
  parse, 
  startOfWeek, 
  getDay, 
  isToday as isDateToday, 
  differenceInMinutes 
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type EventData = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
};

export default function CalendarView() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  // Fetch events from the backend
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      // Replace with actual API call
      // const response = await axios.get('/api/events');
      // setEvents(response.data);
      
      // Mock data for now
      setEvents([
        {
          id: '1',
          title: 'Team Meeting',
          start: new Date(2025, 2, 15, 10, 0),
          end: new Date(2025, 2, 15, 11, 0),
        },
        {
          id: '2',
          title: 'Client Call',
          start: new Date(2025, 2, 16, 14, 0),
          end: new Date(2025, 2, 16, 15, 0),
        },
      ]);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle event selection
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event as EventData);
    setShowEventModal(true);
  };

  // Handle date selection for new events
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const newEvent: EventData = {
      id: `event-${Date.now()}`,
      title: 'New Event',
      start,
      end,
    };
    setSelectedEvent(newEvent);
    setShowEventModal(true);
  };

  // Handle saving events
  const handleSaveEvent = async (eventData: EventData) => {
    try {
      // Replace with actual API call
      // await axios.post('/api/events', eventData);
      
      // Update local state
      if (eventData.id.startsWith('event-')) {
        // New event
        setEvents([...events, { ...eventData, id: `event-${Date.now()}` }]);
      } else {
        // Update existing event
        setEvents(events.map(e => e.id === eventData.id ? eventData : e));
      }
      
      setShowEventModal(false);
      toast.success('Event saved successfully');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  // Handle deleting events
  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Replace with actual API call
      // await axios.delete(`/api/events/${eventId}`);
      
      // Update local state
      setEvents(events.filter(e => e.id !== eventId));
      setShowEventModal(false);
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Event Calendar</h2>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowEventModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          New Event
        </button>
      </div>
      
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            defaultView="month"
            views={['month', 'week', 'day', 'agenda']}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: '#3b82f6',
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
              },
            })}
          />
        )}
      </div>

      {/* Event Modal - To be implemented */}
      {showEventModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {selectedEvent ? 'Edit Event' : 'Create New Event'}
                </h3>
                {/* Event form would go here */}
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Event form will be implemented here with all necessary fields.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => selectedEvent && handleSaveEvent(selectedEvent)}
                >
                  Save
                </button>
                {selectedEvent && (
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
