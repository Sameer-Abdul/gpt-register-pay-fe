'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock as ClockIcon, MapPin, User, Building, Phone, Mail, Users } from 'lucide-react';
import { format, parseISO, addDays, addHours } from 'date-fns';
import { toast } from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventApi, EventClickArg, EventContentArg, DateSelectArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Extend HTMLElement type to include custom properties
declare global {
  interface HTMLElement {
    _eventId?: string;
    _hoverHandler?: (e: MouseEvent) => void;
  }
}

interface Participant {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string | null;
  end: Date | string | null;
  allDay: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    organization_contact?: string | null;
    organization_email?: string | null;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: any[];
    start_time?: string | null;
    end_time?: string | null;
    date?: string;
    debug?: {
      startTime: string;
      endTime: string;
    };
  };
  className?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  timeText?: string;
  display?: string;
  editable?: boolean;
  startEditable?: boolean;
  durationEditable?: boolean;
}

interface TooltipEvent {
  id: string;
  title: string;
  start: Date | string | null;
  end: Date | string | null;
  allDay: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    organization_contact?: string | null;
    organization_email?: string | null;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: Participant[];
    start_time?: string | null;
    end_time?: string | null;
    date?: string;
    debug?: {
      startTime: string;
      endTime: string;
    };
  };
}

// Helper function to generate color based on participant name
const getParticipantColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
    'bg-indigo-500', 'bg-red-500', 'bg-yellow-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Helper function to get event type badge color
const getEventTypeBadgeColor = (type: string): string => {
  const colors: Record<string, string> = {
    single: 'bg-purple-100 text-purple-800',
    group: 'bg-blue-100 text-blue-800',
    workshop: 'bg-emerald-100 text-emerald-800',
    meeting: 'bg-amber-100 text-amber-800',
    conference: 'bg-rose-100 text-rose-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colors[type] || colors.default;
};

// Function to get event color based on type
interface EventColors {
  background: string;
  border: string;
  text: string;
}

const getEventColor = (type: string = 'default'): EventColors => {
  const colors: Record<string, EventColors> = {
    single: {
      background: 'bg-purple-50 hover:bg-purple-100',
      border: 'border-l-4 border-purple-500',
      text: 'text-purple-800 hover:text-purple-900'
    },
    group: {
      background: 'bg-blue-50 hover:bg-blue-100',
      border: 'border-l-4 border-blue-500',
      text: 'text-blue-800 hover:text-blue-900'
    },
    workshop: {
      background: 'bg-emerald-50 hover:bg-emerald-100',
      border: 'border-l-4 border-emerald-500',
      text: 'text-emerald-800 hover:text-emerald-900'
    },
    meeting: {
      background: 'bg-amber-50 hover:bg-amber-100',
      border: 'border-l-4 border-amber-500',
      text: 'text-amber-800 hover:text-amber-900'
    },
    conference: {
      background: 'bg-rose-50 hover:bg-rose-100',
      border: 'border-l-4 border-rose-500',
      text: 'text-rose-800 hover:text-rose-900'
    },
    default: {
      background: 'bg-gray-50 hover:bg-gray-100',
      border: 'border-l-4 border-gray-400',
      text: 'text-gray-800 hover:text-gray-900'
    }
  };

  const normalizedType = type?.toLowerCase() || 'default';
  return colors[normalizedType] || colors.default;
};

export default function CalendarPage() {
  // State management
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [tooltip, setTooltip] = useState<{x: number; y: number; event: TooltipEvent | null}>({x: 0, y: 0, event: null});
  const [events, setEvents] = useState<any[]>([]); // Using any[] to handle FullCalendar's event format
  
  // Non-null assertion for tooltip event when we know it exists
  const getTooltipEvent = useCallback(() => tooltip.event!, [tooltip.event]);

  // Refs
  // tooltipRef is already declared at the top of the component
  
  // Format time to 12-hour format with AM/PM
  const formatTime = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Parse date and time from strings
  const parseDateTime = (dateStr: string, timeStr?: string): Date => {
    try {
      if (!dateStr) return new Date();
      
      // If time is provided, parse date and time together
      if (timeStr) {
        // Handle different time string formats
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          const date = new Date(dateStr);
          date.setHours(hours, minutes, 0, 0);
          return date;
        }
      }
      
      // Default to start of day if no time provided
      return new Date(dateStr);
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  };

  // Update current date when calendar changes view
  const handleDatesSet = useCallback((arg: any) => {
    // Current date is now managed by the calendar's internal state
    // No need to update it manually
  }, []);

  // Add custom styles for calendar events
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
      .fc-event {
        transition: all 0.2s ease-in-out !important;
        cursor: pointer;
        border: 1px solid;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 0.875rem;
        margin: 1px 2px;
      }
      .fc-event:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .fc-event.group-event:hover {
        background-color: rgba(59, 130, 246, 0.4) !important;
      }
      .fc-event.workshop-event:hover {
        background-color: rgba(16, 185, 129, 0.4) !important;
      }
      .fc-event.meeting-event:hover {
        background-color: rgba(245, 158, 11, 0.4) !important;
      }
      .fc-event.conference-event:hover {
        background-color: rgba(244, 63, 94, 0.4) !important;
      }
      .fc-event.default-event:hover {
        background-color: rgba(156, 163, 175, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Helper function to add hours to a date
  const addHours = (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  };

  // Fetch events from API
  const fetchEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    try {
      const response = await fetch('/api/events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const data = Array.isArray(result.data) ? result.data : [];
      
      return data.map((event: any) => {
        try {
          const startDate = parseDateTime(event.date, event.start_time);
          const endDate = event.end_time ? parseDateTime(event.date, event.end_time) : addHours(startDate, 1);
          const eventType = event.performance_type || 'default';
          const colors = getEventColor(eventType);
          
          return {
            id: event.id,
            title: event.name || 'Untitled Event',
            start: startDate,
            end: endDate,
            allDay: false,
            extendedProps: {
              venue: event.venue || 'Not specified',
              organization: event.organization || 'Not specified',
              organization_contact: event.organization_contact || event.contact_number || '',
              organization_email: event.organization_email || event.contact_email || '',
              coordinator: event.coordinator || 'Not specified',
              performance_type: event.performance_type || 'event',
              mode_of_event: event.mode_of_event || 'in-person',
              start_time: event.start_time || formatTime(startDate),
              end_time: event.end_time || formatTime(endDate),
              date: event.date,
              participants: Array.isArray(event.participants) ? event.participants : []
            },
            className: `${eventType}-event`,
            backgroundColor: colors.background,
            borderColor: colors.border,
            textColor: colors.text,
            timeText: `${formatTime(startDate)} - ${formatTime(endDate)}`,
            display: 'block',
            editable: true,
            startEditable: true,
            durationEditable: true
          } as CalendarEvent;
        } catch (error) {
          console.error('Error processing event:', event.id, error);
          return null;
        }
      }).filter((event: CalendarEvent | null): event is CalendarEvent => event !== null);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch events');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize component
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = await fetchEvents();
        setEvents(events);
      } catch (error) {
        console.error('Failed to load events:', error);
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []); // Removed fetchEvents from dependencies to avoid infinite loop

  // Handle event click
  const handleEventClick = useCallback((clickInfo: { event: { id: string } }) => {
    router.push(`/event-scheduler/dashboard/events/${clickInfo.event.id}`);
  }, [router]);

  // Handle event mouse enter
  // Handle event mouse enter
  const handleEventMouseEnter = useCallback((mouseEnterInfo: { 
    event: EventApi; 
    el: HTMLElement;
  }) => {
    const { event, el } = mouseEnterInfo;
    const rect = el.getBoundingClientRect();
    
    setTooltip({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      event: {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay || false,
        extendedProps: {
          ...event.extendedProps,
          venue: event.extendedProps.venue || 'Not specified',
          organization: event.extendedProps.organization || 'Not specified',
          organization_contact: event.extendedProps.organization_contact || null,
          organization_email: event.extendedProps.organization_email || null,
          coordinator: event.extendedProps.coordinator || 'Not specified',
          performance_type: event.extendedProps.performance_type || 'event',
          mode_of_event: event.extendedProps.mode_of_event || 'in-person',
          participants: event.extendedProps.participants || [],
          start_time: event.extendedProps.start_time || null,
          end_time: event.extendedProps.end_time || null,
          date: event.extendedProps.date || (event.start ? format(event.start, 'yyyy-MM-dd') : '')
        }
      }
    });
  }, [setTooltip]);

  // Handle event mouse leave
  const handleEventMouseLeave = useCallback(() => {
    if (!isHovering) {
      setTooltip({ x: 0, y: 0, event: null });
    }
  }, [isHovering, setTooltip]);

  // Handle tooltip mouse enter
  const handleTooltipMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  // Handle tooltip mouse leave
  const handleTooltipMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTooltip({ x: 0, y: 0, event: null });
  }, [setIsHovering, setTooltip]);

  const handleDateSelect = useCallback((selectInfo: any) => {
    // Navigate to create event with pre-filled date
    const start = selectInfo.startStr;
    const end = selectInfo.endStr;
    router.push(`/event-scheduler/dashboard/create-event?start=${start}&end=${end}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;
    const startDate = event.start ? new Date(event.start) : null;
    const endDate = event.end ? new Date(event.end) : null;
    
    if (!startDate) return { html: '' };

    const startTime = formatTime(startDate);
    const endTime = endDate ? formatTime(endDate) : '';

    if (event.allDay) {
      return {
        html: `
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
              <line x1="16" x2="16" y1="2" y2="6"></line>
              <line x1="8" x2="8" y1="2" y2="6"></line>
              <line x1="3" x2="21" y1="10" y2="10"></line>
            </svg>
            <span class="text-sm text-muted-foreground">
              ${format(startDate, 'MMMM yyyy')}
            </span>
          </div>
        `
      };
    }

    // Safely access extendedProps with type assertion
  const extendedProps = event.extendedProps as {
    performance_type?: string;
    participants?: any[];
    location?: string;
    venue?: string;
    organization?: string;
    organization_contact?: string;
    organization_email?: string;
    coordinator?: string;
    [key: string]: any;
  };

  const eventType = extendedProps?.performance_type || 'default';
  const colors = getEventColor(eventType);
  
  const participants = extendedProps?.participants || [];
  const location = extendedProps?.location || extendedProps?.venue || 'Location not specified';
  
  return {
    html: `
      <div class="h-full group/event">
        <div class="relative h-full">
          <!-- Compact event view (always visible) -->
          <div class="h-full flex flex-col justify-center">
            <div class="font-medium truncate text-sm">${event.title || 'New Event'}</div>
            ${startTime ? `
              <div class="text-xs flex items-center gap-1 mt-0.5 text-gray-600">
                <svg class="h-3 w-3 shrink-0 ${colors.text.replace('hover:', '')}" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
                <span>${startTime}${endTime ? ` - ${endTime}` : ''}</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Detailed hover card -->
          <div class="absolute left-0 top-0 w-80 bg-white rounded-lg shadow-xl border ${colors.border.replace('border-l-4', '')} opacity-0 invisible group-hover/event:opacity-100 group-hover/event:visible transition-all duration-200 -translate-y-2 group-hover/event:translate-y-0 z-50 overflow-hidden">
            <!-- Header with gradient -->
            <div class="${colors.background.replace('hover:bg-', 'bg-').replace('50', '100')} px-4 py-3 border-b ${colors.border.replace('border-l-4', '')} flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">${event.title || 'Event Details'}</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.text.replace('hover:', '')} ${colors.background.replace('hover:', '')} border ${colors.border.replace('border-l-4', '')}">
                ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}
              </span>
            </div>
            
            <div class="p-4">
              <div class="space-y-4">
                <!-- Date & Time -->
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 p-1.5 rounded-lg ${colors.background.replace('hover:', '')}">
                    <svg class="h-5 w-5 ${colors.text.replace('hover:', '')}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-xs font-medium text-gray-500">Date & Time</div>
                    <div class="text-sm text-gray-900 mt-0.5">
                      ${event.start ? format(new Date(event.start), 'EEEE, MMM d, yyyy') : ''}
                    </div>
                    <div class="text-sm text-gray-700">${startTime}${endTime ? ` - ${endTime}` : ''}</div>
                  </div>
                </div>
                
                <!-- Location -->
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 p-1.5 rounded-lg bg-blue-50">
                    <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-xs font-medium text-gray-500">Location</div>
                    <div class="text-sm text-gray-900 mt-0.5">${event.extendedProps?.venue || 'Not specified'}</div>
                    ${event.extendedProps?.address ? `
                      <div class="text-xs text-gray-500 mt-0.5">${event.extendedProps.address}</div>
                    ` : ''}
                  </div>
                </div>
                
                <!-- Organization -->
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 p-1.5 rounded-lg bg-purple-50">
                    <svg class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-gray-500">Organization</div>
                    <div class="text-sm text-gray-900 mt-0.5">${extendedProps?.organization || 'Not specified'}</div>
                    ${extendedProps?.coordinator ? `
                      <div class="text-xs text-gray-600 mt-1">
                        <span class="font-medium">Coordinator:</span> ${extendedProps.coordinator}
                      </div>
                    ` : ''}
                    ${extendedProps?.organization_contact ? `
                      <div class="text-xs text-gray-500 mt-1 flex items-center">
                        <svg class="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        ${extendedProps.organization_contact}
                      </div>
                    ` : ''}
                    ${extendedProps?.organization_email ? `
                      <div class="text-xs text-gray-500 mt-1 flex items-center">
                        <svg class="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href="mailto:${extendedProps.organization_email}" class="text-blue-600 hover:underline">${extendedProps.organization_email}</a>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            
            ${participants.length > 0 ? `
              <div class="pt-4 mt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                    <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Participants (${participants.length})
                  </h4>
                  ${participants.length > 3 ? `
                    <span class="text-xs text-gray-500">
                      ${participants.filter((p: any) => p.status === 'confirmed').length} confirmed
                    </span>
                  ` : ''}
                </div>
                <div class="space-y-3">
                <div class="space-y-2 max-h-56 overflow-y-auto -mr-2 pr-2">
                  ${participants.map((p: any, index: number) => `
                    <div class="group/participant relative flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors ${index < participants.length - 1 ? 'border-b border-gray-100 pb-3' : ''}">
                      <div class="h-9 w-9 rounded-full ${getParticipantColor(p.name)} flex items-center justify-center text-white font-medium shrink-0 text-sm">
                        ${p.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                      <div class="ml-2 flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <div class="font-medium text-gray-900 text-sm">${p.name}</div>
                          ${p.role ? `
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              ${p.role}
                            </span>
                          ` : ''}
                        </div>
                          
                        <div class="mt-1 space-y-1.5 text-xs text-gray-500">
                            <div class="flex items-center">
                              <svg class="h-3.5 w-3.5 text-gray-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span class="truncate text-gray-600">${p.email || 'No email'}</span>
                            </div>
                            
                            <div class="flex items-center">
                              <svg class="h-3.5 w-3.5 text-gray-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span class="text-gray-600">${p.phone || 'No phone'}</span>
                            </div>
                            
                            <div class="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                              <div class="flex items-center text-xs">
                                <span class="h-2 w-2 rounded-full ${p.status === 'confirmed' ? 'bg-green-500' : p.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'} mr-1.5"></span>
                                <span class="capitalize text-gray-500">${p.status || 'No status'}</span>
                              </div>
                              ${p.age ? `
                                <div class="flex items-center text-xs text-gray-500">
                                  <span>${p.age} years</span>
                                </div>
                              ` : ''}
                            </div>
                            
                            ${p.notes ? `
                              <div class="mt-2 text-xs bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                                <div class="font-medium text-blue-800 mb-1">Notes</div>
                                <div class="text-blue-600 line-clamp-2">${p.notes}</div>
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <!-- Additional details on hover -->
                      <div class="hidden group-hover/participant:block absolute left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div class="text-sm space-y-2">
                          <div class="font-medium text-gray-900">${p.name}</div>
                          ${p.title ? `<div class="text-gray-600">${p.title}</div>` : ''}
                          
                          <div class="pt-2 mt-2 border-t border-gray-100 space-y-2">
                            ${p.email ? `
                              <div class="flex items-start">
                                <svg class="h-4 w-4 text-gray-500 mt-0.5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href="mailto:${p.email}" class="text-blue-600 hover:underline">${p.email}</a>
                              </div>
                            ` : ''}
                            
                            ${p.phone ? `
                              <div class="flex items-start">
                                <svg class="h-4 w-4 text-gray-500 mt-0.5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href="tel:${p.phone}" class="text-blue-600 hover:underline">${p.phone}</a>
                              </div>
                            ` : ''}
                            
                            ${p.organization ? `
                              <div class="flex items-start">
                                <svg class="h-4 w-4 text-gray-500 mt-0.5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>${p.organization}</span>
                              </div>
                            ` : ''}
                            
                            ${p.department ? `
                              <div class="flex items-start">
                                <svg class="h-4 w-4 text-gray-500 mt-0.5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>${p.department}</span>
                              </div>
                            ` : ''}
                            
                            ${p.notes ? `
                              <div class="pt-2 mt-2 border-t border-gray-100">
                                <div class="text-xs font-medium text-gray-500 mb-1">Notes</div>
                                <div class="text-sm text-gray-700 bg-gray-50 p-2 rounded">${p.notes}</div>
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `
  };
  };

  // Main component return
  return (
    <div className="min-h-screen bg-linear-to-r from-indigo-50 to-blue-50 p-4 md:p-8">
        <div className="h-[80vh] w-full">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventContent={renderEventContent}
            eventClassNames={eventClassNames}
            eventClick={handleEventClick}
            eventMouseEnter={handleEventMouseEnter}
            eventMouseLeave={handleEventMouseLeave}
            selectable={true}
            select={handleDateSelect}
            editable={true}
            eventResizableFromStart={true}
            dayMaxEvents={true}
            nowIndicator={true}
            initialDate={currentDate}
            height="100%"
          />
        </div>

      {/* Tooltip */}
      {tooltip.event && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white text-gray-800 text-sm p-4 rounded-lg shadow-xl pointer-events-auto transition-all duration-200 border border-gray-200 max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 10}px`,
            transform: 'translateY(-100%)',
            maxWidth: '300px',
            minWidth: '200px'
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {(() => {
            // Use an IIFE to create a new scope where we can safely use non-null assertions
            const event = tooltip.event!;
            return (
              <>
                {event.title && (
                  <div className="font-semibold mb-1">{event.title}</div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  {event.start && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(event.start as string), 'EEEE, MMMM d, yyyy')}
                    </div>
                  )}
                  {event.extendedProps?.start_time && event.extendedProps?.end_time && (
                    <div className="flex items-center gap-1 mt-1">
                      <ClockIcon className="h-3 w-3 shrink-0" />
                      {event.extendedProps.start_time} - {event.extendedProps.end_time}
                    </div>
                  )}
                </div>
                {event.extendedProps?.venue && (
                  <div className="text-sm mt-1">
                    <div className="font-medium">Venue:</div>
                    <div>{event.extendedProps.venue}</div>
                  </div>
                )}
                {event.extendedProps?.organization && (
                  <div className="text-sm mt-2">
                    <div className="font-medium">Organization:</div>
                    <div>{event.extendedProps.organization}</div>
                  </div>
                )}
                {event.extendedProps?.organization_contact && (
                  <div className="text-sm mt-2">
                    <div className="font-medium">Contact:</div>
                    <div>{event.extendedProps.organization_contact}</div>
                  </div>
                )}
                {event.extendedProps?.participants?.length > 0 && (
                  <div className="text-sm mt-2">
                    <div className="font-medium">Participants:</div>
                    <div className="mt-1 space-y-1">
                      {event.extendedProps.participants.map((participant: Participant, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {participant.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const eventClassNames = (arg: any): string[] => {
  return [
    'cursor-pointer',
    'overflow-hidden',
    'relative',
    'h-full',
    'flex',
    'flex-col',
    'text-sm',
    'font-medium',
    'z-10',
    'border-l-4',
    'hover:shadow-md',
    'transition-colors',
    'duration-150',
    'ease-in-out'
  ].filter(Boolean) as string[];
};

// Format time helper function - moved to component scope
// const formatTime = (date: Date | string | null): string => {
//   if (!date) return '';
//   const dateObj = typeof date === 'string' ? new Date(date) : date;
//   return format(dateObj, 'h:mm a');
// };

// Parse date and time helper function - moved to component scope
// const parseDateTime = (dateStr: string, timeStr: string): Date => {
//   const [hours, minutes] = timeStr.split(':').map(Number);
//   const date = new Date(dateStr);
//   date.setHours(hours, minutes, 0, 0);
//   return date;
// };
