'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik, FormikErrors, FormikTouched } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { sendTelegramMessage } from '@/lib/telegram';

interface Participant {
  id: string;
  name: string;
  age: string;
  phone: string;
  email: string;
  address: string;
  gender: string;
  latitude: string;
  longitude: string;
  comments: string;
  mandatoryPrerequisite: boolean;
}

// Define participant validation schema
const participantSchema = Yup.object().shape({
  id: Yup.string(),
  name: Yup.string().required('Name is required'),
  age: Yup.number()
    .required('Age is required')
    .min(1, 'Age must be at least 1')
    .max(120, 'Age must be less than 120'),
  phone: Yup.string()
    .required('Phone is required')
    .matches(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  address: Yup.string().required('Address is required'),
  gender: Yup.string().required('Gender is required'),
  latitude: Yup.number().required('Latitude is required'),
  longitude: Yup.number().required('Longitude is required'),
  comments: Yup.string(),
  mandatoryPrerequisite: Yup.boolean().required(
    'Please confirm if mandatory prerequisites are met'
  ),
});

type ParticipantError = {
  name?: string;
  age?: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  latitude?: string;
  longitude?: string;
  comments?: string;
  mandatoryPrerequisite?: string;
};

type FormValues = {
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  organizationPOC: string;
  pocMobile: string;
  pocEmail: string;
  alternateNumber: string;
  venue: string;
  organizationName: string;
  latitude: string;
  longitude: string;
  eventCoordinator: string;
  comments: string;
  performanceType: 'Single Participant' | 'Group Participants';
  participants: Participant[];
};

type FormErrors = {
  [K in keyof FormValues]?: K extends 'participants' 
    ? (string | ParticipantError)[] | string 
    : string;
};


// Main validation schema
const validationSchema = Yup.object({
  eventName: Yup.string().required('Event name is required'),
  date: Yup.date().required('Date is required'),
  startTime: Yup.string().required('Start time is required'),
  endTime: Yup.string()
    .required('End time is required')
    .test(
      'is-after-start',
      'End time must be after start time',
      function (endTime) {
        const { startTime } = this.parent;
        if (!startTime || !endTime) return true;
        return new Date(`1970-01-01T${endTime}`) > new Date(`1970-01-01T${startTime}`);
      }
    ),
  organizationPOC: Yup.string().required('Organization POC is required'),
  pocMobile: Yup.string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  pocEmail: Yup.string().email('Invalid email').required('Email is required'),
  alternateNumber: Yup.string()
    .matches(/^[0-9]{10}$/, 'Alternate number must be 10 digits')
    .nullable(),
  venue: Yup.string().required('Venue is required'),
  organizationName: Yup.string().required('Organization name is required'),
  latitude: Yup.number().required('Latitude is required'),
  longitude: Yup.number().required('Longitude is required'),
  eventCoordinator: Yup.string().required('Event coordinator is required'),
  comments: Yup.string(),
  performanceType: Yup.string()
    .oneOf(['Single Participant', 'Group Participants'] as const)
    .required('Performance type is required'),
  participants: Yup.array()
    .of(participantSchema)
    .when('performanceType', {
      is: 'Single Participant',
      then: (schema) => schema.min(1, 'At least one participant is required').max(1),
      otherwise: (schema) => schema.min(1, 'At least one participant is required'),
    })
});

export default function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!eventId);

  // Initial form values
  const initialValues: FormValues = {
    eventName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    organizationPOC: '',
    pocMobile: '',
    pocEmail: '',
    alternateNumber: '',
    venue: '',
    organizationName: '',
    latitude: '',
    longitude: '',
    eventCoordinator: '',
    comments: '',
    performanceType: 'Single Participant',
    participants: [
      {
        id: '1',
        name: '',
        age: '',
        phone: '',
        email: '',
        address: '',
        gender: '',
        latitude: '',
        longitude: '',
        comments: '',
        mandatoryPrerequisite: false,
      },
    ],
  };

  // Fetch event data if in edit mode
  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          // Replace with actual API call
          // const response = await axios.get(`/api/events/${eventId}`);
          // formik.setValues(response.data);
          
          // Mock data for now
          setTimeout(() => {
            formik.setValues({
              ...initialValues,
              eventName: 'Sample Event',
              organizationPOC: 'John Doe',
              pocMobile: '9876543210',
              pocEmail: 'john@example.com',
              venue: 'Conference Hall',
              organizationName: 'Sample Org',
              eventCoordinator: 'Jane Smith',
              participants: [
                {
                  id: '1',
                  name: 'Participant One',
                  age: '25',
                  phone: '9876543210',
                  email: 'participant@example.com',
                  address: '123 Main St',
                  gender: 'Male',
                  latitude: '12.9716',
                  longitude: '77.5946',
                  comments: 'Sample participant',
                  mandatoryPrerequisite: true,
                },
              ],
            });
            setIsLoading(false);
          }, 1000);
        } catch (error) {
          console.error('Error fetching event:', error);
          toast.error('Failed to load event data');
          setIsLoading(false);
        }
      };

      fetchEvent();
    }
  }, [eventId]);

  const formik = useFormik({
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        
        // Prepare data for API
        const eventData = {
          ...values,
          participants: values.participants.map(p => ({
            ...p,
            age: parseInt(p.age),
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
          })),
        };

        // Replace with actual API call
        // const url = eventId ? `/api/events/${eventId}` : '/api/events';
        // const method = eventId ? 'PUT' : 'POST';
        // const response = await axios({ method, url, data: eventData });
        // const savedEvent = response.data;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockEventId = Math.floor(Math.random() * 1000); // Replace with savedEvent.id
        
        // Send notifications
        try {
          const sendNotification = async (phone: string, message: string, isPoc: boolean) => {
            try {
              console.log(`[Notification] Sending to ${isPoc ? 'POC' : 'participant'} ${phone}`);
              const result = await sendTelegramMessage(
                phone,
                message,
                { 
                  eventId: mockEventId,
                  recipientType: isPoc ? 'organization' : 'participant'
                }
              );
              
              if (!result.success) {
                console.error(`[Notification] Failed to send to ${phone}:`, result.error);
                // Show error toast for failed notification
                toast.error(`Failed to send notification to ${isPoc ? 'POC' : 'participant'}: ${phone}`);
              } else {
                console.log(`[Notification] Successfully sent to ${phone}`);
              }
              return result.success;
            } catch (error) {
              console.error(`[Notification] Error sending to ${phone}:`, error);
              toast.error(`Error sending notification to ${isPoc ? 'POC' : 'participant'}`);
              return false;
            }
          };

          // Send to POC
          const pocMessage = `🎉 *Event ${eventId ? 'Updated' : 'Created'} Successfully!*\n\n` +
            `*Event:* ${values.eventName}\n` +
            `*Date:* ${values.date}\n` +
            `*Time:* ${values.startTime} - ${values.endTime}\n` +
            `*Venue:* ${values.venue}\n` +
            `*POC:* ${values.organizationPOC || values.organizationName || 'N/A'}\n` +
            `*Contact:* ${values.pocMobile}\n\n` +
            `Thank you for ${eventId ? 'updating' : 'creating'} the event with us!`;
          
          await sendNotification(values.pocMobile, pocMessage, true);

          // Send to each participant
          const participantPromises = values.participants.map(participant => {
            const participantMessage = `🎉 *You're Registered for ${values.eventName}*\n\n` +
              `*Date:* ${values.date}\n` +
              `*Time:* ${values.startTime} - ${values.endTime}\n` +
              `*Venue:* ${values.venue}\n` +
              `*POC Contact:* ${values.organizationPOC || values.organizationName || 'N/A'} (${values.pocMobile})\n\n` +
              `We look forward to seeing you there!`;
            
            return sendNotification(participant.phone, participantMessage, false);
          });

          // Wait for all notifications to complete
          await Promise.all(participantPromises);
        } catch (notificationError) {
          console.error('Error in notification process:', notificationError);
          // Don't fail the whole submission if notifications fail
          toast.error('Event saved, but there was an issue sending some notifications');
        }
        
        toast.success(`Event ${eventId ? 'updated' : 'created'} successfully`);
        router.push('/payment/success/events');
      } catch (error) {
        console.error('Error saving event:', error);
        toast.error(`Failed to ${eventId ? 'update' : 'create'} event`);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Add a new participant
  const addParticipant = () => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: '',
      age: '',
      phone: '',
      email: '',
      address: '',
      gender: '',
      latitude: '',
      longitude: '',
      comments: '',
      mandatoryPrerequisite: false,
    };
    
    formik.setFieldValue('participants', [
      ...formik.values.participants,
      newParticipant,
    ]);
  };

  // Remove a participant
  const removeParticipant = (index: number) => {
    const participants = [...formik.values.participants];
    participants.splice(index, 1);
    formik.setFieldValue('participants', participants);
  };

  // Update a participant field
  const handleParticipantChange = (index: number, field: keyof Participant, value: any) => {
    formik.setFieldValue(`participants.${index}.${field}`, value);
  };

  const getParticipantError = (index: number, field: keyof Participant): string | undefined => {
    const error = formik.errors.participants?.[index];
    if (!error) return undefined;
    
    if (typeof error === 'string') {
      return field === 'name' ? error : undefined; // Only return for name field if it's a string error
    }
    
    // Type assertion to access the field safely
    const participantError = error as Record<string, any>;
    return participantError[field];
  };
  
  const isParticipantFieldTouched = (index: number, field: keyof Participant): boolean => {
    const touched = formik.touched.participants?.[index];
    if (!touched) return false;
    
    // Type assertion to access the field safely
    const touchedFields = touched as Record<string, any>;
    return Boolean(touchedFields[field as string]);
  };
  
  // Helper function to safely access participant field errors
  const getFieldError = (field: string, index?: number): string | undefined => {
    if (index !== undefined) {
      return getParticipantError(index, field as keyof Participant);
    }
    return formik.errors[field as keyof typeof formik.errors] as string | undefined;
  };
  
  // Helper function to check if a field is touched
  const isFieldTouched = (field: string, index?: number): boolean => {
    if (index !== undefined) {
      return isParticipantFieldTouched(index, field as keyof Participant);
    }
    return Boolean(formik.touched[field as keyof typeof formik.touched]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {eventId ? 'Edit Event' : 'Create New Event'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below to {eventId ? 'update' : 'create'} an event.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Event Details */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Event Information
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="eventName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={formik.values.eventName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.eventName && formik.errors.eventName
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.eventName && formik.errors.eventName && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.eventName}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="performanceType"
                  className="block text-sm font-medium text-gray-700"
                >
                  Performance Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="performanceType"
                  name="performanceType"
                  value={formik.values.performanceType}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Single Participant">Single Participant</option>
                  <option value="Group Participants">Group Participants</option>
                </select>
                {formik.touched.performanceType && formik.errors.performanceType && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.performanceType}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formik.values.date}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.date && formik.errors.date
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.date && formik.errors.date && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.date}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formik.values.startTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.startTime && formik.errors.startTime
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.startTime && formik.errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.startTime}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formik.values.endTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.endTime && formik.errors.endTime
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.endTime && formik.errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.endTime}
                  </p>
                )}
              </div>

              <div className="col-span-6">
                <label
                  htmlFor="venue"
                  className="block text-sm font-medium text-gray-700"
                >
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  value={formik.values.venue}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.venue && formik.errors.venue
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.venue && formik.errors.venue && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.venue}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formik.values.organizationName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.organizationName && formik.errors.organizationName
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.organizationName && formik.errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.organizationName}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="eventCoordinator"
                  className="block text-sm font-medium text-gray-700"
                >
                  Event Coordinator <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventCoordinator"
                  name="eventCoordinator"
                  value={formik.values.eventCoordinator}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.eventCoordinator && formik.errors.eventCoordinator
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.eventCoordinator && formik.errors.eventCoordinator && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.eventCoordinator}
                  </p>
                )}
              </div>

              <div className="col-span-6">
                <label
                  htmlFor="comments"
                  className="block text-sm font-medium text-gray-700"
                >
                  Comments
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  rows={3}
                  value={formik.values.comments}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Organization POC */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Organization Point of Contact
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="organizationPOC"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="organizationPOC"
                  name="organizationPOC"
                  value={formik.values.organizationPOC}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.organizationPOC && formik.errors.organizationPOC
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.organizationPOC && formik.errors.organizationPOC && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.organizationPOC}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="pocEmail"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="pocEmail"
                  name="pocEmail"
                  value={formik.values.pocEmail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.pocEmail && formik.errors.pocEmail
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.pocEmail && formik.errors.pocEmail && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.pocEmail}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="pocMobile"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="pocMobile"
                  name="pocMobile"
                  value={formik.values.pocMobile}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.pocMobile && formik.errors.pocMobile
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.pocMobile && formik.errors.pocMobile && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.pocMobile}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="alternateNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Alternate Number
                </label>
                <input
                  type="tel"
                  id="alternateNumber"
                  name="alternateNumber"
                  value={formik.values.alternateNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.alternateNumber && formik.errors.alternateNumber
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.alternateNumber && formik.errors.alternateNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.alternateNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Location
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="latitude"
                  className="block text-sm font-medium text-gray-700"
                >
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  value={formik.values.latitude}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.latitude && formik.errors.latitude
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.latitude && formik.errors.latitude && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.latitude}
                  </p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="longitude"
                  className="block text-sm font-medium text-gray-700"
                >
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  value={formik.values.longitude}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    formik.touched.longitude && formik.errors.longitude
                      ? 'border-red-500'
                      : 'border'
                  }`}
                />
                {formik.touched.longitude && formik.errors.longitude && (
                  <p className="mt-1 text-sm text-red-600">
                    {formik.errors.longitude}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Participants
            </h3>
            <button
              type="button"
              onClick={addParticipant}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Participant
            </button>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {formik.touched.participants && formik.errors.participants && (
              <p className="mb-4 text-sm text-red-600">
                {typeof formik.errors.participants === 'string' 
                  ? formik.errors.participants 
                  : 'Please fill in all required fields for participants'}
              </p>
            )}
            
            <div className="space-y-6">
              {formik.values.participants.map((participant, index) => (
                <div key={participant.id} className="relative border border-gray-200 rounded-lg p-4">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="Remove participant"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        className="block text-sm font-medium text-gray-700"
                      >
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) =>
                          handleParticipantChange(index, 'name', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'name') && 
                          getParticipantError(index, 'name')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'name') && getParticipantError(index, 'name') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'name')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={participant.age}
                        onChange={(e) =>
                          handleParticipantChange(index, 'age', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'age') && 
                          getParticipantError(index, 'age')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'age') && getParticipantError(index, 'age') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'age')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={participant.gender}
                        onChange={(e) =>
                          handleParticipantChange(index, 'gender', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'gender') && 
                          getParticipantError(index, 'gender')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      {isParticipantFieldTouched(index, 'gender') && getParticipantError(index, 'gender') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'gender')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={participant.email}
                        onChange={(e) =>
                          handleParticipantChange(index, 'email', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'email') && 
                          getParticipantError(index, 'email')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'email') && getParticipantError(index, 'email') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'email')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={participant.phone}
                        onChange={(e) =>
                          handleParticipantChange(index, 'phone', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'phone') && 
                          getParticipantError(index, 'phone')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'phone') && getParticipantError(index, 'phone') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'phone')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6">
                      <label className="block text-sm font-medium text-gray-700">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={participant.address}
                        onChange={(e) =>
                          handleParticipantChange(index, 'address', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'address') && 
                          getParticipantError(index, 'address')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'address') && getParticipantError(index, 'address') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'address')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={participant.latitude}
                        onChange={(e) =>
                          handleParticipantChange(index, 'latitude', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'latitude') && 
                          getParticipantError(index, 'latitude')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'latitude') && getParticipantError(index, 'latitude') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'latitude')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={participant.longitude}
                        onChange={(e) =>
                          handleParticipantChange(index, 'longitude', e.target.value)
                        }
                        onBlur={formik.handleBlur}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          isParticipantFieldTouched(index, 'longitude') && 
                          getParticipantError(index, 'longitude')
                            ? 'border-red-500'
                            : 'border'
                        }`}
                      />
                      {isParticipantFieldTouched(index, 'longitude') && getParticipantError(index, 'longitude') && (
                        <p className="mt-1 text-sm text-red-600">
                          {getParticipantError(index, 'longitude')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Comments
                      </label>
                      <input
                        type="text"
                        value={participant.comments}
                        onChange={(e) =>
                          handleParticipantChange(index, 'comments', e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            id={`mandatory-${index}`}
                            checked={participant.mandatoryPrerequisite || false}
                            onChange={(e) =>
                              handleParticipantChange(
                                index,
                                'mandatoryPrerequisite',
                                e.target.checked
                              )
                            }
                            onBlur={formik.handleBlur}
                            className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                              isParticipantFieldTouched(index, 'mandatoryPrerequisite') && 
                              getParticipantError(index, 'mandatoryPrerequisite')
                                ? 'border-red-500'
                                : 'border'
                            }`}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label
                            htmlFor={`mandatory-${index}`}
                            className="font-medium text-gray-700"
                          >
                            Mandatory Prerequisite
                          </label>
                          {isParticipantFieldTouched(index, 'mandatoryPrerequisite') && getParticipantError(index, 'mandatoryPrerequisite') && (
                            <p className="mt-1 text-sm text-red-600">
                              {getParticipantError(index, 'mandatoryPrerequisite')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/payment/success/events')}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
