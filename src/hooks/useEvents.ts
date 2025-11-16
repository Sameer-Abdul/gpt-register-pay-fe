import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import eventService, { CreateEventData, UpdateEventData } from '@/services/eventService';

export function useEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch all events
  const { 
    data: events = [], 
    isLoading: isLoadingEvents, 
    error: eventsError 
  } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventService.getEvents(),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: CreateEventData) => 
      eventService.createEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      router.push('/payment/success');
    },
    onError: (error: Error) => {
      toast.error(`Error creating event: ${error.message}`);
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, ...updates }: UpdateEventData) => 
      eventService.updateEvent({ id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
      router.push('/payment/success');
    },
    onError: (error: Error) => {
      toast.error(`Error updating event: ${error.message}`);
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting event: ${error.message}`);
    },
  });

  return {
    events,
    isLoadingEvents,
    eventsError,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutateAsync,
    isUpdating: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutateAsync,
    isDeleting: deleteEventMutation.isPending,
  };
}

export default useEvents;
