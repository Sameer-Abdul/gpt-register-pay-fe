import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { Buffer } from 'buffer';

type Assignment = {
  id: number;
  file_data: { type: string; data: number[] };
  context: string;
  rating: number | null;
  user_email: string;
};

// Helper to parse PDF buffer
const parsePdf = async (buffer: Buffer): Promise<string> => {
  try {
    // Use require for CommonJS modules
    const pdf = require('pdf-parse');
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF');
  }
};

// Helper to handle database queries
const query = async (text: string, params?: any[]) => {
  try {
    const result = await sql.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Database operation failed');
  }
};

// Helper to make HTTP requests to Ollama
const analyzeWithOllama = async (prompt: string) => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ollama API error:', error);
    throw new Error('Failed to analyze with Ollama');
  }
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const userResult = await sql`
      SELECT is_admin FROM register WHERE email = ${session.user.email}
    `;
    
    if (!userResult.rows[0]?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Get assignment data
    const assignmentResult = await sql`
      SELECT * FROM assignments WHERE id = ${params.id}
    `;
    
    if (!assignmentResult.rows.length) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }
    
    const assignment = assignmentResult.rows[0];
    
    // Convert file_data to Buffer
    const fileBuffer = Buffer.from(assignment.file_data.data);
    
    // Parse PDF content
    const pdfText = await parsePdf(fileBuffer);
    
    // Prepare prompt for Ollama
    const prompt = `Analyze the following assignment and provide a rating from 0-10 based on quality, clarity, and completeness. 
    Only respond with the numeric rating between 0-10, nothing else.\n\n${pdfText}`;
    
    // Call Ollama API
    const ollamaResponse = await analyzeWithOllama(prompt);
    
    // Extract numeric rating from response
    const ratingMatch = ollamaResponse.response?.match(/\d+/);
    const rating = ratingMatch ? Math.min(10, Math.max(0, parseInt(ratingMatch[0], 10))) : 5;
    
    // Update assignment with new rating
    await sql`
      UPDATE assignments 
      SET rating = ${rating}
      WHERE id = ${params.id}
    `;
    
    return NextResponse.json({ 
      success: true, 
      rating,
      score: rating * 10 // Convert to percentage for display
    });
    
  } catch (error: unknown) {
    console.error('Error in AI analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
      return NextResponse.json(
        { error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    // Get the assignment with file data
    const assignmentResult = await pool.query(
      `SELECT a.*, r.email as user_email 
       FROM assignments a
       JOIN register r ON a.register_id = r.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = assignmentResult.rows[0];
    
    if (!assignment.file_data) {
      return NextResponse.json(
        { error: 'No file data available for analysis' },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let pdfText;
    try {
      const data = await pdfParse(assignment.file_data);
      pdfText = data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return NextResponse.json(
        { error: 'Failed to parse PDF file' },
        { status: 400 }
      );
    }

    // Call Ollama for analysis
    const prompt = `
      You are an evaluator AI.
      Compare the following PDF content with the given context.
      Context: "${assignment.context || 'No context provided'}"
      Content: "${pdfText.slice(0, 2000)}"
      
      Respond with only a number from 0 to 100 representing how closely the content matches the context.
      Consider:
      - Relevance to the context
      - Depth of content
      - Quality of information
      - Originality
      
      Return ONLY the number, no other text.
    `;

    console.log('Sending request to Ollama with prompt:', prompt);
    
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt,
      stream: false,
    });

    console.log('Received response from Ollama:', ollamaResponse.data);

    const matchStr = ollamaResponse.data.response.trim();
    const match = parseFloat(matchStr);

    if (isNaN(match)) {
      console.error('Failed to parse AI response as number:', matchStr);
      return NextResponse.json({
        error: 'AI failed to calculate score',
        rawResponse: matchStr
      });
    }

    if (match < 40) {
      return NextResponse.json({
        error: 'Assignment matter does not match with selected context',
        score: match
      });
    }

    const rating = Math.min(10, Math.round((match / 100) * 10));

    // Update the assignment with the new rating
    await pool.query(
      'UPDATE assignments SET rating = $1 WHERE id = $2',
      [rating, assignmentId]
    );

    return NextResponse.json({
      message: 'AI analysis completed',
      rating,
      score: match
    });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform AI analysis',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
