import { NextRequest, NextResponse } from "next/server";

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

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      console.error('BACKEND_URL is not set');
      return NextResponse.json(
        { success: false, error: 'BACKEND_URL is not configured on the server' },
        { status: 500 }
      );
    }

    const apiUrl = `${backendUrl}/tenants/${id}/header`;
    console.log('Making request to backend:', apiUrl);

    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', res.status);

    const raw = await res.json();

    if (!res.ok) {
      console.error('Backend error:', raw);
      return NextResponse.json(
        { 
          success: false, 
          error: raw.error || `Backend returned status ${res.status}`,
          details: raw
        },
        { status: res.status }
      );
    }

    // Support both { success, data } and direct object formats
    const src: any = raw?.data ?? raw;

    const data = {
      id: src.tenantId ?? src.tenant_id ?? src.id ?? id,
      tenant_name: src.name ?? src.tenant_name ?? '',
      left_image_url: src.imageLeft ?? src.left_image_url ?? null,
      right_image_url: src.imageRight ?? src.right_image_url ?? null,
      header_format: src.header_format ?? 'auto',
      header_custom_lines: src.header_custom_lines ?? null,
    };

    console.log('Successfully retrieved tenant header data from backend');
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
