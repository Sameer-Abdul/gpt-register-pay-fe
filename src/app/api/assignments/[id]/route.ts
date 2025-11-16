import { NextResponse } from 'next/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const API_BASE_URL = 'http://localhost:3001';

// Helper function to forward requests to the backend
async function forwardRequest(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    
    return NextResponse.json(data, {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`Error forwarding request to ${url}:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to the server' },
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: corsHeaders 
  });
}

// GET /api/assignments/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[${new Date().toISOString()}] GET /api/assignments/${id}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
        'Authorization': request.headers.get('Authorization') || ''
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch assignment' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { 
      status: 200,
      headers: corsHeaders 
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT /api/assignments/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[${new Date().toISOString()}] PUT /api/assignments/${id}`);

  // Forward the request body as-is
  const body = await request.json().catch(() => ({}));
  
  return forwardRequest(`${API_BASE_URL}/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'Cookie': request.headers.get('Cookie') || '',
      'Authorization': request.headers.get('Authorization') || '',
    },
  });
}

// POST /api/assignments/[id]/analyze
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[${new Date().toISOString()}] POST /api/assignments/${id}/analyze`);
  
  return forwardRequest(`${API_BASE_URL}/assignments/analyze/${id}`, {
    method: 'POST',
    headers: {
      'Cookie': request.headers.get('Cookie') || '',
      'Authorization': request.headers.get('Authorization') || '',
    },
  });
}
