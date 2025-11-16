import { Pool } from 'pg';
import { query, withTransaction } from './db';
import pool from './db';
import { Event, Participant, EventRegister, Tenant } from '@/types/event';

type PoolClient = import('pg').PoolClient;

// Extend the Event type to include participants for creation
type EventWithParticipants = Omit<Event, 'id' | 'created_at' | 'updated_at'> & {
  participants?: Array<Omit<Participant, 'id' | 'event_id' | 'created_at'>>;
  event_coordinator?: string;
};

// Event functions
export async function getEvents(userId?: number): Promise<Event[]> {
  let queryText = `
    SELECT 
      e.*,
      e.zoom_meeting_id as zoom_meeting_id,
      e.zoom_join_url as zoom_join_url,
      e.zoom_password as zoom_password,
      e.zoom_host_url as zoom_host_url
    FROM event e
  `;
  const queryParams: any[] = [];
  
  // Add user filter if userId is provided
  if (userId) {
    queryText += ' WHERE e.created_by = $1';
    queryParams.push(userId);
  }
  
  queryText += ' ORDER BY e.date DESC, e.start_time DESC';
  
  // Get events (filtered by user if userId is provided)
  const eventsResult = await query(queryText, queryParams);
  
  // Get participants for each event
  const eventsWithParticipants = await Promise.all(
    eventsResult.rows.map(async (event) => {
      const participants = await getEventParticipants(event.id);
      return {
        ...event,
        participants,
        // Ensure zoom_join_url is included in the event object
        zoom_join_url: event.zoom_join_url,
        zoom_meeting_id: event.zoom_meeting_id,
        zoom_password: event.zoom_password,
        zoom_host_url: event.zoom_host_url
      };
    })
  );
  
  return eventsWithParticipants;
}

export async function getEventById(id: number, userId?: number): Promise<Event | null> {
  let queryText = 'SELECT * FROM event WHERE id = $1';
  const queryParams: any[] = [id];
  
  // Add user filter if userId is provided
  if (userId) {
    queryText += ' AND created_by = $2';
    queryParams.push(userId);
  }
  
  const result = await query(queryText, queryParams);
  return result.rows[0] || null;
}

export async function createEvent(
  eventData: EventWithParticipants
): Promise<Event> {
  console.log('[createEvent] Starting event creation with data:', JSON.stringify(eventData, null, 2));
  
  // Log environment variables for debugging
  console.log('[createEvent] Database connection info:', {
    DB_USERNAME: process.env.DB_USERNAME ? '***' : 'not set',
    DB_HOST: process.env.DB_HOST || 'not set',
    DB_NAME: process.env.DB_NAME || 'not set',
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'not set',
    DB_PORT: process.env.DB_PORT || 'not set',
  });

  const requiredFields = ['name', 'date', 'start_time', 'end_time', 'venue', 'organization_name', 'organization_contact', 'created_by'];
  const missingFields = requiredFields.filter(field => {
    const value = eventData[field as keyof typeof eventData];
    const isMissing = value === undefined || value === null || value === '';
    if (isMissing) {
      console.log(`[createEvent] Missing required field: ${field}`, { value });
    }
    return isMissing;
  });

  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
    console.error('[createEvent] Validation error:', error.message);
    throw error;
  }

  // Ensure required fields have default values
  const eventWithDefaults = {
    ...eventData,
    mode_of_event: eventData.mode_of_event || 'In-Person',
    performance_type: eventData.performance_type || 'single',
    latitude: eventData.latitude || null,
    longitude: eventData.longitude || null,
    organization_email: eventData.organization_email || null
  };

  console.log('[createEvent] Event data with defaults:', JSON.stringify(eventWithDefaults, null, 2));

  // Get a client from the pool
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    console.log('[createEvent] Database transaction started');

    const queryText = `
      INSERT INTO event (
        name, mode_of_event, date, start_time, end_time,
        venue, latitude, longitude, organization_name,
        organization_contact, organization_email, performance_type, 
        created_by, event_coordinator,
        zoom_meeting_id, zoom_join_url, zoom_host_url, zoom_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const queryParams = [
      eventWithDefaults.name,
      eventWithDefaults.mode_of_event,
      eventWithDefaults.date,
      eventWithDefaults.start_time,
      eventWithDefaults.end_time,
      eventWithDefaults.venue,
      eventWithDefaults.latitude,
      eventWithDefaults.longitude,
      eventWithDefaults.organization_name,
      eventWithDefaults.organization_contact,
      eventWithDefaults.organization_email,
      eventWithDefaults.performance_type,
      eventWithDefaults.created_by,
      eventWithDefaults.event_coordinator || null,
      eventWithDefaults.zoom_meeting_id || null,
      eventWithDefaults.zoom_join_url || null,
      eventWithDefaults.zoom_host_url || null,
      eventWithDefaults.zoom_password || null
    ];
    
    console.log('[createEvent] Executing query:', { 
      query: queryText, 
      params: queryParams.map((p, i) => `$${i+1}=${p}`).join(', ') 
    });
    
    const result = await client.query(queryText, queryParams);
    console.log('[createEvent] Query result:', { 
      rowCount: result.rowCount,
      rows: result.rows
    });

    if (!result.rows[0]) {
      throw new Error('No data returned after insert');
    }

    const createdEvent = result.rows[0];
    console.log('[createEvent] Event created successfully:', createdEvent);
    
    // If there are participants, add them
    if (eventWithDefaults.participants && eventWithDefaults.participants.length > 0) {
      console.log(`[createEvent] Adding ${eventWithDefaults.participants.length} participants`);
      for (const [index, participant] of eventWithDefaults.participants.entries()) {
        console.log(`[createEvent] Adding participant ${index + 1}:`, participant);
        const participantResult = await client.query(
          `INSERT INTO participant (
            event_id, name, age, phone_no, email, address, gender,
            latitude, longitude, prerequisites_completed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            createdEvent.id,
            participant.name,
            participant.age,
            participant.phone_no,
            participant.email,
            participant.address,
            participant.gender,
            participant.latitude || null,
            participant.longitude || null,
            participant.prerequisites_completed || false
          ]
        );
        console.log(`[createEvent] Participant ${index + 1} added:`, participantResult.rows[0]);
      }
    } else {
      console.log('[createEvent] No participants to add');
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('[createEvent] Transaction committed successfully');
    
    return createdEvent;
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('[createEvent] Error in transaction, rolling back:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
    console.log('[createEvent] Database client released');
  }
}

export async function updateEvent(
  id: number,
  eventData: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>> & {
    participants?: Array<Omit<Participant, 'id' | 'event_id' | 'created_at'>>;
  }
): Promise<Event | null> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('[updateEvent] Starting transaction for event ID:', id);
    
    // Handle event updates
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query for event
    for (const [key, value] of Object.entries(eventData)) {
      // Skip participants as we'll handle them separately
      if (key !== 'participants' && value !== undefined) {
        // Handle Zoom meeting fields explicitly
        if (['zoom_meeting_id', 'zoom_join_url', 'zoom_host_url', 'zoom_password'].includes(key)) {
          updates.push(`\"${key}\" = $${paramIndex}`);
          values.push(value || null); // Ensure null is used for empty strings
        } else {
          updates.push(`\"${key}\" = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }
  
    // If mode is being updated to 'In-Person', clear Zoom fields
    if (eventData.mode_of_event === 'In-Person') {
      updates.push('zoom_meeting_id = NULL', 'zoom_join_url = NULL', 'zoom_host_url = NULL', 'zoom_password = NULL');
    }

    if (updates.length > 0) {
      // Add updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      const queryText = `
        UPDATE event 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(queryText, [...values, id]);
      if (!result.rows[0]) {
        throw new Error('Failed to update event');
      }
    }

    // Handle participants if provided
    if ('participants' in eventData) {
      console.log(`[updateEvent] Processing ${eventData.participants?.length || 0} participants`);
      
      // First, delete existing participants for this event
      await client.query('DELETE FROM participant WHERE event_id = $1', [id]);
      
      // Then insert the updated participants
      if (eventData.participants && eventData.participants.length > 0) {
        for (const participant of eventData.participants) {
          if (participant.name && participant.phone_no) {
            await client.query(
              `INSERT INTO participant (
                event_id, name, age, phone_no, email, 
                address, gender, latitude, longitude, prerequisites_completed
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                id,
                participant.name,
                participant.age || null,
                participant.phone_no,
                participant.email || null,
                participant.address || null,
                participant.gender || null,
                participant.latitude || null,
                participant.longitude || null,
                participant.prerequisites_completed || false
              ]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('[updateEvent] Transaction committed successfully');
    
    // Return the updated event with participants
    const updatedEvent = await getEventById(id);
    return updatedEvent;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateEvent] Error in transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteEvent(id: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM event WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount ? result.rowCount > 0 : false;
}

// Participant functions
export async function getEventParticipants(eventId: number): Promise<Participant[]> {
  const result = await query(
    `SELECT * FROM participant WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId]
  );
  return result.rows;
}

export async function registerParticipant(
  participantData: Omit<Participant, 'id' | 'created_at'>
): Promise<Participant> {
  const result = await query(
    `INSERT INTO participant (
      event_id, name, age, phone_no, email, address, gender,
      latitude, longitude, prerequisites_completed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      participantData.event_id,
      participantData.name,
      participantData.age,
      participantData.phone_no,
      participantData.email,
      participantData.address,
      participantData.gender,
      participantData.latitude,
      participantData.longitude,
      participantData.prerequisites_completed ?? false
    ]
  );
  return result.rows[0];
}

// Event Register (User) functions
export async function createEventRegister(
  registerData: Omit<EventRegister, 'id' | 'created_at'>
): Promise<EventRegister> {
  const result = await query(
    `INSERT INTO event_register (
      name, email, mobile_no, password, tenant_id
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, mobile_no, tenant_id, created_at`,
    [
      registerData.name,
      registerData.email,
      registerData.mobile_no,
      registerData.password, // Make sure to hash the password before calling this function
      registerData.tenant_id
    ]
  );
  return result.rows[0];
}

export async function findEventRegisterByEmail(email: string): Promise<EventRegister | null> {
  const result = await query(
    'SELECT * FROM event_register WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function findEventRegisterById(id: number): Promise<EventRegister | null> {
  const result = await query(
    'SELECT * FROM event_register WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// Tenant functions
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const result = await query(
    'SELECT * FROM tenant_master WHERE tenant_id = $1',
    [tenantId]
  );
  return result.rows[0] || null;
}

export async function getTenantByRegisterId(registerId: number): Promise<Tenant | null> {
  try {
    // First get the tenant_id from the register table
    const registerResult = await query(
      'SELECT tenant_id FROM register WHERE id = $1',
      [registerId]
    );
    
    if (!registerResult.rows[0]?.tenant_id) {
      console.error('No tenant_id found for register ID:', registerId);
      return null;
    }
    
    const tenantId = registerResult.rows[0].tenant_id;
    
    // Then get the tenant details from tenant_master
    const tenantResult = await query(
      'SELECT * FROM tenant_master WHERE tenant_id = $1',
      [tenantId]
    );
    
    return tenantResult.rows[0] || null;
  } catch (error) {
    console.error('Error in getTenantByRegisterId:', error);
    return null;
  }
}
