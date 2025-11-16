import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Type definitions
interface ApiResponse {
  success: boolean;
  error?: string;
  data?: any;
  details?: string;
}

// Force dynamic route handling
export const dynamic = 'force-dynamic';

// GET /api/tenants
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registerId = searchParams.get('registerId');

    if (!registerId) {
      return NextResponse.json(
        { success: false, error: 'registerId parameter is required' },
        { status: 400 }
      );
    }

    // First, get the tenant_id from the register table
    const registerQuery = 'SELECT tenant_id FROM register WHERE id = $1';
    const registerResult = await query(registerQuery, [registerId]);
    
    if (registerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Register record not found' },
        { status: 404 }
      );
    }

    const tenantId = registerResult.rows[0].tenant_id;
    
    if (!tenantId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No tenant associated with this register ID' 
        },
        { status: 404 }
      );
    }

    // Then get the tenant details from tenant_master
    const tenantQuery = `
      SELECT 
        tenant_id,
        name,
        email,
        contact_no,
        address,
        image_url
      FROM tenant_master 
      WHERE tenant_id = $1
    `;

    const tenantResult = await query(tenantQuery, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant not found' 
        },
        { status: 404 }
      );
    }

    const tenantData = tenantResult.rows[0];
    
    return NextResponse.json(
      { 
        success: true,
        data: {
          tenant_id: tenantData.tenant_id,
          name: tenantData.name,
          email: tenantData.email,
          contact_no: tenantData.contact_no,
          address: tenantData.address,
          image_url: tenantData.image_url
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in /api/tenants:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/tenants
export async function POST() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Method Not Allowed' 
    } as ApiResponse,
    { 
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
    }
  );
}

// Other HTTP methods can be added as needed
