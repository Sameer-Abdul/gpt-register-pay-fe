import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Pool } from 'pg';
import { authOptions } from '@/lib/auth';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// Configure rate limiting
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
      analytics: true,
    })
  : null;

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
};

// Request size limit (5MB)
const MAX_REQUEST_SIZE = 5 * 1024 * 1024; // 5MB

// Create a new pool using the DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon DB
  }
});

export async function GET() {
  return new NextResponse(
    JSON.stringify({
      success: true,
      message: "Assignments API root",
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...securityHeaders
      }
    }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Apply rate limiting
  if (ratelimit) {
    // Get IP address from headers (works with Vercel and other platforms)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(/, /)[0] : '127.0.0.1');
    
    const rateLimitResult = await ratelimit.limit(ip) as RateLimitResult;
    const { success, limit, reset, remaining } = rateLimitResult;
    
    if (!success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            ...securityHeaders
          }
        }
      );
    }
  }

  // Check request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_REQUEST_SIZE) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum allowed size'
      }),
      { 
        status: 413,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
  }

  // Sanitize ID
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Invalid assignment ID format'
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
  }

  // Log request with sanitized data
  console.log({
    level: 'info',
    message: 'PUT /api/assignments/[id]',
    id,
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent')
  });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('🔒 Unauthorized: No session');
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource' 
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      );
    }

    // Log request body (sanitized)
    const logBody = { ...body };
    if (logBody.accessToken) logBody.accessToken = '***';
    if (logBody.password) logBody.password = '***';
    
    console.log({
      level: 'debug',
      message: 'Request body',
      body: logBody,
      timestamp: new Date().toISOString()
    });

    const { rating } = body;

    // Validate rating
    if (rating === undefined || rating === null) {
      console.log('❌ Missing rating in request');
      return NextResponse.json(
        { 
          success: false,
          error: 'Bad Request',
          message: 'Rating is required' 
        },
        { status: 400 }
      );
    }

    const ratingValue = Number(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      console.log('❌ Invalid rating value:', rating);
      return NextResponse.json(
        { 
          success: false,
          error: 'Bad Request',
          message: 'Rating must be a number between 0 and 10' 
        },
        { status: 400 }
      );
    }

    // Check if assignment exists first
    console.log(`🔍 Checking if assignment exists with ID: ${id}`);
    const checkQuery = 'SELECT id, rating FROM assignments WHERE id = $1';
    let checkResult;
    
    try {
      checkResult = await pool.query(checkQuery, [id]);
      console.log(`📊 Current assignment data:`, checkResult.rows[0] || 'Not found');
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError);
      throw new Error(`Database query failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    if (checkResult.rowCount === 0) {
      console.log(`❌ Assignment not found with ID: ${id}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Not Found',
          message: 'Assignment not found',
          details: `No assignment found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    // Update the assignment
    console.log(`🔄 Attempting to update assignment ${id} with rating:`, ratingValue);
    let result;
    
    try {
      result = await pool.query(
        `UPDATE assignments 
         SET rating = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, rating, updated_at`,
        [ratingValue, id]
      );
      
      if (!result.rows[0]) {
        throw new Error('No rows were affected by the update');
      }
      
      console.log('✅ Update successful. New data:', result.rows[0]);
    } catch (updateError) {
      console.error('❌ Update failed:', updateError);
      throw new Error(`Failed to update assignment: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
    }
    // Log successful update
    console.log({
      level: 'info',
      message: 'Rating updated successfully',
      assignmentId: id,
      newRating: result.rows[0]?.rating,
      timestamp: new Date().toISOString()
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Rating updated successfully',
        data: result.rows[0]
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );

  } catch (error) {
    const errorId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Structured error logging
    console.error({
      level: 'error',
      message: 'Error in PUT /api/assignments/[id]',
      error: errorMessage,
      stack: errorStack,
      errorId,
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
      method: request.method,
      id,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update assignment rating',
        errorId,
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack
        } : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-ID': errorId,
          'X-Error-Type': 'ServerError',
          ...securityHeaders,
          'Retry-After': '60'
        }
      }
    );
  }
}
