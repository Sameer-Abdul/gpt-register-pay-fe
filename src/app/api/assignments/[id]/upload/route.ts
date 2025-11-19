import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('POST /api/assignments/[id]/upload - Request received');
    
    // Get the ID from the resolved params
    const { id } = await context.params;
    
    // Validate ID
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid ID',
          message: 'A valid assignment ID is required'
        },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    console.log('Form data received:', { 
      fileName: file?.name, 
      fileSize: file?.size,
      fileType: file?.type,
      assignmentId: id
    });
    
    if (!file) {
      console.error('No file provided in form data');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Forward the request to the NestJS backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://gpt-register-pay-be.onrender.com'}/assignments/${id}/upload`;
    
    console.log('Forwarding request to backend:', backendUrl);
    
    // Create a new FormData to send to backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: backendFormData,
      // Don't set Content-Type header, let the browser set it with the correct boundary
    });

    console.log('Backend response status:', response.status);
    
    // Try to parse response as JSON
    let data;
    try {
      const text = await response.text();
      console.log('Raw backend response:', text);
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('Error parsing backend response:', parseError);
      throw new Error('Invalid response from backend');
    }

    if (!response.ok) {
      console.error('Backend error:', data);
      throw new Error(data.error || data.message || `Backend error: ${response.status} ${response.statusText}`);
    }

    console.log('Upload successful:', data);
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in POST /api/assignments/[id]/upload:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
