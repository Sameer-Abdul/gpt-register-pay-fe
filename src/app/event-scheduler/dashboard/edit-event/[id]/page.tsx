"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, X, User, MessageSquare, Building } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Define enums with explicit types
const modeOfEventEnum = ['In-Person', 'Online', 'Hybrid'] as const;
type ModeOfEvent = typeof modeOfEventEnum[number];

const performanceTypeEnum = ['single', 'group'] as const;
type PerformanceType = typeof performanceTypeEnum[number];

// Define gender and participant types
const GENDER_OPTIONS = ['', 'Male', 'Female', 'Other', 'Prefer not to say'] as const;
type Gender = typeof GENDER_OPTIONS[number];

// Define form schema
const eventFormSchema = z.object({
  // Event Information
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.date().refine((date) => !isNaN(date.getTime()), {
    message: 'Please select a valid date',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  venue: z.string().min(1, 'Venue is required'),
  eventCoordinator: z.string().min(1, 'Event coordinator is required'),
  modeOfEvent: z.enum(['In-Person', 'Virtual', 'Hybrid'] as const).default('In-Person'),
  comments: z.string().optional(),
  additionalComments: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  
  // Organization Information
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationPOC: z.string().min(1, 'Organization POC is required'),
  organizationContact: z.string().min(1, 'Contact number is required'),
  organizationEmail: z.string()
    .email('Invalid email format')
    .or(z.literal(''))
    .optional(),
  
  // Performance Type
  performanceType: z.enum(['single', 'group'] as const).default('single'),
  
  // Participants
  participants: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.coerce.number()
        .min(0, 'Age must be a positive number')
        .optional(),
      phone: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format'),
      email: z.string()
        .email('Invalid email format')
        .or(z.literal(''))
        .optional(),
      address: z.string().optional(),
      gender: z.enum(['', 'Male', 'Female', 'Other', 'Prefer not to say'] as const).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      mandatoryPrerequisite: z.boolean().default(false),
      additionalComments: z.string().optional(),
    })
  ).default([]),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Default participant for the form
const defaultParticipant = {
  name: '',
  age: undefined as number | undefined,
  phone: '',
  email: '',
  address: '',
  gender: '' as Gender,
  latitude: '',
  longitude: '',
  mandatoryPrerequisite: false,
  additionalComments: ''
};

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session, status } = useSession();

  // Initialize form with react-hook-form and zod resolver
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema) as any, // Type assertion to handle the resolver type
    defaultValues: {
      eventName: '',
      eventDate: new Date(),
      startTime: '',
      endTime: '',
      venue: '',
      modeOfEvent: 'In-Person',
      latitude: '',
      longitude: '',
      organizationName: '',
      organizationContact: '',
      organizationEmail: '',
      performanceType: 'single',
      participants: [],
    },
  });

  const { 
    register, 
    handleSubmit, 
    control, 
    watch, 
    setValue, 
    reset, 
    formState: { errors } 
  } = form;

  const performanceType = watch('performanceType');
  const participants = watch('participants') || [];
  
  // Watch for form changes for debugging
  const formValues = watch();
  useEffect(() => {
    console.log('Form values changed:', formValues);
  }, [formValues]);
  
  // Add a new participant with default values
  const addParticipant = (event: any) => {
    event?.preventDefault();
    setValue('participants', [...(participants || []), { ...defaultParticipant }]);
  };

  // Remove a participant
  const removeParticipant = (index: number) => {
    const updatedParticipants = [...(participants || [])];
    updatedParticipants.splice(index, 1);
    setValue('participants', updatedParticipants);
  };

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!params?.id) return;
      
      try {
        const response = await fetch(`/api/events?id=${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch event');
        }
        
        const { data: event } = await response.json();
        
        if (!event) {
          throw new Error('Event not found');
        }
        
        // Format the event data for the form
        const formattedEvent: any = {
          eventName: event.name,
          eventDate: new Date(event.date),
          startTime: event.start_time,
          endTime: event.end_time,
          venue: event.venue,
          eventCoordinator: event.event_coordinator || '',
          modeOfEvent: event.mode_of_event || 'In-Person',
          comments: event.comments || '',
          additionalComments: event.additional_comments || '',
          latitude: event.latitude || '',
          longitude: event.longitude || '',
          organizationName: event.organization_name,
          organizationPOC: event.organization_poc || '',
          organizationContact: event.organization_contact,
          organizationEmail: event.organization_email || '',
          performanceType: event.performance_type || 'single',
          participants: event.participants?.map((p: any) => {
            // Ensure gender is a valid value
            const gender = GENDER_OPTIONS.includes(p.gender as Gender) 
              ? (p.gender as Gender)
              : '';
              
            return {
              name: p.name,
              age: p.age || undefined,
              phone: p.phone_no,
              email: p.email || '',
              address: p.address || '',
              gender,
              latitude: p.latitude || '',
              longitude: p.longitude || '',
              mandatoryPrerequisite: p.prerequisites_completed || false,
              additionalComments: p.additional_comments || '',
            };
          }) || [],
        };
        
        reset(formattedEvent);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast({
          title: 'Error',
          description: 'Failed to load event data',
          variant: 'destructive',
        });
        router.push('/event-scheduler/dashboard/view-data');
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchEvent();
    } else if (status === 'unauthenticated') {
      router.push('/event-scheduler/login');
    }
  }, [params.id, reset, router, status, toast]);

  // Handle form submission
  const onSubmit = async (data: EventFormValues) => {
    console.log('🔵 [onSubmit] Form submission started');
    console.log('📝 Form data:', JSON.stringify(data, null, 2));
    setIsSubmitting(true);
    
    try {
      // Check if user is authenticated
      console.log('🔍 Checking authentication status');
      if (status === 'unauthenticated' || !session?.user?.id) {
        const errorMsg = 'User not authenticated';
        console.error('❌ Authentication error:', errorMsg);
        toast({
          title: 'Authentication Required',
          description: 'Please log in to update an event',
          variant: 'destructive',
        });
        router.push('/event-scheduler/login');
        return;
      }
      console.log('✅ User is authenticated');
      console.log('📅 Formatting date and preparing data...');
      
      // Format the date to YYYY-MM-DD
      const formatDate = (date: Date) => {
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) throw new Error('Invalid date');
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Error formatting date:', error);
          throw new Error('Invalid date format');
        }
      };

      // Prepare event data - only include fields that exist in the database
      const eventData = {
        name: data.eventName,
        event_coordinator: data.eventCoordinator,
        mode_of_event: data.modeOfEvent,
        date: formatDate(data.eventDate),
        start_time: data.startTime,
        end_time: data.endTime,
        venue: data.venue,
        // Store comments in additional_comments since there's no comments column
        additional_comments: data.comments || data.additionalComments || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        organization_name: data.organizationName,
        organization_poc: data.organizationPOC,
        organization_contact: data.organizationContact,
        organization_email: data.organizationEmail || null,
        performance_type: data.performanceType || 'single',
        // Don't update created_by on update
      };

      // Prepare participants data with correct field names
      const participants = data.participants
        ?.filter(p => p.name && p.phone)
        .map(participant => {
          // Map form fields to database fields
          const participantData: any = {
            name: participant.name,
            phone_no: participant.phone, // Map 'phone' from form to 'phone_no' in DB
            prerequisites_completed: Boolean(participant.mandatoryPrerequisite),
            additional_comments: participant.additionalComments || null,
          };
          
          // Add optional fields if they exist
          if (participant.age) participantData.age = Number(participant.age);
          if (participant.email) participantData.email = participant.email;
          if (participant.address) participantData.address = participant.address;
          if (participant.gender) participantData.gender = participant.gender;
          if (participant.latitude) participantData.latitude = String(participant.latitude);
          if (participant.longitude) participantData.longitude = String(participant.longitude);
          
          return participantData;
        }) || [];
      
      // Create request data with participants
      const requestData = {
        ...eventData,
        participants: participants.length > 0 ? participants : undefined
      };

      // Prepare the final request data with the event ID
      const finalRequestData = {
        ...requestData,
        id: Number(params?.id) // Add the event ID to the request body
      };

      console.log('📤 Sending update request to /api/events with ID in body:', finalRequestData);
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalRequestData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update event (${response.status}): ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('❌ Error response:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('📥 API Response:', result);
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to update event: No success response from server');
      }
      
      // Show success message
      toast({
        title: '✅ Success',
        description: 'Event updated successfully!',
        duration: 3000,
      });
      
      // Redirect to view data page
      router.push('/event-scheduler/dashboard/view-data');
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to update event. Please try again.';
      
      if (error instanceof Error) {
        console.error('🔍 Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        errorMessage = error.message;
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'You do not have permission to update this event. Please log in again.';
          router.push('/event-scheduler/login');
        } else if (error.message.includes('404')) {
          errorMessage = 'Event not found. It may have been deleted.';
          router.push('/event-scheduler/dashboard/view-data');
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          errorMessage = `Validation error: ${error.message}`;
        }
      }
      
      // Show error toast
      toast({
        title: '❌ Error Updating Event',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000,
        action: {
          label: 'Try Again',
          onClick: () => handleSubmit(onSubmit)()
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
      
      {isLoading ? (
        <div>Loading event data...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Event Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventName">Event Name *</Label>
              <Input
                id="eventName"
                {...register('eventName')}
                placeholder="Enter event name"
              />
              {errors.eventName && (
                <p className="text-sm text-red-500 mt-1">{errors.eventName.message}</p>
              )}
            </div>
            
            <div>
              <Label>Event Date *</Label>
              <div className="relative">
                <Input
                  type="date"
                  {...register('eventDate', { valueAsDate: true })}
                  className="pl-10"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.eventDate && (
                <p className="text-sm text-red-500 mt-1">{errors.eventDate.message}</p>
              )}
            </div>
            
            <div>
              <Label>Event Coordinator *</Label>
              <Input
                {...register('eventCoordinator')}
                placeholder="Enter event coordinator name"
              />
              {errors.eventCoordinator && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.eventCoordinator.message}
                </p>
              )}
            </div>
            
            <div>
              <Label>Mode of Event *</Label>
              <Select
                onValueChange={(value: 'In-Person' | 'Virtual' | 'Hybrid') => setValue('modeOfEvent', value)}
                value={watch('modeOfEvent')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-red-500 mt-1">{errors.startTime.message}</p>
              )}
            </div>
            
            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-sm text-red-500 mt-1">{errors.endTime.message}</p>
              )}
            </div>
            
            <div>
              <Label>Venue *</Label>
              <Input
                {...register('venue')}
                placeholder="Enter venue"
              />
              {errors.venue && (
                <p className="text-sm text-red-500 mt-1">{errors.venue.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="latitude">Latitude (optional)</Label>
              <Input
                id="latitude"
                {...register('latitude')}
                placeholder="e.g., 12.9716"
                type="number"
                step="any"
              />
            </div>
            
            <div>
              <Label htmlFor="longitude">Longitude (optional)</Label>
              <Input
                id="longitude"
                {...register('longitude')}
                placeholder="e.g., 77.5946"
                type="number"
                step="any"
              />
            </div>
          </div>
        </div>
        
        {/* Organization Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                {...register('organizationName')}
                placeholder="Enter organization name"
              />
              {errors.organizationName && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationName.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationPOC">Organization POC *</Label>
              <Input
                id="organizationPOC"
                {...register('organizationPOC')}
                placeholder="Enter organization POC name"
              />
              {errors.organizationPOC && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.organizationPOC.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationContact">Contact Number *</Label>
              <Input
                id="organizationContact"
                {...register('organizationContact')}
                placeholder="Enter contact number"
              />
              {errors.organizationContact && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationContact.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationEmail">Email *</Label>
              <Input
                id="organizationEmail"
                type="email"
                {...register('organizationEmail')}
                placeholder="Enter organization email"
              />
              {errors.organizationEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationEmail.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="performanceType">Performance Type *</Label>
              <Select
                onValueChange={(value: 'single' | 'group') => setValue('performanceType', value)}
                value={watch('performanceType')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Participant</SelectItem>
                  <SelectItem value="group">Group Participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Comments Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </h2>
          <div className="space-y-4">
            <div>
              <Label>Additional Comments</Label>
              <Textarea
                {...register('additionalComments')}
                placeholder="Enter any additional comments"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Participant Details
            </h2>
          </div>
          
          {participants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No participants added yet. Click the button above to add participants.
            </div>
          ) : (
            <div className="space-y-4">
              {participants?.map((participant, index) => (
                <div key={index} className="border rounded-lg p-4 relative">
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        {...register(`participants.${index}.name`)}
                        placeholder="Participant name"
                      />
                      {errors.participants?.[index]?.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Age *</Label>
                      <Input
                        type="number"
                        {...register(`participants.${index}.age`, { 
                          valueAsNumber: true,
                          required: 'Age is required',
                          min: { value: 0, message: 'Age must be a positive number' }
                        })}
                        placeholder="Age"
                        min="0"
                      />
                      {errors.participants?.[index]?.age && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.age?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Phone *</Label>
                      <Input
                        {...register(`participants.${index}.name`)}
                        placeholder="Participant name"
                      />
                      {errors.participants?.[index]?.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Phone *</Label>
                      <Input
                        {...register(`participants.${index}.phone`)}
                        placeholder="Phone number"
                      />
                      {errors.participants?.[index]?.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.phone?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        {...register(`participants.${index}.email`)}
                        placeholder="Email address"
                      />
                      {errors.participants?.[index]?.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.email?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Age (optional)</Label>
                      <Input
                        type="number"
                        {...register(`participants.${index}.age`, { valueAsNumber: true })}
                        placeholder="Age"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <Label>Gender *</Label>
                      <Select
                        onValueChange={(value: Gender) => setValue(`participants.${index}.gender`, value)}
                        value={participant.gender || undefined}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      {!participant.gender && (
                        <p className="text-sm text-red-500 mt-1">Gender is required</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Address *</Label>
                      <Input
                        {...register(`participants.${index}.address`, { required: 'Address is required' })}
                        placeholder="Address"
                      />
                      {errors.participants?.[index]?.address && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants?.[index]?.address?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Address (optional)</Label>
                      <Input
                        {...register(`participants.${index}.address`)}
                        placeholder="Address"
                      />
                    </div>
                    
                    <div>
                      <Label>Latitude (optional)</Label>
                      <Input
                        {...register(`participants.${index}.latitude`)}
                        placeholder="Latitude"
                        type="number"
                        step="any"
                      />
                    </div>
                    
                    <div>
                      <Label>Longitude (optional)</Label>
                      <Input
                        {...register(`participants.${index}.longitude`)}
                        placeholder="Longitude"
                        type="number"
                        step="any"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`prerequisite-${index}`}
                          {...register(`participants.${index}.mandatoryPrerequisite`)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor={`prerequisite-${index}`} className="text-sm font-medium">
                          Mandatory Prerequisite
                        </Label>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Additional Comments</Label>
                      <Textarea
                        {...register(`participants.${index}.additionalComments`)}
                        placeholder="Enter any additional comments"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/event-scheduler/dashboard/view-data')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Event'}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
