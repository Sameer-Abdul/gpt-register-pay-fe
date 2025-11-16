import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');

    if (!district) {
      return NextResponse.json(
        { success: false, error: 'District parameter is required' },
        { status: 400 }
      );
    }

    // Query to get mandals for the given district
    const result = await query(
      'SELECT DISTINCT mandal FROM locations WHERE district = $1 ORDER BY mandal',
      [district]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => row.mandal)
    });
  } catch (error) {
    console.error('Error fetching mandals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mandals' },
      { status: 500 }
    );
  }
}
