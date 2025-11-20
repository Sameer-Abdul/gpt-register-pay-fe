import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const assignmentId = parseInt(id, 10);
    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const contextText = body?.context ?? "";

    const client = await pool.connect();
    try {
      const userResult = await client.query(
        "SELECT is_admin FROM register WHERE email = $1",
        [session.user.email]
      );
      if (!userResult.rows[0]?.is_admin) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.API_URL;
      if (!backendUrl) {
        return NextResponse.json(
          { success: false, error: "Backend URL is not configured" },
          { status: 500 }
        );
      }

      const backendEndpoint = `${backendUrl}/assignments/${assignmentId}/analyze`;

      const backendResponse = await fetch(backendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context: contextText }),
      });

      const backendData = await backendResponse.json().catch(() => ({}));

      if (!backendResponse.ok) {
        const message =
          backendData?.message ||
          backendData?.error ||
          `Backend responded with status ${backendResponse.status}`;

        return NextResponse.json(
          { success: false, error: message },
          { status: backendResponse.status }
        );
      }

      const aiRatingRaw =
        typeof backendData?.aiRating === "number"
          ? backendData.aiRating
          : typeof backendData?.data?.aiRating === "number"
          ? backendData.data.aiRating
          : undefined;

      if (
        typeof aiRatingRaw !== "number" ||
        Number.isNaN(aiRatingRaw) ||
        aiRatingRaw < 0 ||
        aiRatingRaw > 10
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid rating received from backend AI analysis",
          },
          { status: 500 }
        );
      }

      const rating = aiRatingRaw;

      const updateResult = await client.query(
        `UPDATE assignments
         SET ai_rating = $1,
             final_rating = COALESCE(manual_rating, $1)
         WHERE id = $2
         RETURNING id, ai_rating, manual_rating, final_rating`,
        [rating, assignmentId]
      );

      const updated = updateResult.rows[0];

      return NextResponse.json({
        success: true,
        id: assignmentId,
        data: {
          rating,
          score: rating * 10,
          ai_rating: updated?.ai_rating ?? rating,
          manual_rating: updated?.manual_rating ?? null,
          final_rating: updated?.final_rating ?? rating,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze assignment",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
