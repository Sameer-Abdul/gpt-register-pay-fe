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
      return NextResponse.json(
        { success: false, error: "BACKEND_URL is not set" },
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

    const data = await res.json();

    if (!res.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || `Backend returned status ${res.status}`,
          details: data
        },
        { status: res.status }
      );
    }

    console.log('Successfully retrieved tenant header data');
    return NextResponse.json({ 
      success: true, 
      data: data.data || data // Handle both formats: {data: {...}} and direct response
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
