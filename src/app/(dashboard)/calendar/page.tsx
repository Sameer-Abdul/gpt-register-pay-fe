'use client';

import { useState, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, type Event as RBCEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useQuery } from '@tanstack/react-query';
import type { Event as EventType } from '@/types/event';
import EventDetailsModal from '@/components/events/EventDetailsModal';

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

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  // Fetch events from the API
  const { data, isLoading, error } = useQuery<EventType[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const events = await response.json();
      return Array.isArray(events) ? events : [];
    },
  });

  const handleSelectEvent = useCallback((event: RBCEvent) => {
    setSelectedEvent(event as EventType);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  const events: RBCEvent[] = (data || []).map(event => {
    // Create start and end dates by combining date with time
    const startDate = new Date(event.date);
    const [startHours, startMinutes] = event.start_time.split(':').map(Number);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(event.date);
    const [endHours, endMinutes] = event.end_time.split(':').map(Number);
    endDate.setHours(endHours, endMinutes, 0, 0);

    return {
      ...event,
      start: startDate,
      end: endDate,
      title: event.name,
      allDay: false,
      resource: event,
    } as unknown as RBCEvent;
  });

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your scheduled events
        </p>
      </div>
      
      <div className="h-[calc(100%-4rem)] rounded-lg bg-white p-4 shadow">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: '#4f46e5',
              borderRadius: '4px',
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block',
            },
          })}
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
