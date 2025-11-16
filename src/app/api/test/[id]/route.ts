import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const { id } = context.params;

    return NextResponse.json({
      success: true,
      message: "Test endpoint works",
      id,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: err.message
      },
      { status: 500 }
    );
  }
}
