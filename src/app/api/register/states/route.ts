import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Query to get all unique states
    const result = await query(
      'SELECT DISTINCT state FROM locations ORDER BY state'
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => row.state)
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch states' },
      { status: 500 }
    );
  }
}
