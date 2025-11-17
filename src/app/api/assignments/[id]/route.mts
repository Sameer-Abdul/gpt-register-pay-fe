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
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log('🔍 PUT /api/assignments/[id] - ID:', id);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('🔒 Unauthorized: No session');
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource' 
        },
        { status: 401 }
      );
    }

    // Log the request body
    const body = await request.json().catch(() => ({}));
    console.log('📥 Request body:', body);
    const { rating } = body;

    // Validate rating
    if (rating === undefined || rating === null) {
      console.log('❌ Missing rating in request');
      return NextResponse.json(
        { 
          success: false,
          error: 'Bad Request',
          message: 'Rating is required' 
        },
        { status: 400 }
      );
    }

    const ratingValue = Number(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      console.log('❌ Invalid rating value:', rating);
      return NextResponse.json(
        { 
          success: false,
          error: 'Bad Request',
          message: 'Rating must be a number between 0 and 10' 
        },
        { status: 400 }
      );
    }

    // Check if assignment exists first
    const checkQuery = 'SELECT id FROM assignments WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      console.log(`❌ Assignment not found with ID: ${id}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Not Found',
          message: 'Assignment not found' 
        },
        { status: 404 }
      );
    }

    // Update the assignment
    const result = await pool.query(
      `UPDATE assignments 
       SET rating = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, rating, updated_at`,
      [ratingValue, id]
    );

    console.log('✅ Update result:', result.rows[0]);
    return NextResponse.json({
      success: true,
      message: 'Rating updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('🔥 Error in PUT /api/assignments/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update assignment rating',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
