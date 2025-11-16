import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const result = await query('SELECT NOW() as time, current_database() as db, current_user as user');
    
    return NextResponse.json({
      success: true,
      database: {
        time: result.rows[0].time,
        name: result.rows[0].db,
        user: result.rows[0].user,
        connection: 'OK'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 500 }
    );
  }
}

// This is required for CORS to work with the test endpoint
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
