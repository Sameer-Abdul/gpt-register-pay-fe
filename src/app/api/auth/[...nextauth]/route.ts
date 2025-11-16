import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Log initialization with environment info
console.log('Initializing NextAuth with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***' : 'not set',
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'not set'
});

// Log auth options (safely)
console.log('Auth options:', {
  ...authOptions,
  secret: authOptions.secret ? '***' : 'not set',
  providers: authOptions.providers?.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
  })),
});

const handler = async (req: Request, ctx: any) => {
  console.log(`[NextAuth] ${req.method} ${req.url}`);
  
  try {
    // @ts-ignore - This is a workaround for Next.js 13+ with NextAuth
    return await NextAuth(authOptions)(req, ctx);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('NextAuth error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      url: req.url,
      method: req.method,
    });
    
    return new NextResponse(
      JSON.stringify({
        error: 'Authentication error',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Export the handlers
export { handler as GET, handler as POST };

// Add CORS headers for preflight requests
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
};
