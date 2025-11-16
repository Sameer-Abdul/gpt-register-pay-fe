"use client";

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Define form schema with Zod
const eventFormSchema = z.object({
  // Event Information
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.date(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  venue: z.string().min(1, 'Venue is required'),
  
  // Organization Information
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationPOC: z.string().min(1, 'Organization POC is required'),
  organizationEmail: z.string().email('Valid organization email is required'),
  organizationContact: z.string().min(10, 'Valid contact number is required'),
  alternateContact: z.string().optional(),
  
  // Event Details
  modeOfEvent: z.enum(['In-Person', 'Virtual'] as const),
  performanceType: z.enum(['single', 'group'] as const).default('single'),
  eventCoordinator: z.string().min(1, 'Event coordinator is required'),
  
  // Location Information
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  
  // Additional Information
  comments: z.string().optional(),
  participants: z.array(
    z.object({
      name: z.string().min(1, 'Participant name is required'),
      age: z.number().min(1, 'Age is required').max(120, 'Enter a valid age'),
      phone: z.string().min(10, 'Valid phone number is required'),
      email: z.string().email('Valid email is required').or(z.literal('')),
      address: z.string().min(1, 'Address is required'),
      gender: z.string().min(1, 'Gender is required'),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      comments: z.string().optional(),
      mandatoryPrerequisite: z.string().optional(),
    })
  ).optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Default participant for the form
const defaultParticipant = {
  name: '',
  age: 0,
  phone: '',
  email: '',
  address: '',
  gender: '',
  latitude: '',
  longitude: '',
  comments: '',
  mandatoryPrerequisite: '',
};

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { data: session, status } = useSession();

  // Initialize form with react-hook-form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      participants: [defaultParticipant],
      performanceType: 'single' as const,
    },
  });

  const performanceType = watch('performanceType');
  const participants = watch('participants') || [];

  useEffect(() => {
    setIsClient(true);
    
    // Pre-fill date if coming from calendar
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    if (start) {
      setValue('eventDate', new Date(start));
      setValue('startTime', format(new Date(start), 'HH:mm'));
    }
    
    if (end) {
      setValue('endTime', format(new Date(end), 'HH:mm'));
    }
  }, [searchParams, setValue]);

  // Add a new participant
  const addParticipant = () => {
    setValue('participants', [...(participants || []), { ...defaultParticipant }]);
  };

  // Remove a participant
  const removeParticipant = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants.splice(index, 1);
    setValue('participants', updatedParticipants);
  };

  // Handle form submission
  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Check if user is authenticated
      if (status === 'unauthenticated' || !session?.user?.id) {
        toast.error('Authentication Required: Please log in to create an event');
        router.push('/event-scheduler/login');
        return;
      }
      
      // Basic validation
      if (!data.eventName || !data.venue || !data.organizationName || !data.organizationContact) {
        throw new Error('Please fill in all required fields');
      }
      
      // Format the data to match the database schema
      const eventData = {
        name: data.eventName,
        mode_of_event: data.modeOfEvent || 'In-Person',
        date: format(data.eventDate, 'yyyy-MM-dd'),
        start_time: data.startTime,
        end_time: data.endTime,
        venue: data.venue,
        latitude: data.latitude ? String(data.latitude).substring(0, 50) : null,
        longitude: data.longitude ? String(data.longitude).substring(0, 50) : null,
        organization_name: data.organizationName.substring(0, 200),
        organization_contact: data.organizationContact.substring(0, 15),
        organization_email: data.organizationEmail ? data.organizationEmail.substring(0, 100) : null,
        performance_type: data.performanceType || 'single',
        event_coordinator: data.eventCoordinator, // Make sure this matches the form field name
        created_by: Number(session.user.id), // Ensure this is a number
        participants: data.participants?.filter(p => p.name && p.phone).map(participant => ({
          name: participant.name.substring(0, 100),
          age: participant.age || null,
          phone_no: participant.phone.substring(0, 15),
          email: participant.email ? participant.email.substring(0, 100) : null,
          address: participant.address || '',
          gender: participant.gender ? participant.gender.substring(0, 10) : 'other',
          latitude: participant.latitude ? String(participant.latitude).substring(0, 50) : null,
          longitude: participant.longitude ? String(participant.longitude).substring(0, 50) : null,
          prerequisites_completed: !!participant.mandatoryPrerequisite
        })) || []
      };
      
      console.log('Submitting event data:', JSON.stringify(eventData, null, 2));
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json().catch(err => {
        console.error('Failed to parse JSON response:', err);
        throw new Error('Invalid response from server');
      });

      console.log('API Response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || `Failed to create event (${response.status}): ${response.statusText}`);
      }

      // Show success message
      toast.success('Event created successfully! Redirecting...', {
        duration: 2000,
        position: 'top-right'
      });
      
      // Handle the navigation after showing the toast
      setTimeout(() => {
        router.push('/event-scheduler/dashboard/calendar');
        router.refresh();
      }, 2000);

      // Redirect to calendar after a short delay
      setTimeout(() => {
        router.push('/event-scheduler/dashboard/calendar');
        router.refresh();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error in form submission:', error);
      
      // More specific error messages
      let errorMessage = error.message || 'Failed to create event. Please try again.';
      if (error.message.includes('Failed to create event in database')) {
        errorMessage = 'Database error. Please check the console for details.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage, {
        duration: 10000,
        position: 'top-right'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (status === 'loading' || !isClient) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Create New Event</h1>
        <p className="text-gray-600">Fill in the details below to create a new event</p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Event Information */}
        <div className="bg-linear-to-br from-blue-50 to-blue-50/80 p-6 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center mb-6 pb-3 border-b border-blue-200">
            <div className="h-8 w-1.5 bg-blue-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-semibold text-blue-800 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Event Information
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="eventName"
                  {...register('eventName')}
                  placeholder="Enter event name"
                  className={`pl-3 pr-4 py-2 border ${errors.eventName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
                />
              </div>
              {errors.eventName && (
                <p className="mt-1 text-sm text-red-600">{errors.eventName.message}</p>
              )}
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Event Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  {...register('eventDate', { valueAsDate: true })}
                  className={`pl-10 pr-4 py-2 ${errors.eventDate ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.eventDate && (
                <p className="mt-1 text-sm text-red-600">{errors.eventDate.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
                className={`${errors.startTime ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
                className={`${errors.endTime ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="bg-linear-to-br from-indigo-50 to-indigo-50/80 p-6 rounded-xl shadow-sm border border-indigo-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center mb-6 pb-3 border-b border-indigo-200">
            <div className="h-8 w-1.5 bg-indigo-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-semibold text-indigo-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Organization Information
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organizationName" className="text-indigo-800 font-medium">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organizationName"
                {...register('organizationName')}
                placeholder="Enter organization name"
                className={`${errors.organizationName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'} bg-white/80`}
              />
              {errors.organizationName && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationName.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationPOC" className="text-indigo-800 font-medium">
                Organization POC <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organizationPOC"
                {...register('organizationPOC')}
                placeholder="Enter POC name"
                className={`${errors.organizationPOC ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'} bg-white/80`}
              />
              {errors.organizationPOC && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationPOC.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationContact" className="text-indigo-800 font-medium">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organizationContact"
                {...register('organizationContact')}
                placeholder="Enter contact number"
                className={`${errors.organizationContact ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'} bg-white/80`}
              />
              {errors.organizationContact && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationContact.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="organizationEmail" className="text-indigo-800 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organizationEmail"
                type="email"
                {...register('organizationEmail')}
                placeholder="Enter organization email"
                className={`${errors.organizationEmail ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'} bg-white/80`}
              />
              {errors.organizationEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.organizationEmail.message}</p>
              )}
            </div>
            
            <div>
              <div>
              <Label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                Venue <span className="text-red-500">*</span>
              </Label>
              <Input
                id="venue"
                {...register('venue')}
                placeholder="Enter venue"
                className={`${errors.venue ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
              />
              {errors.venue && (
                <p className="mt-1 text-sm text-red-600">{errors.venue.message}</p>
              )}
            </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    {...register('latitude')}
                    placeholder="e.g., 12.9716"
                  />
                  {errors.latitude && (
                    <p className="text-sm text-red-500 mt-1">{errors.latitude.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    {...register('longitude')}
                    placeholder="e.g., 77.5946"
                  />
                  {errors.longitude && (
                    <p className="text-sm text-red-500 mt-1">{errors.longitude.message}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="eventCoordinator" className="block text-sm font-medium text-gray-700 mb-1">
                Event Coordinator <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eventCoordinator"
                {...register('eventCoordinator')}
                placeholder="Enter event coordinator name"
                className={`${errors.eventCoordinator ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
              />
              {errors.eventCoordinator && (
                <p className="mt-1 text-sm text-red-600">{errors.eventCoordinator.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="modeOfEvent" className="block text-sm font-medium text-gray-700 mb-1">
                Mode of Event <span className="text-red-500">*</span>
              </Label>
              <select
                id="modeOfEvent"
                {...register('modeOfEvent')}
                className={`w-full p-2 border ${errors.modeOfEvent ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm`}
              >
                <option value="In-Person">In-Person</option>
                <option value="Virtual">Virtual</option>
              </select>
              {errors.modeOfEvent && (
                <p className="mt-1 text-sm text-red-600">{errors.modeOfEvent.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="performanceType">Performance Type *</Label>
              <Select
                onValueChange={(value: 'single' | 'group') =>
                  setValue('performanceType', value)
                }
                defaultValue="single"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select performance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Participant</SelectItem>
                  <SelectItem value="group">Group Participants</SelectItem>
                </SelectContent>
              </Select>
              {errors.performanceType && (
                <p className="text-sm text-red-500 mt-1">{errors.performanceType.message}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                {...register('comments')}
                placeholder="Any additional comments"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Participant Information */}
        {performanceType && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="h-8 w-1.5 bg-amber-600 rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold text-amber-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  {performanceType === 'single' ? 'Participant Details' : 'Participants'}
                </h2>
              </div>
              {performanceType === 'group' && (
                <Button
                  type="button"
                  onClick={addParticipant}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Participant
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {(performanceType === 'single' ? [null] : participants).map((_, index) => (
                <div key={index} className="bg-linear-to-br from-amber-50 to-amber-50/80 p-6 rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow duration-200 relative">
                  {performanceType === 'group' && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="absolute top-3 right-3 p-1 rounded-full bg-white/80 hover:bg-red-50 text-amber-600 hover:text-red-600 transition-colors duration-200 shadow-sm border border-amber-200"
                      title="Remove participant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`participants.${index}.name`} className="text-amber-800 font-medium">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`participants.${index}.name`}
                        {...register(`participants.${index}.name` as const)}
                        placeholder="Participant name"
                        className={`${errors.participants?.[index]?.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                      />
                      {errors.participants?.[index]?.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`participants.${index}.age`} className="text-amber-800 font-medium">
                        Age <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`participants.${index}.age`}
                        type="number"
                        {...register(`participants.${index}.age` as const, {
                          valueAsNumber: true,
                        })}
                        placeholder="Age"
                        className={`${errors.participants?.[index]?.age ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                      />
                      {errors.participants?.[index]?.age && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.age?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`participants.${index}.phone`} className="text-amber-800 font-medium">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`participants.${index}.phone`}
                        {...register(`participants.${index}.phone` as const)}
                        placeholder="Phone number"
                        className={`${errors.participants?.[index]?.phone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                      />
                      {errors.participants?.[index]?.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.phone?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`participants.${index}.email`} className="text-amber-800 font-medium">
                        Email
                      </Label>
                      <Input
                        id={`participants.${index}.email`}
                        type="email"
                        {...register(`participants.${index}.email` as const)}
                        placeholder="Email (optional)"
                        className={`${errors.participants?.[index]?.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                      />
                      {errors.participants?.[index]?.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.email?.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor={`participants.${index}.address`} className="text-amber-800 font-medium">
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`participants.${index}.address`}
                        {...register(`participants.${index}.address` as const)}
                        placeholder="Full address"
                        rows={2}
                        className={`${errors.participants?.[index]?.address ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                      />
                      {errors.participants?.[index]?.address && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.address?.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`participants.${index}.gender`} className="text-amber-800 font-medium">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id={`participants.${index}.gender`}
                        {...register(`participants.${index}.gender` as const)}
                        className={`flex h-10 w-full rounded-md border ${errors.participants?.[index]?.gender ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500/50 transition-colors duration-200`}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                      {errors.participants?.[index]?.gender && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.participants[index]?.gender?.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor={`participants.${index}.mandatoryPrerequisite`} className="text-amber-800 font-medium">
                        Mandatory Prerequisite
                      </Label>
                      <Input
                        id={`participants.${index}.mandatoryPrerequisite`}
                        {...register(`participants.${index}.mandatoryPrerequisite` as const)}
                        placeholder="Any prerequisites for the participant"
                        className="border-amber-200 focus:ring-amber-500 focus:border-amber-500 bg-white/80"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                      <div>
                        <Label htmlFor={`participants.${index}.latitude`} className="text-amber-800 font-medium">
                          Latitude
                        </Label>
                        <Input
                          id={`participants.${index}.latitude`}
                          type="number"
                          step="0.000001"
                          {...register(`participants.${index}.latitude` as const)}
                          placeholder="e.g., 12.9716"
                          className={`${errors.participants?.[index]?.latitude ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                        />
                        {errors.participants?.[index]?.latitude && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.participants[index]?.latitude?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`participants.${index}.longitude`} className="text-amber-800 font-medium">
                          Longitude
                        </Label>
                        <Input
                          id={`participants.${index}.longitude`}
                          type="number"
                          step="0.000001"
                          {...register(`participants.${index}.longitude` as const)}
                          placeholder="e.g., 77.5946"
                          className={`${errors.participants?.[index]?.longitude ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'} bg-white/80`}
                        />
                        {errors.participants?.[index]?.longitude && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.participants[index]?.longitude?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor={`participants.${index}.comments`} className="text-amber-800 font-medium">
                        Additional Comments
                      </Label>
                      <Textarea
                        id={`participants.${index}.comments`}
                        {...register(`participants.${index}.comments` as const)}
                        placeholder="Any additional comments about this participant"
                        rows={2}
                        className="border-amber-200 focus:ring-amber-500 focus:border-amber-500 bg-white/80"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {performanceType === 'group' && (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={addParticipant}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Participant
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-3 text-base font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting 
                ? 'bg-linear-to-r from-blue-400 to-blue-500 hover:from-blue-400 hover:to-blue-500 cursor-not-allowed' 
                : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </div>
            ) : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}
