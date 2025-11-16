import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    
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
    console.error('Registration error:', error);
    
    // Check for unique constraint violation (duplicate email)
    if (error.code === '23505' && error.constraint === 'register_email_key') {
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
    
    // For other errors, return a generic error message
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process registration',
        message: 'An error occurred while processing your registration. Please try again.'
      },
      { status: 500 }
    );
  }
}
