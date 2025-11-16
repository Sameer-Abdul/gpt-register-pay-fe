import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Pool } from 'pg';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET() {
  try {
    console.log('Checking for existing assignment...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('No active session found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'You must be logged in to check assignments'
        },
        { status: 401 }
      );
    }

    console.log('Session found for user:', session.user.email);

    try {
      // First check if the user exists in the register table
      const userResult = await pool.query(
        'SELECT id, email FROM register WHERE email = $1 LIMIT 1',
        [session.user.email]
      );

      if (userResult.rows.length === 0) {
        console.log('User not found in register table');
        return NextResponse.json({
          success: true,
          hasAssignment: false,
          message: 'No assignment found for this user'
        });
      }

      const userId = userResult.rows[0].id;
      
      // Check if assignments table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'assignments'
        ) as exists;
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        console.log('Assignments table does not exist');
        return NextResponse.json({
          success: true,
          hasAssignment: false,
          message: 'No assignments table found'
        });
      }

      // Check if user has already submitted an assignment
      console.log('Querying assignments for user ID:', userId);
      const result = await pool.query(
        `SELECT id, file_name, submission_date, context 
         FROM assignments 
         WHERE register_id = $1
         ORDER BY submission_date DESC
         LIMIT 1`,
        [userId]
      );

      console.log('Query result:', result.rows);

      if (result.rows.length > 0) {
        return NextResponse.json({
          success: true,
          hasAssignment: true,
          assignment: result.rows[0]
        });
      }

      return NextResponse.json({
        success: true,
        hasAssignment: false,
        message: 'No assignment found for this user'
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in check endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check for existing assignment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
