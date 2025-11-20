import { NextRequest, NextResponse } from "next/server";
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Received request for tenant header');
    const { id } = await context.params;
    console.log('Fetching header for tenant ID:', id);
    
    if (!id) {
      console.error('No tenant ID provided');
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT 
        tenant_id,
        name as tenant_name,
        image_url_left,
        image_url_right,
        header_format,
        header_custom_lines
       FROM tenant_master
       WHERE tenant_id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      console.error('Tenant not found for ID:', id);
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const data = {
      id: row.tenant_id,
      tenant_name: row.tenant_name,
      left_image_url: row.image_url_left,
      right_image_url: row.image_url_right,
      header_format: row.header_format || 'auto',
      header_custom_lines: row.header_custom_lines,
    };

    console.log('Successfully retrieved tenant header data from DB');
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in tenant header route:', err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
