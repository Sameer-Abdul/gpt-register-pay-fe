import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Pool } from 'pg';
import { authOptions } from '@/lib/auth';

// Create a new pool using the DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon DB
  }
});

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Assignments API root",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`PUT /api/assignments/${id} called`);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating } = body;

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Rating is required' },
        { status: 400 }
      );
    }

    const ratingValue = Number(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Rating must be between 0 and 10' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE assignments 
       SET rating = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, rating, updated_at`,
      [ratingValue, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rating updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update assignment rating',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
