'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage, FormikHelpers, useField } from 'formik';
import * as Yup from 'yup';

// Interface for tenant data
interface Tenant {
  tenant_id: string;
  name: string;
  email: string;
  contact_no: string;
  address: string;
  image_url: string;
  license_type?: string;
  valid_to?: string;
}

// Interface for form values
interface Tenant {
  tenant_id: string;
  name: string;
  email: string;
  contact_no: string;
  address: string;
  image_url: string;
  license_type?: string;
  valid_to?: string;
}

interface RegistrationFormValues {
  tenantId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  password: string;
  confirmPassword: string;
  maritalStatus: string;
  address: string;
  gender: string;
  course: string;
  state: string;
  district: string;
  mandal: string;
  schoolCorrespondentName: string;
  schoolCorrespondentPhone: string;
  schoolCorrespondentEmail: string;
}

// Interface for form field props
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  as?: 'input' | 'select' | 'textarea';
  options?: string[];
  disabled?: boolean;
  min?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

// Reusable form field component
const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  as = 'input',
  options = [],
  disabled = false,
  min,
  onChange,
  className = '',
  children,
}) => {
  const [field, meta] = useField(name);
  
  const baseClasses = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200 sm:text-sm p-3 border";
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e);
    }
    field.onChange(e);
  };

  const inputProps = {
    ...field,
    id: name,
    className: `${baseClasses} ${meta.touched && meta.error ? 'border-red-500' : ''}`,
    disabled: disabled,
    min: min,
    type: type
  };
  
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {!children && ['select', 'input', 'textarea'].includes(as) && '*'}
      </label>
      
      <div className="mt-1">
        {as === 'input' && (
          <input {...inputProps} />
        )}
        
        {as === 'select' && (
          <select
            {...inputProps}
            onChange={handleChange}
          >
            {children || (
              <>
                <option value="">Select {label}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </>
            )}
          </select>
        )}
        
        {as === 'textarea' && (
          <textarea
            {...inputProps}
            rows={3}
            className={`${baseClasses} h-24`}
          />
        )}
      </div>
      
      {meta.touched && meta.error && (
        <p className="mt-1 text-sm text-red-600">{meta.error}</p>
      )}
    </div>
  );
};

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initialValues: RegistrationFormValues = {
    tenantId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    mobileNo: '',
    email: '',
    password: '',
    confirmPassword: '',
    maritalStatus: '',
    address: '',
    gender: '',
    course: 'Award Nomination',
    state: '',
    district: '',
    mandal: '',
    schoolCorrespondentName: '',
    schoolCorrespondentPhone: '',
    schoolCorrespondentEmail: '',
  };

  const validationSchema = Yup.object().shape({
    tenantId: Yup.string().required('Please select a tenant'),
    firstName: Yup.string().required('First name is required'),
    middleName: Yup.string(),
    lastName: Yup.string().required('Last name is required'),
    mobileNo: Yup.string()
      .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
      .required('Mobile number is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), undefined], 'Passwords must match')
      .required('Please confirm your password'),
    maritalStatus: Yup.string().required('Marital status is required'),
    address: Yup.string().required('Address is required'),
    gender: Yup.string().required('Gender is required'),
    course: Yup.string().required('Course is required'),
    state: Yup.string().required('State is required'),
    district: Yup.string().required('District is required'),
    mandal: Yup.string().required('Mandal is required'),
    schoolCorrespondentName: Yup.string().required('School correspondent name is required'),
    schoolCorrespondentPhone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
      .required('School correspondent phone is required'),
    schoolCorrespondentEmail: Yup.string()
      .email('Invalid email')
      .required('School correspondent email is required'),
  });

  // Load states and tenants on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch states and tenants in parallel
        const [statesResponse, tenantsResponse] = await Promise.all([
          fetch('/api/register/states').catch(err => {
            console.error('Error fetching states:', err);
            return { ok: false, json: () => ({ success: false, error: 'Failed to load states' })};
          }),
          // Fetch tenants with active licenses
          fetch('/api/public/tenants', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }).catch(err => {
            console.error('Error fetching tenants:', err);
            return { ok: false, json: () => ({ success: false, error: 'Failed to load organizations' })};
          })
        ]);

        const statesData = await statesResponse.json();
        const tenantsData = await tenantsResponse.json();

        if (statesData.success) {
          setStates(statesData.data);
        } else {
          console.error('States API error:', statesData.error);
          setError(statesData.error || 'Failed to load states');
        }

        if (tenantsData.success) {
          console.log('Successfully loaded tenants:', tenantsData.data);
          setTenants(tenantsData.data);
        } else {
          console.error('Tenants API error:', tenantsData.error);
          // Don't show error for tenants as it's not critical for registration
          // Just log it and continue with an empty tenants list
          setTenants([]);
        }
      } catch (err) {
        console.error('Unexpected error in fetchInitialData:', err);
        setError('Error loading data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const loadDistricts = async (state: string) => {
    if (!state) return;
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/register/districts?state=${encodeURIComponent(state)}`
      );
      const data = await response.json();
      if (data.success) {
        setDistricts(data.data);
      } else {
        setError(data.error || 'Failed to load districts');
      }
    } catch (err) {
      setError('Error loading districts. Please try again.');
      console.error('Error loading districts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMandals = async (district: string) => {
    if (!district) return;
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/register/mandals?district=${encodeURIComponent(district)}`
      );
      const data = await response.json();
      if (data.success) {
        setMandals(data.data);
      } else {
        setError(data.error || 'Failed to load mandals');
      }
    } catch (err) {
      setError('Error loading mandals. Please try again.');
      console.error('Error loading mandals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    const state = e.target.value;
    setFieldValue('state', state);
    setFieldValue('district', '');
    setFieldValue('mandal', '');
    setDistricts([]);
    setMandals([]);
    if (state) {
      await loadDistricts(state);
    }
  };

  const handleDistrictChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    const district = e.target.value;
    setFieldValue('district', district);
    setFieldValue('mandal', '');
    setMandals([]);
    if (district) {
      await loadMandals(district);
    }
  };

  const handleSubmit = async (
    values: RegistrationFormValues,
    { setSubmitting, setFieldError }: FormikHelpers<RegistrationFormValues>
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a copy of values to avoid mutating the original
      const { confirmPassword, ...submitData } = values;
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        const registrationId = data.data.id;
        sessionStorage.setItem('registrationId', registrationId);
        router.push(`/payment/new?registrationId=${registrationId}`);
      } else {
        // Check if this is an email already exists error
        if (data.field === 'email') {
          setFieldError('email', data.message || 'This email is already registered');
          // Scroll to the email field
          document.getElementById('email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setError(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">Registration Form</h1>
          <p className="mt-3 text-gray-600">
            Please fill in your details to complete your registration.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl rounded-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, setFieldValue, isSubmitting }) => (
                <Form className="space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Personal Information
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-1">
                        <FormField
                          label="First Name"
                          name="firstName"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Middle Name (Optional)"
                          name="middleName"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Last Name"
                          name="lastName"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Mobile Number"
                          name="mobileNo"
                          type="tel"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <Field
                            id="email"
                            name="email"
                            type="email"
                            className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200 sm:text-sm p-3 border ${
                              errors.email && touched.email ? 'border-red-500' : ''
                            }`}
                            placeholder="Enter your email"
                          />
                          <ErrorMessage name="email">
                            {(msg) => (
                              <p className="mt-1 text-sm text-red-600">{msg}</p>
                            )}
                          </ErrorMessage>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Password"
                          name="password"
                          type="password"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Confirm Password"
                          name="confirmPassword"
                          type="password"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <FormField
                          label="Select Tenant"
                          name="tenantId"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="">Select Tenant</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.tenant_id} value={tenant.tenant_id}>
                              {tenant.name} ({tenant.license_type || 'No License'})
                            </option>
                          ))}
                        </FormField>
                      </div>
                    </div>
                  </div>

                  {/* Personal Details Section */}
                  <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Personal Details
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-1">
                        <FormField
                          label="Gender"
                          name="gender"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </FormField>
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Marital Status"
                          name="maritalStatus"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="">Select Marital Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </FormField>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <FormField
                          label="Address"
                          name="address"
                          as="textarea"
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="State"
                          name="state"
                          as="select"
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleStateChange(e, setFieldValue)
                          }
                          disabled={isLoading}
                          options={states}
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="District"
                          name="district"
                          as="select"
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleDistrictChange(e, setFieldValue)
                          }
                          disabled={!values.state || isLoading}
                          options={districts}
                          className="bg-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Mandal"
                          name="mandal"
                          as="select"
                          disabled={!values.district || isLoading}
                          options={mandals}
                          className="bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 01.287.193l4.5 4.5a1 1 0 01-1.414 1.414l-4.12-4.121-5.7 2.442a1 1 0 01-1.292-.414l-3-5a1 1 0 01.24-1.25l7-6z"
                          />
                          <path
                            d="M3.5 16.5l3.5-1.5 4.5 4.5 3.5-1.5-1.5-3.5 4.5-4.5-1.5-3.5-3.5 1.5-4.5-4.5-1.5 3.5-4.5 4.5 1.5 3.5z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Professional Information
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-1">
                        <FormField
                          label="Designation"
                          name="designation"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="">Select Designation</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Headmaster">Headmaster</option>
                          <option value="Principal">Principal</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Professor">Professor</option>
                          <option value="Other">Other</option>
                        </FormField>
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Highest Class You Teach"
                          name="highestClassITeach"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="">Select Class</option>
                          <option value="1st">1st</option>
                          <option value="2nd">2nd</option>
                          <option value="3rd">3rd</option>
                          <option value="4th">4th</option>
                          <option value="5th">5th</option>
                          <option value="6th">6th</option>
                          <option value="7th">7th</option>
                          <option value="8th">8th</option>
                          <option value="9th">9th</option>
                          <option value="10th">10th</option>
                          <option value="Inter">Inter</option>
                          <option value="Degree">Degree</option>
                          <option value="PG">PG</option>
                        </FormField>
                      </div>
                      <div className="space-y-1">
                        <FormField
                          label="Course Interested In"
                          name="course"
                          as="select"
                          className="bg-white rounded-lg"
                        >
                          <option value="Award Nomination">
                            Award Nomination
                          </option>
                        </FormField>
                      </div>
                    </div>
                  </div>

                  {/* School Correspondent Information */}
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                      School Correspondent Information
                    </h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-6">
                        <FormField
                          label="Correspondent Name"
                          name="schoolCorrespondentName"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FormField
                          label="Correspondent Phone"
                          name="schoolCorrespondentPhone"
                          type="tel"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FormField
                          label="Correspondent Email"
                          name="schoolCorrespondentEmail"
                          type="email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 space-y-4">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm mb-3">Already have an account?</p>
                      <a 
                        href="/event-scheduler/login" 
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mb-4"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Login to Event Scheduler
                      </a>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSubmitting || isLoading}
                      >
                        {isSubmitting || isLoading ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg
                              className="-ml-1 mr-2 h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Register Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
