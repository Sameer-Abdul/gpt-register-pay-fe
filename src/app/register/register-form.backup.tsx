'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage, FormikHelpers, useField } from 'formik';
import * as Yup from 'yup';

// Interface for form values
interface RegistrationFormValues {
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
  designation: string;
  highestClassITeach: string;
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
  const baseClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border";
  
  // Use Formik's useField hook to get field and meta
  const [field, meta] = useField(name);
  
  // Handle select change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e);
    }
    field.onChange(e);
  };

  const inputProps = {
    ...field,
    id: name,
    className: baseClasses,
    disabled: disabled,
    min: min,
    type: type
  };
  
  return (
    <div className={`${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {!children && ['select', 'input', 'textarea'].includes(as) && '*'}
      </label>
      
      <div className="mt-1">
        {as === 'input' && (
          <input
            {...inputProps}
          />
        )}
        
        {as === 'select' && (
          <select
            {...inputProps}
            onChange={handleChange}
            className={`${baseClasses} ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select {label}</option>
            {Array.isArray(options) && options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {children}
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: RegistrationFormValues = {
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
    designation: '',
    highestClassITeach: '',
    schoolCorrespondentName: '',
    schoolCorrespondentPhone: '',
    schoolCorrespondentEmail: '',
  };

  const validationSchema = Yup.object().shape({
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
    district: Yup.string().when('state', {
      is: (state: string) => !!state,
      then: (schema) => schema.required('District is required'),
    }),
    mandal: Yup.string().when('district', {
      is: (district: string) => !!district,
      then: (schema) => schema.required('Mandal is required'),
    }),
    designation: Yup.string().required('Designation is required'),
    highestClassITeach: Yup.string().required('Highest class you teach is required'),
    schoolCorrespondentName: Yup.string().required('School correspondent name is required'),
    schoolCorrespondentPhone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
      .required('School correspondent phone is required'),
    schoolCorrespondentEmail: Yup.string()
      .email('Invalid email')
      .required('School correspondent email is required'),
  });

  // Load states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/register/states');
        const data = await response.json();
        if (data.success) {
          setStates(data.data);
        } else {
          setError(data.error || 'Failed to load states');
        }
      } catch (err) {
        setError('Error loading states. Please try again later.');
        console.error('Error loading states:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStates();
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

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>, setFieldValue: (field: string, value: any) => void) => {
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

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>, setFieldValue: (field: string, value: any) => void) => {
    const district = e.target.value;
    setFieldValue('district', district);
    setFieldValue('mandal', '');
    setMandals([]);
    if (district) {
      await loadMandals(district);
    }
  };

  const handleSubmit = async (values: RegistrationFormValues, { setSubmitting }: FormikHelpers<RegistrationFormValues>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a copy of values to avoid mutating the original
      const { confirmPassword, ...submitData } = values;
      
      // The password will be hashed on the server side
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
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Registration Form</h1>
          <p className="mt-2 text-sm text-gray-600">Please fill in your details to complete your registration.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, setFieldValue, isSubmitting }: {
                values: RegistrationFormValues;
                setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
                isSubmitting: boolean;
              }) => (
                <Form className="space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="First Name" name="firstName" />
                        <FormField label="Middle Name (Optional)" name="middleName" />
                        <FormField label="Last Name" name="lastName" />
                        <FormField
                          label="Mobile Number"
                          name="mobileNo"
                          type="tel"
                        />
                        <FormField 
                          label="Email" 
                          name="email" 
                          type="email"
                        />
                        <FormField 
                          label="Password" 
                          name="password" 
                          type="password"
                        />
                        <FormField 
                          label="Confirm Password" 
                          name="confirmPassword" 
                          type="password"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Details Section */}
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Personal Details</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <FormField
                          label="Gender"
                          name="gender"
                          as="select"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </FormField>
                      </div>
                      <div className="sm:col-span-3">
                        <FormField
                          label="Marital Status"
                          name="maritalStatus"
                          as="select"
                        >
                          <option value="">Select Marital Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </FormField>
                      </div>
                      <div className="sm:col-span-6">
                        <FormField
                          label="Address"
                          name="address"
                          as="textarea"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FormField
                          label="District"
                          name="district"
                          as="select"
                          options={districts}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FormField
                          label="Mandal"
                          name="mandal"
                          as="select"
                          disabled={!values.district || isLoading}
                          options={mandals}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <FormField
                          label="Course"
                          name="course"
                          type="text"
                          disabled={true}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <FormField
                          label="Designation"
                          name="designation"
                          type="text"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <FormField
                          label="Highest Class You Teach"
                          name="highestClassITeach"
                          type="text"
                        />
                      </div>
                    </div>
                  </div>

                  {/* School Correspondent Details */}
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">School Correspondent Details</h2>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-6">
                        <FormField
                          label="School Correspondent Name"
                          name="schoolCorrespondentName"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <ErrorMessage name="schoolCorrespondentName" component="div" className="text-red-500 text-sm" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">School Correspondent Phone</label>
                        <Field
                          type="tel"
                          name="schoolCorrespondentPhone"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <ErrorMessage name="schoolCorrespondentPhone" component="div" className="text-red-500 text-sm" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">School Correspondent Email</label>
                        <Field
                          type="email"
                          name="schoolCorrespondentEmail"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <ErrorMessage name="schoolCorrespondentEmail" component="div" className="text-red-500 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || isLoading ? 'Submitting...' : 'Submit'}
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