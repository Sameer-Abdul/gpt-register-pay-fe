import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Session } from 'next-auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  console.log('Merit API route called');
  
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    // Try to get session if using cookies
    const session = await getServerSession(authOptions);
    
    // Debug: Log the session
    console.log('Session in API route:', {
      hasSession: !!session,
      hasAuthHeader: !!authHeader,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        hasAccessToken: !!(session as any)?.accessToken || !!(session as any)?.user?.accessToken
      } : 'No user'
    });
    
    let accessToken = '';
    
    // First try to get token from Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.split(' ')[1];
      console.log('Using token from Authorization header');
    } 
    // Then try to get from session
    else if (session?.user) {
      accessToken = (session as any)?.accessToken || (session as any)?.user?.accessToken || '';
      console.log('Using token from session');
    }
    
    if (!accessToken) {
      console.error('No access token found in request');
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'No access token found in request.'
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const apiEndpoint = `${apiUrl}/assignments/merit`;
    
    console.log('Fetching from API:', apiEndpoint, 'with token:', accessToken ? 'present' : 'missing');
    
    try {
      const response = await fetch(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log('Backend API response status:', response.status);

      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('API Error Response:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('API Error (non-JSON response):', text);
          errorData = { message: text };
        }
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Failed to fetch merit data',
            status: response.status,
            statusText: response.statusText,
            details: errorData
          }), 
          { 
            status: response.status,
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      return NextResponse.json(data);
      
    } catch (apiError) {
      console.error('Error calling backend API:', apiError);
      throw apiError; // This will be caught by the outer catch block
    }
    
  } catch (error) {
    console.error('Error in merit API route:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

export const dynamic = 'force-dynamic'; // Ensure dynamic route handling
