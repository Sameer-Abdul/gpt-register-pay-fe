// src/app/api/assignments/route.ts
import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  console.log('GET /api/assignments called');
  
  try {
    // Get the session with auth options
    const session = await getServerSession(authOptions);
    
    // Debug log the session
    console.log('Session data:', {
      user: session?.user ? {
        email: session.user.email,
        name: session.user.name,
        id: (session.user as any)?.id,
        isAdmin: (session.user as any)?.isAdmin,
        role: (session.user as any)?.role
      } : 'No session user',
      expires: session?.expires
    });
    
    // Check if user is authenticated
    if (!session?.user?.email) {
      console.log('Unauthorized: No active session or user email');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // For admin@example.com, we can trust the session
    if (session.user.email === 'admin@example.com') {
      console.log('Admin access granted to admin@example.com');
    } else {
      // For other users, check the database
      console.log('Checking admin status in database for user:', session.user.email);
      const userResult = await pool.query(
        'SELECT id, email, is_admin FROM register WHERE email = $1 LIMIT 1',
        [session.user.email]
      );
      
      console.log('User query result:', userResult.rows[0]);
      
      if (userResult.rows.length === 0) {
        console.log('User not found in database');
        return NextResponse.json(
          { 
            error: 'User not found',
            message: 'Your account was not found in our system'
          },
          { status: 404 }
        );
      }
      
      const user = userResult.rows[0];
      if (!user.is_admin) {
        console.log('User is not an admin in database');
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'Admin access required'
          },
          { status: 403 }
        );
      }
    }
    
    // Check if assignments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assignments'
      ) as exists;
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      console.error('Assignments table does not exist');
      return NextResponse.json(
        { error: 'Assignments table not found' },
        { status: 500 }
      );
    }
    
    console.log('Fetching assignments...');
    const result = await pool.query(`
      SELECT 
        a.id,
        a.register_id,
        a.file_name,
        a.file_size,
        a.file_type,
        a.state,
        a.district,
        a.mandal,
        a.submission_date,
        a.ai_rating::numeric as ai_rating,
        a.manual_rating::numeric as manual_rating,
        a.final_rating::numeric as final_rating,
        a.created_at,
        a.context,
        a.first_name,
        a.last_name,
        r.email as user_email
      FROM assignments a
      LEFT JOIN register r ON a.register_id = r.id
      ORDER BY a.submission_date DESC
    `);
    
    console.log(`Found ${result.rows.length} assignments`);
    console.log('Sample assignment:', result.rows[0]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/assignments called');
    
    // Get the session with auth options
    const session = await getServerSession(authOptions);
    
    // Debug log the session
    console.log('Session data:', {
      user: session?.user ? {
        email: session.user.email,
        name: session.user.name,
        id: (session.user as any)?.id,
        isAdmin: (session.user as any)?.isAdmin,
        role: (session.user as any)?.role
      } : 'No session user',
      expires: session?.expires
    });
    
    // Check if user is authenticated
    if (!session?.user?.email) {
      console.log('Unauthorized: No active session or user email');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Check if this is a JSON request (for creating assignment) or form data (legacy)
    const contentType = request.headers.get('content-type');
    let context, fileName, fileSize, fileType, file, fileBuffer;
    
    if (contentType?.includes('application/json')) {
      // JSON request - creating assignment without file
      const body = await request.json();
      context = body.context;
      fileName = body.fileName;
      fileSize = body.fileSize;
      fileType = body.fileType;
      
      console.log('JSON request received:', { context, fileName, fileSize, fileType });
    } else {
      // Form data request - legacy behavior
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      context = formData.get('context') as string | null;
      
      console.log('Form data received:', { 
        fileName: file?.name, 
        fileSize: file?.size,
        fileType: file?.type,
        context: context
      });
      
      if (!file) {
        console.error('No file provided in form data');
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }
      
      if (!context) {
        console.error('No context provided in form data');
        return NextResponse.json(
          { error: 'No context provided' },
          { status: 400 }
        );
      }

      // Convert file to buffer for legacy behavior
      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
    }
    
    if (!context) {
      console.error('No context provided');
      return NextResponse.json(
        { error: 'No context provided' },
        { status: 400 }
      );
    }

    // Get user ID from database
    console.log('Fetching user from database for email:', session.user.email);
    const userResult = await pool.query(
      'SELECT id FROM register WHERE email = $1 LIMIT 1',
      [session.user.email]
    );
    
    if (userResult.rows.length === 0) {
      console.error('User not found in database for email:', session.user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const registerId = userResult.rows[0].id;
    console.log('User found, registerId:', registerId);
    
    // Insert assignment into database
    console.log('Inserting assignment into database...');
    const result = await pool.query(
      `INSERT INTO assignments (
        register_id,
        file_name,
        file_size,
        file_type,
        context,
        submission_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
      [
        registerId,
        fileName,
        fileSize,
        fileType,
        context
      ]
    );
    
    const assignmentId = result.rows[0]?.id;
    console.log('Assignment created successfully, ID:', assignmentId);

    // If this is a legacy request with file data, also store the file
    if (fileBuffer) {
      console.log('Updating assignment with file data...');
      await pool.query(
        'UPDATE assignments SET file_data = $1 WHERE id = $2',
        [fileBuffer, assignmentId]
      );
    }

    return NextResponse.json({ 
      success: true, 
      id: assignmentId,
      message: 'Assignment created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/assignments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT handler has been moved to /api/assignments/[id]/route.ts
