import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    if (!state) {
      return NextResponse.json(
        { success: false, error: 'State parameter is required' },
        { status: 400 }
      );
    }

    // Query to get districts for the given state
    const result = await query(
      'SELECT DISTINCT district FROM locations WHERE state = $1 ORDER BY district',
      [state]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => row.district)
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch districts' },
      { status: 500 }
    );
  }
}
