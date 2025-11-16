'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events] = useState([
    {
      id: 1,
      title: 'Team Meeting',
      date: new Date(2025, 10, 5, 10, 0),
      endTime: '11:00 AM',
      venue: 'Conference Room A',
      participants: 8,
    },
    {
      id: 2,
      title: 'Project Deadline',
      date: new Date(2025, 10, 12, 15, 30),
      endTime: '16:30 PM',
      venue: 'Office',
      participants: 12,
    },
  ]);

  const todayEvents = events.filter(
    (event) => event.date.toDateString() === date?.toDateString()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[280px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
          <Button>Create Event</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length > 0 ? (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <span className="text-sm font-medium">
                        {format(event.date, 'MMM')}
                      </span>
                      <span className="text-lg font-bold">
                        {format(event.date, 'd')}
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(event.date, 'h:mm a')} - {event.endTime} • {event.venue}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.participants} participants
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No events scheduled</h3>
                  <p className="text-muted-foreground">
                    Get started by creating a new event.
                  </p>
                  <Button className="mt-4">Create Event</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Today'}'s Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length > 0 ? (
              <div className="space-y-4">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(event.date, 'h:mm a')} - {event.endTime}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.venue} • {event.participants} participants
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No events scheduled for today.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
