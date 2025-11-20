import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { Buffer } from "buffer";

const parsePdf = async (buffer: Buffer): Promise<string> => {
  const pdf = require("pdf-parse");
  const data = await pdf(buffer);
  return data.text;
};

const analyzeWithOllama = async (prompt: string) => {
  const baseUrl =
    process.env.OLLAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ||
    "http://localhost:11434";
  const response = await fetch(`${baseUrl}/api/generate`, {
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

      const assignmentResult = await client.query(
        `SELECT a.*, r.email as user_email
         FROM assignments a
         JOIN register r ON a.register_id = r.id
         WHERE a.id = $1`,
        [assignmentId]
      );
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

      await client.query(
        `UPDATE assignments
         SET ai_rating = $1,
             final_rating = COALESCE(manual_rating, $1),
             updated_at = NOW()
         WHERE id = $2`,
        [rating, assignmentId]
      );

      return NextResponse.json({
        success: true,
        id: assignmentId,
        data: { rating, score: rating * 10 },
      });
    } finally {
      client.release();
    }
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
