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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  // Add request logging
  console.log(`[${new Date().toISOString()}] PUT /api/assignments/${id}`, {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    params: context.params
  });

  // Check if the ID is valid
  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    console.error('Invalid assignment ID:', id);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid Assignment ID',
        message: 'The provided assignment ID is not valid.'
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

  // Check request size
  const requestContentLength = Number(request.headers.get('content-length') || '0');
  if (requestContentLength > MAX_REQUEST_SIZE) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Request Entity Too Large',
        message: `Request body exceeds ${MAX_REQUEST_SIZE / 1024 / 1024}MB limit`
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

  // Parse request body
  let body;
  try {
    body = await request.json();
    console.log('Request body:', body);
  } catch (error: unknown) {
    console.error('Error parsing request body:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid Request Body',
        message: 'Failed to parse request body as JSON'
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

  // Validate rating
  const { rating } = body;
  if (rating === undefined || rating === null) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Rating is required'
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

  const ratingValue = Number(rating);
  if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Rating must be a number between 0 and 10'
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

  // Get a client from the pool
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if the assignment exists
    const checkResult = await client.query(
      'SELECT id FROM assignments WHERE id = $1 FOR UPDATE',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Not Found',
          message: 'Assignment not found'
        }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      );
    }
    
    // Update the rating
    const updateResult = await client.query(
      `UPDATE assignments 
       SET rating = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, rating, updated_at`,
      [ratingValue, id]
    );
    
    await client.query('COMMIT');
    
    // Log successful update
    console.log('Rating updated successfully:', {
      assignmentId: id,
      newRating: updateResult.rows[0]?.rating,
      timestamp: new Date().toISOString()
    });
    
    // Return success response
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          id: updateResult.rows[0].id,
          rating: updateResult.rows[0].rating,
          updated_at: updateResult.rows[0].updated_at
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
    
  } catch (error: unknown) {
    // Log the error and rollback the transaction
    await client.query('ROLLBACK').catch((rollbackError: Error) => {
      console.error('Error rolling back transaction:', rollbackError);
    });
    
    console.error('Error updating rating:', error);
    
    // Generate a unique error ID for tracking
    const errorId = Math.random().toString(36).substring(2, 9);
    
    // Prepare error details for development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      : undefined;
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update assignment rating',
        errorId,
        ...(errorDetails && { details: errorDetails })
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    );
  } finally {
    // Release the client back to the pool
    client.release();
  }

  // Apply rate limiting
  if (ratelimit) {
    const forwarded = request.headers.get('x-forwarded-for') || '';
    let ip = forwarded.split(/, /)[0] || '127.0.0.1';
    
    // Ensure we have a valid IP
    ip = ip || '127.0.0.1';
    
    // We already checked that ratelimit is not null
    const rateLimitResult = await ratelimit!.limit(ip) as RateLimitResult;
    
    if (!rateLimitResult || !rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult ? Math.ceil((rateLimitResult.reset - Date.now()) / 1000) : 0
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult ? rateLimitResult.limit.toString() : '0',
            'X-RateLimit-Remaining': rateLimitResult ? rateLimitResult.remaining.toString() : '0',
            'X-RateLimit-Reset': rateLimitResult ? rateLimitResult.reset.toString() : '0',
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

  // Sanitize and validate ID
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: 'Assignment ID is required'
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

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', { ...body, password: body.password ? '***' : undefined });
    } catch (error: unknown) {
      console.error('Error parsing request body:', error);
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

    // Validate rating
    const { rating } = body;
    if (rating === undefined || rating === null) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Rating is required'
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

    const ratingValue = Number(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Rating must be a number between 0 and 10'
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

    // Update the assignment using a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if assignment exists with FOR UPDATE to lock the row
      const checkResult = await client.query(
        'SELECT id FROM assignments WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (checkResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Not Found',
            message: 'Assignment not found'
          }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...securityHeaders
            }
          }
        );
      }

      // Update the rating
      const updateResult = await client.query(
        `UPDATE assignments 
         SET rating = $1, 
             updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, rating, updated_at`,
        [ratingValue, id]
      );

      await client.query('COMMIT');

      // Log successful update
      console.log('Rating updated successfully:', {
        assignmentId: id,
        newRating: updateResult.rows[0]?.rating,
        timestamp: new Date().toISOString()
      });

      return new NextResponse(
        JSON.stringify({
          success: true,
          data: updateResult.rows[0]
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
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('Database error:', dbError);
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const errorId = crypto.randomUUID();
    // Type guard to safely access error properties
    const errorMessage = (error as Error)?.message || 'Unknown error';
    const errorStack = (error as Error)?.stack;
    
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
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            message: errorMessage,
            ...(errorStack && { stack: errorStack })
          }
        })
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
