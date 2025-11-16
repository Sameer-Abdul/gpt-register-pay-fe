import pool from './db';

export interface NotificationLog {
  id?: number;
  event_id: number;
  recipient_type: 'organization' | 'participant';
  recipient_id: string;
  message_type: 'email' | 'telegram';
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  created_at?: string;
}

export async function logNotification(notification: Omit<NotificationLog, 'id' | 'created_at'>): Promise<NotificationLog> {
  const { event_id, recipient_type, recipient_id, message_type, status, error_message } = notification;
  
  const result = await pool.query(
    `INSERT INTO notification_logs 
     (event_id, recipient_type, recipient_id, message_type, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [event_id, recipient_type, recipient_id, message_type, status, error_message]
  );
  
  return result.rows[0];
}

export async function getEventNotifications(eventId: number): Promise<NotificationLog[]> {
  const result = await pool.query(
    'SELECT * FROM notification_logs WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return result.rows;
}

export async function getNotificationStatus(eventId: number): Promise<{ [key: string]: NotificationLog[] }> {
  const notifications = await getEventNotifications(eventId);
  
  return notifications.reduce((acc, notification) => {
    const key = `${notification.recipient_type}_${notification.recipient_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(notification);
    return acc;
  }, {} as { [key: string]: NotificationLog[] });
}
