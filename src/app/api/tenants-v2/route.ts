import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Force dynamic route handling
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

export async function GET() {
  try {
    // Test connection first
    await query('SELECT 1');
    
    // Fetch tenants with their license information
    const result = await query(`
      SELECT 
        t.tenant_id as id, 
        t.name, 
        t.email,
        t.contact_no as "contactNo",
        t.address,
        t.image_url as "imageUrl",
        l.license_type as "licenseType",
        l.valid_to as "validTo",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM tenant_master t
      LEFT JOIN license l ON t.tenant_id = l.tenant_id
      ORDER BY t.name ASC
    `);
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: result.rows
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
    console.error('Error in /api/tenants-v2:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch tenants',
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

// Handle OPTIONS method for CORS preflight
// This is required for CORS to work with POST/PUT/DELETE requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
