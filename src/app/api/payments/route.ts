import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Route configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Disable body parsing for file uploads
export const maxDuration = 30; // seconds
export const fetchCache = 'force-no-store';

interface ErrorWithMessage extends Error {
  message: string;
}

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    // Parse the form data
    const formData = await request.formData();
    const utrNumber = formData.get('utrNumber') as string;
    const registrationId = formData.get('registrationId') as string;
    const file = formData.get('file');
    
    // Type-safe file info logging
    const fileInfo = file && file instanceof Blob ? {
      name: file instanceof File ? file.name : 'blob',
      type: file.type,
      size: file.size
    } : null;

    console.log('Received form data:', {
      utrNumber,
      registrationId,
      hasFile: !!file,
      fileType: fileInfo?.type,
      fileSize: fileInfo?.size
    });

    console.log('Received payment submission:', { 
      utrNumber, 
      registrationId,
      hasFile: !!file,
      fileInfo
    });

    if (!utrNumber || !registrationId) {
      throw new Error('UTR number and registration ID are required');
    }

    // Start transaction
    await client.query('BEGIN');

    try {
      // 1. Verify the registration exists and lock the row
      const userResult = await client.query(
        'SELECT id FROM register WHERE id = $1 FOR UPDATE',
        [registrationId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Registration not found');
      }

      const registerId = userResult.rows[0].id;
      console.log('Found registration:', registerId);

      // 2. Create payment record with all required fields
      const paymentId = uuidv4();
      console.log('Creating payment record with ID:', paymentId);
      
      // Using the correct column names from your database schema
      await client.query(
        `INSERT INTO payments (
          id, 
          register_id, 
          utr_number, 
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())`,
        [paymentId, registerId, utrNumber]
      );

      console.log('Payment record created successfully');

      // 3. Update registration with payment ID
      console.log('Updating registration with payment ID...');
      const updateResult = await client.query(
        `UPDATE register 
         SET utr_number = $1, 
             payment_id = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        [utrNumber, paymentId, registerId]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Failed to update registration with payment details');
      }

      console.log('Registration updated successfully');

      // 4. Handle file upload if present (outside of transaction)
      if (file && file instanceof Blob) {
        try {
          const bytes = await file.arrayBuffer();
          const fileBuffer = Buffer.from(bytes);
          
          // Ensure uploads directory exists
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
          try {
            await mkdir(uploadDir, { recursive: true });
            console.log(`Upload directory exists: ${uploadDir}`);
          } catch (dirError) {
            console.error('Error creating upload directory:', dirError);
            throw new Error('Failed to create upload directory');
          }
          
          // Get file extension from MIME type if name is not available
          let fileExtension = 'bin';
          if (file.type) {
            const ext = file.type.split('/').pop();
            if (ext) fileExtension = ext;
          }
          
          const fileName = `${paymentId}.${fileExtension}`;
          const filePath = path.join('uploads', 'payments', fileName);
          const fullPath = path.join(process.cwd(), 'public', filePath);
          
          console.log(`Saving file to: ${fullPath}`);
          
          await writeFile(fullPath, fileBuffer);
          
          // Store the file path in the payments table
          await client.query(
            `UPDATE payments 
             SET screenshot_path = $1,
                 screenshot_mime_type = $2,
                 original_filename = $3,
                 file_size = $4
             WHERE id = $5`,
            [filePath, file.type, file.name, file.size, paymentId]
          );
          
          // Also update the register table with the binary data, file path, and MIME type
          await client.query(
            `UPDATE register 
             SET payment_screenshot = $1,
                 screenshot_mime_type = $2,
                 payment_screenshot_path = $3,
                 utr_number = $4,
                 payment_id = $5,
                 updated_at = NOW()
             WHERE id = $6`,
            [fileBuffer, file.type, filePath, utrNumber, paymentId, registerId]
          );
          
          console.log('Updated register table with payment details');
          
          console.log('File uploaded and payment record updated with file path:', filePath);
        } catch (fileError) {
          console.error('File upload error (non-critical):', fileError);
          // Don't fail the request if file save fails
        }
      }

      // Verify the payment was actually created before committing
      const verifyPayment = await client.query(
        'SELECT id FROM payments WHERE id = $1',
        [paymentId]
      );
      
      if (verifyPayment.rows.length === 0) {
        throw new Error('Payment record verification failed - record not found before commit');
      }

      // Commit the transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      // Verify again after commit
      const postCommitVerify = await client.query(
        'SELECT id FROM payments WHERE id = $1',
        [paymentId]
      );
      
      if (postCommitVerify.rows.length === 0) {
        console.error('CRITICAL: Payment record disappeared after commit!');
      } else {
        console.log('Payment record verified after commit');
      }
      
      return NextResponse.json({
        success: true,
        registrationId: registerId,
        paymentId: paymentId,
        message: 'Payment processed successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
