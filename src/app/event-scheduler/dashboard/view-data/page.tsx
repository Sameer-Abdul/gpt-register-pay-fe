'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Search, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  event_coordinator: string;
  performance_type: 'single' | 'group';
  participants: any[];
  organization_name?: string;
  organization_contact?: string;
  organization_email?: string;
  mode_of_event?: string;
  comments?: string;
  zoom_join_url?: string;
  zoom_meeting_id?: string;
  zoom_password?: string;
  zoom_host_url?: string;
}

export default function ViewDataPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [tooltip, setTooltip] = useState<{x: number; y: number; content: string; visible: boolean}>({x: 0, y: 0, content: '', visible: false});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch events from the API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching events with participants...');
        
        // First, get all events
        const eventsResponse = await fetch('/api/events');
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch events');
        }
        const eventsData = await eventsResponse.json();
        const events = eventsData.data || [];
        
        console.log(`Fetched ${events.length} events`);
        
        // Debug: Check the raw events data from the API
        console.log('Raw events data from API:', events);
        
        // Then, fetch participants for each event
        const eventsWithParticipants = await Promise.all(
          events.map(async (event: any) => {
            try {
              console.log(`Fetching details for event ${event.id} (${event.name})`);
              const participantsResponse = await fetch(`/api/events?id=${event.id}`);
              if (!participantsResponse.ok) {
                console.error(`Failed to fetch participants for event ${event.id}`);
                return { 
                  ...event, 
                  participants: [],
                  // Ensure zoom_join_url is included even if there's an error
                  zoom_join_url: event.zoom_join_url,
                  zoom_meeting_id: event.zoom_meeting_id,
                  zoom_password: event.zoom_password,
                  zoom_host_url: event.zoom_host_url
                };
              }
              const eventData = await participantsResponse.json();
              
              // Debug: Log the full event data for this event
              console.log(`Event ${event.id} (${event.name}) full data:`, eventData.data);
              
              return {
                ...event,
                ...eventData.data, // Spread the full event data to ensure we have all fields
                participants: eventData.data?.participants || [],
                // Ensure zoom_join_url is explicitly included
                zoom_join_url: event.zoom_join_url || eventData.data?.zoom_join_url,
                zoom_meeting_id: event.zoom_meeting_id || eventData.data?.zoom_meeting_id,
                zoom_password: event.zoom_password || eventData.data?.zoom_password,
                zoom_host_url: event.zoom_host_url || eventData.data?.zoom_host_url,
                // Ensure mode_of_event is preserved
                mode_of_event: event.mode_of_event || eventData.data?.mode_of_event
              };
            } catch (error) {
              console.error(`Error fetching participants for event ${event.id}:`, error);
              return { 
                ...event, 
                participants: [],
                // Ensure zoom_join_url is included even if there's an error
                zoom_join_url: event.zoom_join_url,
                zoom_meeting_id: event.zoom_meeting_id,
                zoom_password: event.zoom_password,
                zoom_host_url: event.zoom_host_url
              };
            }
          })
        );
        
        console.log('Fetched events with participants:', eventsWithParticipants);
        
        // Debug: Check if zoom_join_url exists in the events
        eventsWithParticipants.forEach((event, index) => {
          console.log(`Event ${index + 1} (${event.name}):`, {
            id: event.id,
            mode_of_event: event.mode_of_event,
            has_zoom_join_url: !!event.zoom_join_url,
            zoom_join_url: event.zoom_join_url,
            zoom_meeting_id: event.zoom_meeting_id
          });
        });
        
        setEvents(eventsWithParticipants);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast({
          title: 'Error',
          description: 'Failed to load events. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // Filter events based on search term
  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.venue && event.venue.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.event_coordinator && event.event_coordinator.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format time to 12-hour format
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString; // Return original if parsing fails
    }
  };

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Handle event deletion
  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/events?id=${eventId}`, {
          method: 'DELETE',
        });

        if (response.status === 204) {
          // Success - no content returned
          // Remove the deleted event from the list
          setEvents(events.filter(event => event.id !== eventId));
          
          toast({
            title: 'Success',
            description: 'Event deleted successfully',
          });
        } else {
          // Handle error response
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Failed to delete event');
        }
      } catch (error: any) {
        console.error('Error deleting event:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete event. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Tooltip content generation function
  const getTooltipContent = (event: Event) => {
    return [
      `Event Name: ${event.name || 'N/A'}`,
      `Date: ${event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'N/A'}`,
      `Time: ${event.start_time ? formatTime(event.start_time) : 'N/A'}${event.end_time ? ` to ${formatTime(event.end_time)}` : ''}`,
      `Venue: ${event.venue || 'N/A'}`,
      `Coordinator: ${event.event_coordinator || 'N/A'}`,
      `Organization: ${event.organization_name || 'N/A'}`,
      `Contact: ${event.organization_contact || 'N/A'}`,
      `Email: ${event.organization_email || 'N/A'}`,
      `Participants: ${event.participants?.length || 0}`
    ].join('\n');
  };

  // Handle mouse move for custom tooltip
  const handleMouseMove = (e: React.MouseEvent, event: Event) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY - 10, // Position above the cursor
      content: getTooltipContent(event),
      visible: true
    });
  };

  // Hide tooltip when mouse leaves the row
  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Event Scheduler - View Data</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/event-scheduler/dashboard/create-event" className="whitespace-nowrap">
              Create New Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Display all created events in table:</h2>
        
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search events..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
            <Button className="mt-4" asChild>
              <Link href="/event-scheduler/dashboard/create-event">
                Create your first event
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-blue-600">
                <TableRow className="hover:bg-blue-600">
                  <TableHead className="w-12 text-white font-semibold border-r border-blue-500 text-center">S.No</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Event Name</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Coordinator</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Date</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Time</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Venue</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Organization</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Contact</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Email</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Type</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Mode</TableHead>
                  <TableHead className="text-white font-semibold text-center border-r border-blue-500">Participants</TableHead>
                  <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {filteredEvents.map((event, index) => (
                  <Fragment key={`fragment-${event.id}`}>
                    <TableRow 
                      key={event.id} 
                      className={`${index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'} 
                      transition-colors duration-200 cursor-pointer`}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = 'translateY(0)';
                      }}
                    >
                      <TableCell 
                        className="text-center text-sm text-gray-600 font-medium border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Click to view details"
                      >
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEventExpansion(event.id);
                            }}
                            className="text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 rounded p-1"
                            aria-label={expandedEvents[event.id] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedEvents[event.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <span className="ml-2">{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="font-medium border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Name"
                      >
                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                          {event.name}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Coordinator"
                      >
                        <div className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          {event.event_coordinator || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Date"
                      >
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Time"
                      >
                        {event.start_time ? (
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell 
                        className="max-w-[200px] truncate border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Venue"
                      >
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          {event.venue || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Organization"
                      >
                        <div className="text-sm text-gray-900 group-hover:text-gray-800 transition-colors duration-200">
                          {event.organization_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Contact"
                      >
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          {event.organization_contact || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Email"
                      >
                        <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                          {event.organization_email || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Type"
                      >
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {event.performance_type 
                            ? event.performance_type === 'single' ? 'Single' : 'Group'
                            : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title={event.mode_of_event === 'Virtual' ? 'Virtual Meeting' : 'In-Person'}
                      >
                        {event.mode_of_event === 'Virtual' && event.zoom_join_url ? (
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs text-gray-500">Virtual</span>
                            <a 
                              href={event.zoom_join_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm truncate max-w-[180px] block"
                              onClick={(e) => e.stopPropagation()}
                              title={event.zoom_join_url}
                            >
                              {event.zoom_join_url.replace('https://', '')}
                            </a>
                            {event.zoom_password && (
                              <span className="text-xs text-gray-500">
                                Password: {event.zoom_password}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-700">
                            {event.mode_of_event || 'In-Person'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="text-center border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Number of Participants"
                      >
                        <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-linear-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium border border-blue-200 group-hover:from-blue-50 group-hover:to-blue-100 transition-all duration-200">
                          {event.participants?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 pr-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-3 text-sm"
                            asChild
                          >
                            <Link href={`/event-scheduler/dashboard/edit-event/${event.id}`}>
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-3 text-sm text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedEvents[event.id] && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={11} className="p-0 border-t border-gray-200">
                          <div className="p-4 bg-white border border-gray-100 rounded-b-lg mx-2 mb-2">
                            {/* Event Details Section */}
                            <div className="mb-6">
                              <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                Event Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Event Name</div>
                                  <div className="text-gray-800">{event.name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Date</div>
                                  <div className="text-gray-800">
                                    {event.date ? format(new Date(event.date), 'MMMM d, yyyy') : 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Time</div>
                                  <div className="text-gray-800">
                                    {event.start_time ? (
                                      <>
                                        {formatTime(event.start_time)}
                                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                                      </>
                                    ) : 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Venue</div>
                                  <div className="text-gray-800">{event.venue || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Event Coordinator</div>
                                  <div className="text-gray-800">{event.event_coordinator || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Performance Type</div>
                                  <div className="text-gray-800 capitalize">
                                    {event.performance_type || 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Mode of Event</div>
                                  {event.mode_of_event === 'Virtual' ? (
                                    <div className="space-y-1">
                                      <div className="text-gray-800">Virtual</div>
                                      {event.zoom_join_url && (
                                        <a 
                                          href={event.zoom_join_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                          </svg>
                                          Join Zoom Meeting
                                        </a>
                                      )}
                                      {event.zoom_password && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Password:</span> {event.zoom_password}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-800">In-Person</div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Organization</div>
                                  <div className="text-gray-800">{event.organization_name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Contact</div>
                                  <div className="text-gray-800">{event.organization_contact || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Email</div>
                                  <div className="text-gray-800">{event.organization_email || 'N/A'}</div>
                                </div>
                                {event.comments && (
                                  <div className="space-y-1 md:col-span-2">
                                    <div className="font-medium text-gray-500">Additional Comments</div>
                                    <div className="text-gray-800 whitespace-pre-line">{event.comments}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Participants Section - Only show if there are participants */}
                            {event.participants?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                  {event.performance_type === 'single' ? 'Participant Details' : 'Participants'}
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    {event.participants.length}
                                  </span>
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Phone</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Age</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Gender</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Prerequisites</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {event.participants.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 whitespace-nowrap">{p.name || 'N/A'}</td>
                                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.phone_no || 'N/A'}</td>
                                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.email || 'N/A'}</td>
                                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.age || 'N/A'}</td>
                                          <td className="px-3 py-2 whitespace-nowrap text-gray-600 capitalize">{p.gender || 'N/A'}</td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                              p.prerequisites_completed 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {p.prerequisites_completed ? 'Completed' : 'Pending'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div 
          ref={tooltipRef}
          className="fixed bg-blue-700 text-white text-sm px-4 py-2 rounded shadow-lg z-50 pointer-events-none whitespace-pre-line"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 20}px`,
            transform: 'translateY(-100%)',
            maxWidth: '300px',
            lineHeight: '1.5',
            border: '1px solid #1e40af',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
