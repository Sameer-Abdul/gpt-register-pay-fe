import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

export async function GET() {
  try {
    // Sample states data - replace with your actual states table query if needed
    const states = [
      { id: 1, name: 'Andhra Pradesh' },
      { id: 2, name: 'Telangana' },
      { id: 3, name: 'Karnataka' },
      { id: 4, name: 'Tamil Nadu' },
      { id: 5, name: 'Kerala' },
      { id: 6, name: 'Maharashtra' },
    ];

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: states
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error in /api/states:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch states',
        details: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
