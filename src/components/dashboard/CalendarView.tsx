'use client';

import { useState, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, type Event as RBCEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useQuery } from '@tanstack/react-query';
import type { Event as ApiEvent } from '@/types/event';

// Extend the base RBC event type with our custom fields
type CalendarEvent = Omit<ApiEvent, 'start' | 'end'> & RBCEvent & {
  start: Date;
  end: Date;
};
import EventDetailsModal from '@/components/events/EventDetailsModal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function CalendarView() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Fetch events from the API
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event as ApiEvent);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleCreateEvent = useCallback(() => {
    router.push('/events/create');
  }, [router]);

  const handleNavigateToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleNavigateToPrevMonth = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = addMonths(prevDate, -1);
      return newDate;
    });
  }, []);

  const handleNavigateToNextMonth = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = addMonths(prevDate, 1);
      return newDate;
    });
  }, []);

  const handleDateNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Format the current month and year for display
  const currentMonthYear = format(currentDate, 'MMMM yyyy');

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-semibold text-gray-900">DO Events Calendar</h1>
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={handleNavigateToPrevMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Previous month"
              title="Previous month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleNavigateToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors border-l border-r border-gray-100"
              title="Go to today"
            >
              Today
            </button>
            <button
              onClick={handleNavigateToNextMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Next month"
              title="Next month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="px-4 text-sm font-medium text-gray-700 border-l border-gray-100">
              {currentMonthYear}
            </span>
          </div>
        </div>
        <Button 
          onClick={handleCreateEvent} 
          className="gap-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          onNavigate={handleDateNavigate}
          onView={() => {}}
          onSelectEvent={handleSelectEvent}
          toolbar={false}
          components={{
            event: (eventProps) => (
              <div 
                {...eventProps}
                className="px-2 py-1 text-sm font-medium text-white truncate"
                title={eventProps.title}
              >
                {eventProps.title}
              </div>
            )
          }}
          eventPropGetter={() => ({
            style: {
              backgroundColor: '#4f46e5',
              borderRadius: '0.25rem',
              border: 'none',
              boxShadow: 'none',
            }
          })}
          style={{
            height: '100%',
            padding: '1rem'
          } as React.CSSProperties}
        />
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
