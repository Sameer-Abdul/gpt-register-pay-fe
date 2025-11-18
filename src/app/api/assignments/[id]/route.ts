import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';
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
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    })
  : null;

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'"
};

const MAX_REQUEST_SIZE = 5 * 1024 * 1024; // 5MB

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET() {
  return new NextResponse(
    JSON.stringify({ success: true, message: "Assignments API root" }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  if (ratelimit) {
    const forwarded = request.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(/, /)[0] || '127.0.0.1';
    const rateLimitResult = await ratelimit.limit(ip);
    
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            ...securityHeaders
          }
        }
      );
    }
  }

  // Get ID from params
  const id = context.params instanceof Promise 
    ? (await context.params).id 
    : context.params.id;

  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid ID',
        message: 'A valid assignment ID is required'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
    );
  }

  // Check request size
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_REQUEST_SIZE) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Payload Too Large',
        message: `Request body exceeds ${MAX_REQUEST_SIZE / 1024 / 1024}MB limit`
      }),
      { status: 413, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
    );
  }

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON',
          message: 'Failed to parse request body'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
      );
    }

    // Validate rating
    const { rating } = body;
    if (rating === undefined || rating === null) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Missing Rating',
          message: 'Rating is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
      );
    }

    const ratingValue = Number(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid Rating',
          message: 'Rating must be a number between 0 and 10'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
      );
    }

    // Update database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if assignment exists
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
          { status: 404, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
        );
      }

      // Update rating
      const updateResult = await client.query(
        `UPDATE assignments 
         SET rating = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, rating, updated_at`,
        [ratingValue, id]
      );

      await client.query('COMMIT');

      return new NextResponse(
        JSON.stringify({
          success: true,
          data: updateResult.rows[0]
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0',
            ...securityHeaders
          }
        }
      );
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating assignment rating:', error);
    const errorId = Math.random().toString(36).substr(2, 9);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update assignment rating',
        errorId
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-ID': errorId,
          ...securityHeaders
        }
      }
    );
  }
}