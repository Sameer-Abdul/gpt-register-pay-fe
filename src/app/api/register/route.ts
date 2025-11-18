import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

interface RegisterFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  mobileNo: string;
  email: string;
  password: string;
  maritalStatus: string;
  address: string;
  gender: string;
  course?: string;
  state: string;
  district: string;
  mandal: string;
  designation: string;
  highestClassITeach: string;
  schoolCorrespondentName: string;
  schoolCorrespondentPhone: string;
  schoolCorrespondentEmail: string;
  tenantId?: string;
  locationId?: number;
}

export async function POST(request: Request) {
  let formData: RegisterFormData = {} as RegisterFormData;
  try {
    formData = await request.json();
    
    // Log the received form data (excluding password for security)
    const { password, ...loggableData } = formData;
    console.log('Registration attempt with data:', {
      ...loggableData,
      password: password ? '***' : 'not provided'
    });
    
    // Validate required fields based on database schema
    const requiredFields = [
      'firstName', 'lastName', 'mobileNo', 'email', 'password',
      'maritalStatus', 'address', 'gender', 'state', 'district',
      'mandal', 'designation', 'highestClassITeach',
      'schoolCorrespondentName', 'schoolCorrespondentPhone', 'schoolCorrespondentEmail'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = formData[field as keyof RegisterFormData];
      return value === undefined || value === null || value === '';
    });
    
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
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start a transaction to ensure data consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if tenant exists if tenantId is provided
      if (formData.tenantId) {
        const tenantCheck = await client.query(
          'SELECT 1 FROM tenant_master WHERE tenant_id = $1',
          [formData.tenantId]
        );
        if (tenantCheck.rows.length === 0) {
          throw new Error(`Tenant with ID ${formData.tenantId} does not exist`);
        }
      }

      // Check if location exists if locationId is provided
      if (formData.locationId) {
        const locationCheck = await client.query(
          'SELECT 1 FROM locations WHERE id = $1',
          [formData.locationId]
        );
        if (locationCheck.rows.length === 0) {
          throw new Error(`Location with ID ${formData.locationId} does not exist`);
        }
      }

      // Insert the registration data into the database
      const result = await client.query(
        `INSERT INTO register (
          first_name, middle_name, last_name, mobile_no, email, 
          marital_status, address, gender, course, state, 
          district, mandal, designation, highest_class_i_teach,
          school_correspondent_name, school_correspondent_phone, school_correspondent_email,
          password_hash, tenant_id, location_id, role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
          formData.course || 'Award Nomination',
          formData.state,
          formData.district,
          formData.mandal,
          formData.designation,
          formData.highestClassITeach,
          formData.schoolCorrespondentName,
          formData.schoolCorrespondentPhone,
          formData.schoolCorrespondentEmail,
          hashedPassword,
          formData.tenantId || 'T1',
          formData.locationId || null,
          'user' // Default role
        ]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { id: result.rows[0].id }
      });
    } catch (dbError: any) {
      await client.query('ROLLBACK');
      throw dbError; // This will be caught by the outer catch block
    } finally {
      client.release();
    }
  } catch (error: any) {
    // Log the complete error for debugging
    const errorDetails = {
      name: error.name,
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      schema: error.schema,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    
    console.error('Registration error:', errorDetails);
    
    // Log the form data that caused the error (without password)
    if (formData) {
      const { password, ...safeFormData } = formData;
      console.error('Form data that caused the error:', safeFormData);
    }
    
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
