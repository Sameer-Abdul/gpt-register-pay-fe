export type PerformanceType = 'single' | 'group';

export interface Event {
  id: number;
  name: string;
  mode_of_event: 'In-Person' | 'Online' | 'Hybrid' | 'Virtual';
  date: string; // ISO date string
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  venue: string;
  latitude?: string;
  longitude?: string;
  organization_name?: string;
  organization_contact?: string;
  organization_email?: string;
  performance_type?: PerformanceType;
  event_coordinator?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_host_url?: string;
  zoom_password?: string;
  participants?: Participant[];
}

export interface Participant {
  id: number;
  event_id: number;
  name: string;
  age?: number;
  phone_no: string;
  email: string;
  address: string;
  gender: string;
  latitude?: string;
  longitude?: string;
  prerequisites_completed: boolean;
  created_at: string;
}

export interface EventRegister {
  id: number;
  name: string;
  email: string;
  mobile_no: string;
  password: string;
  tenant_id: string;
  created_at: string;
}

export interface Tenant {
  tenant_id: string;
  name: string;
  email: string;
  contact_no: string;
  address: string;
  image_url: string;
  license_type?: string;
  valid_to?: string;
}

export interface EventRegistration {
  id: string;
  name: string;
  description: string;
  start: string | Date;
  end: string | Date;
  organizationPOC?: string;
  pocMobile?: string;
  pocEmail?: string;
  alternateNumber?: string;
  venue: string;
  organizationName: string;
  latitude?: number;
  longitude?: number;
  eventCoordinator?: string;
  participants: Participant[];
  createdAt: string | Date;
  updatedAt: string | Date;
  comments?: string;
  performanceType: 'single' | 'group';
  userId: string;
}
