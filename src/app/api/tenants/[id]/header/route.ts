import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Query to get tenant header details
    const tenantQuery = `
      SELECT 
        id as "tenantId",
        name,
        image_url_left as "imageLeft",
        image_url_right as "imageRight",
        header_format as "headerFormat",
        header_custom_lines as "headerCustomLines"
      FROM tenant_master 
      WHERE id = $1
    `;
    
    const result = await query(tenantQuery, [tenantId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantData = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        tenantId: tenantData.tenantId,
        name: tenantData.name,
        imageLeft: tenantData.imageLeft || null,
        imageRight: tenantData.imageRight || null,
        header_format: tenantData.headerFormat || 'auto',
        header_custom_lines: tenantData.headerCustomLines || null
      }
    });
    
  } catch (error) {
    console.error('Error fetching tenant header:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tenant header',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
