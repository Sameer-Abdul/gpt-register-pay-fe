import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { Buffer } from "buffer";

const parsePdf = async (buffer: Buffer): Promise<string> => {
  const pdf = require("pdf-parse");
  const data = await pdf(buffer);
  return data.text;
};

const analyzeWithOllama = async (prompt: string) => {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false,
    }),
  });
  return await response.json();
};

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

    const userResult = await sql`
      SELECT is_admin FROM register WHERE email = ${session.user.email}
    `;
    if (!userResult.rows[0]?.is_admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const assignmentResult = await sql`
      SELECT a.*, r.email as user_email
      FROM assignments a
      JOIN register r ON a.register_id = r.id
      WHERE a.id = ${assignmentId}
    `;
    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    const assignment = assignmentResult.rows[0];

    if (!assignment.file_data?.data) {
      return NextResponse.json(
        { success: false, error: "No file data available" },
        { status: 400 }
      );
    }

    const pdfText = await parsePdf(Buffer.from(assignment.file_data.data));
    const prompt = `Rate this assignment from 0–10:\n${pdfText}`;
    const ollamaResponse = await analyzeWithOllama(prompt);

    const ratingMatch = ollamaResponse.response?.match(/\d+/);
    const rating = ratingMatch
      ? Math.min(10, Math.max(0, parseInt(ratingMatch[0], 10)))
      : 5;

    await sql`
      UPDATE assignments
      SET rating = ${rating}, updated_at = NOW()
      WHERE id = ${assignmentId}
    `;

    return NextResponse.json({
      success: true,
      id: assignmentId,
      data: { rating, score: rating * 10 },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze assignment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
