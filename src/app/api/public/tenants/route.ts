import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Force dynamic route handling
export const dynamic = 'force-dynamic';

// GET /api/public/tenants
export async function GET() {
  try {
    // Fetch all active tenants with their licenses
    const result = await query(
      `SELECT 
        t.tenant_id,
        t.name, 
        t.email,
        t.contact_no,
        t.address,
        t.image_url,
        l.license_type,
        l.valid_to
      FROM tenant_master t
      LEFT JOIN license l ON t.tenant_id = l.tenant_id
      WHERE (l.eligible_for_license = 'Yes' OR l.eligible_for_license IS NULL)
        AND (l.valid_to >= CURRENT_DATE OR l.valid_to IS NULL)
      ORDER BY t.name`
    );
    
    console.log(`Fetched ${result.rowCount} tenants`);

    // Transform the data to match the expected format
    const tenants = result.rows.map(row => ({
      tenant_id: row.tenant_id,
      name: row.name,
      email: row.email,
      contact_no: row.contact_no,
      address: row.address,
      image_url: row.image_url,
      license_type: row.license_type,
      valid_to: row.valid_to
    }));

    return NextResponse.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
