'use client';

import { useState } from 'react';
import { useFormik, FormikErrors } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Event, Participant } from '@/types/event';

const eventSchema = Yup.object().shape({
  name: Yup.string().required('Event name is required'),
  start: Yup.date().required('Start date is required'),
  end: Yup.date()
    .min(Yup.ref('start'), 'End date must be after start date')
    .required('End date is required'),
  organizationPOC: Yup.string().required('Point of contact is required'),
  pocMobile: Yup.string().required('Mobile number is required'),
  pocEmail: Yup.string().email('Invalid email').required('Email is required'),
  alternateNumber: Yup.string(),
  venue: Yup.string().required('Venue is required'),
  organizationName: Yup.string().required('Organization name is required'),
  latitude: Yup.number().required('Latitude is required'),
  longitude: Yup.number().required('Longitude is required'),
  eventCoordinator: Yup.string().required('Event coordinator is required'),
  comments: Yup.string(),
  performanceType: Yup.string().oneOf(['single', 'group']).required('Performance type is required'),
  participants: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Name is required'),
      age: Yup.number().required('Age is required').positive('Age must be positive').integer('Age must be an integer'),
      phone: Yup.string().required('Phone number is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      address: Yup.string().required('Address is required'),
      gender: Yup.string().oneOf(['male', 'female', 'other']).required('Gender is required'),
      latitude: Yup.number().required('Latitude is required'),
      longitude: Yup.number().required('Longitude is required'),
      comments: Yup.string(),
      mandatoryPrerequisite: Yup.boolean().default(false),
    })
  ).min(1, 'At least one participant is required'),
});

export default function CreateEventForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const formik = useFormik({
    initialValues: {
      name: '',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      organizationPOC: '',
      pocMobile: '',
      pocEmail: '',
      alternateNumber: '',
      venue: '',
      organizationName: '',
      latitude: 0,
      longitude: 0,
      eventCoordinator: '',
      comments: '',
      performanceType: 'single' as const,
      participants: [
        {
          name: '',
          age: 0,
          phone: '',
          email: '',
          address: '',
          gender: 'male' as const,
          latitude: 0,
          longitude: 0,
          comments: '',
          mandatoryPrerequisite: false,
        },
      ],
    },
    validationSchema: eventSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          throw new Error('Failed to create event');
        }

        const data = await response.json();
        
        toast({
          title: 'Success',
          description: 'Event created successfully!',
          variant: 'default',
        });

        // Redirect to events list or calendar view
        window.location.href = '/payment/success?tab=calendar';
      } catch (error) {
        console.error('Error creating event:', error);
        toast({
          title: 'Error',
          description: 'Failed to create event. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const addParticipant = () => {
    formik.setFieldValue('participants', [
      ...formik.values.participants,
      {
        name: '',
        age: 0,
        phone: '',
        email: '',
        address: '',
        gender: 'male' as const,
        latitude: 0,
        longitude: 0,
        comments: '',
        mandatoryPrerequisite: false,
      },
    ]);
  };

  const removeParticipant = (index: number) => {
    const participants = [...formik.values.participants];
    participants.splice(index, 1);
    formik.setFieldValue('participants', participants);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Create New Event</h2>
        <p className="text-muted-foreground">Fill in the details below to create a new event.</p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Event Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Event Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter event name"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-sm text-red-500">{formik.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      formik.setFieldValue('start', newDate);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formik.touched.start && formik.errors.start && (
                <p className="text-sm text-red-500">{formik.errors.start as string}</p>
              )}
            </div>

            {/* Add more form fields here */}
            {/* ... */}
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Participants</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addParticipant}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Participant
            </Button>
          </div>

          {formik.values.participants.map((participant, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4 relative">
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={() => removeParticipant(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
              <h4 className="font-medium">Participant {index + 1}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`participants.${index}.name`}>Full Name *</Label>
                  <Input
                    id={`participants.${index}.name`}
                    name={`participants.${index}.name`}
                    value={participant.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="John Doe"
                  />
                  {formik.touched.participants?.[index]?.name &&
                    typeof formik.errors.participants?.[index] === 'object' &&
                    formik.errors.participants?.[index] !== null &&
                    'name' in formik.errors.participants[index]! && (
                      <p className="text-sm text-red-500">
                        {
                          (formik.errors.participants[index] as FormikErrors<{
                            name: string;
                          }>).name
                        }
                      </p>
                    )}
                </div>
                {/* Add more participant fields here */}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}
