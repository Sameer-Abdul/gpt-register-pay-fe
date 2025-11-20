import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest, 
  context: { params: { id: string } }
) {
  try {
    // Next.js 16 sometimes wraps params in a Promise → use await safely
    const { id } = await context.params;

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      throw new Error("BACKEND_URL is not defined in environment variables");
    }

    const res = await fetch(`${backendUrl}/tenants/${id}/header`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch tenant header from backend",
      }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Error in tenant header API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process tenant header request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
