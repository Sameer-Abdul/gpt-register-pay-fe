'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import type { Event as ApiEvent } from '@/types/event';
import axios from 'axios';
import * as yup from 'yup';

// Use the Event type from the types directory
type Event = ApiEvent;

// Define the event data types
interface RegistrationData {
  id: string;
  name: string;
  email: string;
  phone: string;
  paymentAmount: number;
  paymentDate: string;
  referenceNumber: string;
  tenantId: string;
}

interface PaymentData {
  id: string;
  utrNumber: string;
  paymentDate: string;
  amount: number;
  screenshotUrl: string;
}

type ActiveView = 'calendar' | 'create' | 'events';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Validation schema for event form
const eventValidationSchema = yup.object().shape({
  name: yup.string().required('Event name is required'),
  description: yup.string(),
  start: yup.date().required('Start date is required'),
  end: yup.date()
    .required('End date is required')
    .min(yup.ref('start'), 'End date must be after start date'),
  organizationPOC: yup.string().required('Organization POC is required'),
  pocMobile: yup.string()
    .matches(/^[0-9]{10}$/, 'Invalid mobile number')
    .required('Mobile number is required'),
  pocEmail: yup.string().email('Invalid email').required('Email is required'),
  alternateNumber: yup.string().matches(/^[0-9]{10}$/, 'Invalid mobile number'),
  venue: yup.string().required('Venue is required'),
  organizationName: yup.string().required('Organization name is required'),
  latitude: yup.number().typeError('Must be a valid number'),
  longitude: yup.number().typeError('Must be a valid number'),
  eventCoordinator: yup.string(),
  comments: yup.string(),
  performanceType: yup.string().oneOf(['single', 'group']).required('Performance type is required'),
  participants: yup.array().when('performanceType', {
    is: (val: string) => val === 'single',
    then: (schema: yup.ArraySchema<any, any, any>) => schema.min(1, 'At least one participant is required')
  })
});

// Define component props interfaces
interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

interface CreateEventFormProps {
  event?: Event;
  onSubmit: (eventData: Partial<Event>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface EventsListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => Promise<void>;
  onView: (event: Event) => void;
}

// Dynamically import modules for code-splitting with proper typing
const CalendarView = dynamic(
  () => import('@/components/events/CalendarView'),
  { 
    loading: () => <Skeleton className="h-[600px] w-full" />, 
    ssr: false 
  }
);

const CreateEventForm = dynamic<CreateEventFormProps>(
  () => import('@/components/events/CreateEventForm'),
  { 
    loading: () => <Skeleton className="h-[600px] w-full" />, 
    ssr: false 
  }
);

const EventsList = dynamic<EventsListProps>(
  () => import('@/components/events/EventsList'),
  { 
    loading: () => <Skeleton className="h-[600px] w-full" />, 
    ssr: false 
  }
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:3000/api';

export default function SuccessPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('calendar');
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    if (!registration?.email) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get<ApiResponse<Event[]>>(
        `${API_BASE_URL}/events`,
        { params: { email: registration.email } }
      );
      
      if (response.data.data) {
        setEvents(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [registration?.email]);

  // Handle create/update event
  const handleSubmitEvent = async (eventData: Partial<Event>) => {
    setIsSubmitting(true);
    try {
      const url = eventData.id 
        ? `${API_BASE_URL}/events/${eventData.id}`
        : `${API_BASE_URL}/events`;
      
      const method = eventData.id ? 'put' : 'post';
      
      const response = await axios[method]<ApiResponse<Event>>(url, {
        ...eventData,
        userId: registration?.email,
      });

      if (response.data.data) {
        toast.success(`Event ${eventData.id ? 'updated' : 'created'} successfully`);
        await fetchEvents();
        setActiveView('calendar');
      }
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error(`Failed to ${eventData.id ? 'update' : 'create'} event`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete event with confirmation dialog
  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (!confirmed) return;
    
    try {
      const response = await axios.delete<ApiResponse<void>>(`${API_BASE_URL}/events/${eventId}`);
      
      if (response.status === 200) {
        toast.success('Event deleted successfully');
        await fetchEvents();
        
        // If the deleted event was selected, clear the selection
        if (selectedEvent?.id === Number(eventId)) {
          setSelectedEvent(null);
          setIsModalOpen(false);
        }
      } else {
        throw new Error(response.data.error || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  // Handle event selection from calendar
  const handleSelectEvent = (event: Event) => {
    const calendarEvents = events.map((event) => ({
      ...event,
      start: new Date(`${event.date}T${event.start_time}`),
      end: new Date(`${event.date}T${event.end_time}`),
      title: event.name,
    }));
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Handle view event details
  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setActiveView('create');
  };

  // Load data from sessionStorage and fetch events on component mount
  useEffect(() => {
    const loadData = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const storedRegistration = sessionStorage.getItem('registrationData');
        const storedPayment = sessionStorage.getItem('paymentData');
        
        if (storedRegistration) {
          const regData = JSON.parse(storedRegistration);
          setRegistration(regData);
          
          // Check license validity
          const licenseCheck = await fetch(`${API_BASE_URL}/license/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: regData.tenantId })
          });
          
          const licenseResult = await licenseCheck.json();
          
          if (!licenseCheck.ok || !licenseResult.valid) {
            toast.error('Your license has expired or is invalid');
            // Redirect to login or appropriate page
            router.push('/login');
            return;
          }
          
          // Fetch events after confirming license is valid
          await fetchEvents();
        }
        
        if (storedPayment) {
          setPayment(JSON.parse(storedPayment));
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load application data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [router, fetchEvents]);

  // Set active view based on URL path
  useEffect(() => {
    if (pathname === '/payment/success') {
      setActiveView('calendar');
    } else if (pathname === '/payment/success/create') {
      setActiveView('create');
    } else if (pathname === '/payment/success/events') {
      setActiveView('events');
    }
  }, [pathname]);

  // Handle event created callback
  const handleEventCreated = (newEvent: Event) => {
    setEvents(prevEvents => [...prevEvents, newEvent]);
    setActiveView('calendar');
  };

  // Render the selected view
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (activeView === 'calendar') {
      return (
        <CalendarView 
          events={events} 
          onEventClick={handleViewEvent}
        />
      );
    } else if (activeView === 'create') {
      return (
        <CreateEventForm 
          event={selectedEvent || undefined}
          onSubmit={handleSubmitEvent} 
          onCancel={() => setActiveView('calendar')} 
          isSubmitting={isSubmitting}
        />
      );
    } else if (activeView === 'events') {
      return (
        <EventsList 
          events={events} 
          onEdit={handleViewEvent} 
          onDelete={handleDeleteEvent}
          onView={(event) => {
            setSelectedEvent(event);
            setIsModalOpen(true);
          }}
        />
      );
    }
  };

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeView === 'calendar' && 'Event Calendar'}
            {activeView === 'create' && (selectedEvent ? 'Edit Event' : 'Create New Event')}
            {activeView === 'events' && 'My Events'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeView === 'calendar' && 'View and manage your scheduled events'}
            {activeView === 'create' && 'Fill in the details to create a new event'}
            {activeView === 'events' && 'View and manage all your events in one place'}
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {renderContent()}
        
        {/* Event Details Modal */}
        {isModalOpen && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedEvent.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">When</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(`${selectedEvent.date}T${selectedEvent.start_time}`).toLocaleString()} - {new Date(`${selectedEvent.date}T${selectedEvent.end_time}`).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Where</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedEvent.venue}</p>
                  </div>
                  
                  {selectedEvent.name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Event Name</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedEvent.name}</p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setActiveView('create');
                          setIsModalOpen(false);
                        }}
                      >
                        Edit Event
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
