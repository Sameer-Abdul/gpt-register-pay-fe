import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  console.log('Database connection check started');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment variables');
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Database configuration error',
        details: 'DATABASE_URL environment variable is not set'
      },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test the connection
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    
    // Check if the assignments table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assignments'
      ) as assignments_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'register'
      ) as register_exists;
    `);
    
    const { assignments_exists, register_exists } = tableCheck.rows[0];
    
    await client.release();
    
    return NextResponse.json({
      status: 'success',
      database: 'Connected successfully',
      tables: {
        assignments: assignments_exists ? 'Exists' : 'Missing',
        register: register_exists ? 'Exists' : 'Missing'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to connect to the database',
        error: (error as Error).message
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
