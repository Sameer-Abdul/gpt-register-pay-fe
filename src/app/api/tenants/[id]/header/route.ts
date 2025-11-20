import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { success: false, error: "BACKEND_URL is not set" },
        { status: 500 }
      );
    }

    const res = await fetch(`${backendUrl}/tenants/${id}/header`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Backend error" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error: any) {
    console.error("Tenant Header API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// 👇 Required for Next.js 16 route handler correctness
export const dynamic = "force-dynamic";
