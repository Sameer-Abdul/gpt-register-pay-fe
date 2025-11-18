import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    
    // Log the received form data (excluding password for security)
    const { password, ...loggableData } = formData;
    console.log('Registration attempt with data:', {
      ...loggableData,
      password: password ? '***' : 'not provided'
    });
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'mobileNo', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          fields: missingFields,
          message: `Please provide all required fields: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(formData.password, salt);

    // Insert the registration data into the database
    const result = await query(
      `INSERT INTO register (
        first_name, middle_name, last_name, mobile_no, email, 
        marital_status, address, gender, course, state, 
        district, mandal, designation, highest_class_i_teach,
        school_correspondent_name, school_correspondent_phone, school_correspondent_email,
        password_hash, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        formData.firstName,
        formData.middleName || null,
        formData.lastName,
        formData.mobileNo,
        formData.email,
        formData.maritalStatus,
        formData.address,
        formData.gender,
        formData.course,
        formData.state,
        formData.district,
        formData.mandal,
        formData.designation,
        formData.highestClassITeach,
        formData.schoolCorrespondentName,
        formData.schoolCorrespondentPhone,
        formData.schoolCorrespondentEmail,
        hashedPassword,
        formData.tenantId || 'T1' // Default to T1 if not provided for backward compatibility
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id }
    });
  } catch (error: any) {
    // Log the complete error for debugging
    console.error('Registration error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      rawError: process.env.NODE_ENV === 'development' ? error : undefined
    });
    
    // Handle database errors
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.constraint === 'register_email_key') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already registered',
            field: 'email',
            message: 'This email address is already registered. Please use a different email or log in.'
          },
          { status: 400 }
        );
      }
      // Add other constraint violations here if needed
    }
    
    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error',
          message: 'Unable to connect to the database. Please try again later.'
        },
        { status: 503 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError' || error.status === 400) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation Error',
          message: error.message || 'Invalid input data',
          fields: error.fields
        },
        { status: 400 }
      );
    }
    
    // Default error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An error occurred while processing your registration. Please try again.'
      },
      { status: 500 }
    );
  }
}
