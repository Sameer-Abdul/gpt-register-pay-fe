import axios from 'axios';

const ZOOM_AUTH_URL = 'https://zoom.us/oauth/token';

export interface ZoomMeeting {
  id?: string;
  join_url: string;
  start_url: string;
  password: string;
  // Add other Zoom meeting properties as needed
}

export class ZoomService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private accountId: string,
    private apiBase: string = 'https://api.zoom.us/v2'
  ) {}

  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.accessToken !== null && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post<{ access_token: string }>(
        ZOOM_AUTH_URL,
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token received from Zoom API');
      }
      
      this.accessToken = response.data.access_token;
      // Set token to expire 50 minutes from now (tokens are valid for 1 hour)
      this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;
      
      // We can safely assert non-null here since we just set it
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  public async createMeeting(
    topic: string,
    startTime: string,
    duration: number = 60,
    timezone: string = 'Asia/Kolkata'
  ): Promise<ZoomMeeting> {
    try {
      console.log('[ZoomService] Creating meeting with params:', {
        topic,
        startTime,
        duration,
        timezone,
        apiBase: this.apiBase
      });
      
      const token = await this.getAccessToken();
      
      const meetingData = {
        topic: topic || 'Event Meeting',
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'none',
        },
      };
      
      console.log('[ZoomService] Sending request to Zoom API with data:', JSON.stringify(meetingData, null, 2));
      
      const response = await axios.post(
        `${this.apiBase}/users/me/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('[ZoomService] Zoom API response:', {
        status: response.status,
        statusText: response.statusText,
        data: {
          id: response.data.id,
          join_url: response.data.join_url,
          start_url: response.data.start_url ? '***' : 'missing',
          password: response.data.password ? '***' : 'missing'
        }
      });

      if (!response.data.id || !response.data.join_url) {
        throw new Error('Invalid response from Zoom API: missing required fields');
      }

      return {
        id: response.data.id.toString(),
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        password: response.data.password,
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw new Error('Failed to create Zoom meeting');
    }
  }
}

// Create a singleton instance
export const zoomService = new ZoomService(
  process.env.ZOOM_CLIENT_ID || 'SXxrlxRZyYFO3OvwF5ig',
  process.env.ZOOM_CLIENT_SECRET || 'Re5VN3BlHKTOzMlQCdBciUq5KytcLJFS',
  process.env.ZOOM_ACCOUNT_ID || 'azl7eY8TQr2ApfFrJG0E_g'
);
