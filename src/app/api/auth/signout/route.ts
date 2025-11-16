import { NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

// Helper function to create a response with CORS headers
function createResponse(body: any, status = 200) {
  const response = new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
  return response;
}

export async function GET() {
  try {
    const response = createResponse({ message: 'Signed out successfully' });
    
    // Get the hostname from NEXTAUTH_URL or use localhost for development
    const hostname = process.env.NEXTAUTH_URL 
      ? new URL(process.env.NEXTAUTH_URL).hostname 
      : 'localhost';

    // Cookie options for clearing session
    const cookieOptions = {
      value: '',
      expires: new Date(0),
      path: '/',
      domain: isProduction ? hostname : 'localhost',
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax' as const,
    };

    // Clear all possible session cookies
    ['next-auth.session-token', '__Secure-next-auth.session-token'].forEach(name => {
      response.cookies.set({
        ...cookieOptions,
        name,
      });
    });

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return createResponse(
      { error: 'Failed to sign out', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
}

export async function POST() {
  // Handle POST requests the same way as GET
  return GET();
}

export async function OPTIONS() {
  return createResponse({}, 204);
}
