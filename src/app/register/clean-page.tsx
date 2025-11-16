'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';

// Define the form values interface
interface RegistrationFormValues {
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  address: string;
  gender: string;
  maritalStatus: string;
  state: string;
  district: string;
  mandal: string;
  designation: string;
  subject: string;
  experience: string;
  tenantId: string;
}

// Validation schema
const registrationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  mobileNo: Yup.string()
    .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
    .required('Mobile number is required'),
  address: Yup.string().required('Address is required'),
  gender: Yup.string().required('Gender is required'),
  maritalStatus: Yup.string().required('Marital status is required'),
  state: Yup.string().required('State is required'),
  district: Yup.string().when('state', {
    is: (state: string) => state,
    then: (schema) => schema.required('District is required'),
  }),
  mandal: Yup.string().when('district', {
    is: (district: string) => district,
    then: (schema) => schema.required('Mandal is required'),
  }),
  designation: Yup.string().required('Designation is required'),
  subject: Yup.string().required('Subject is required'),
  experience: Yup.string().required('Experience is required'),
  tenantId: Yup.string().required('Tenant ID is required'),
});

// Mock data - in a real app, these would come from an API
const states = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu'];
const districtsByState: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'],
  'Telangana': ['Hyderabad', 'Rangareddy', 'Medchal', 'Sangareddy'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem']
};

const mandalsByDistrict: Record<string, string[]> = {
  'Hyderabad': ['Kukatpally', 'Miyapur', 'Gachibowli', 'Hitech City'],
  'Rangareddy': ['Shamshabad', 'Rajendranagar', 'Maheshwaram', 'Ibrahimpatnam'],
  'Visakhapatnam': ['Gajuwaka', 'Anakapalle', 'Bheemili', 'Pendurthi'],
  'Bangalore': ['Whitefield', 'Electronic City', 'Marathahalli', 'Yelahanka']
};

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);

  const initialValues: RegistrationFormValues = {
    firstName: '',
    lastName: '',
    email: '',
    mobileNo: '',
    address: '',
    gender: '',
    maritalStatus: '',
    state: '',
    district: '',
    mandal: '',
    designation: '',
    subject: '',
    experience: '',
    tenantId: 'TENANT_001', // In a real app, this would come from your tenant management system
  };

  const handleStateChange = (state: string, setFieldValue: (field: string, value: any) => void) => {
    setFieldValue('state', state);
    setFieldValue('district', '');
    setFieldValue('mandal', '');
    setDistricts(districtsByState[state] || []);
    setMandals([]);
  };

  const handleDistrictChange = (district: string, setFieldValue: (field: string, value: any) => void) => {
    setFieldValue('district', district);
    setFieldValue('mandal', '');
    setMandals(mandalsByDistrict[district] || []);
  };

  const handleSubmit = async (
    values: RegistrationFormValues,
    { setSubmitting }: FormikHelpers<RegistrationFormValues>
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      
      // Store registration ID in session storage for the payment step
      sessionStorage.setItem('registrationId', data.registrationId);
      
      // Redirect to payment page
      router.push('/payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Registration Form</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please fill in your details to complete your registration.
          </p>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={registrationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name *
                  </label>
                  <Field
                    type="text"
                    name="firstName"
                    id="firstName"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="firstName" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name *
                  </label>
                  <Field
                    type="text"
                    name="lastName"
                    id="lastName"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="lastName" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Mobile Number */}
                <div className="md:col-span-2">
                  <label htmlFor="mobileNo" className="block text-sm font-medium text-gray-700">
                    Mobile Number *
                  </label>
                  <Field
                    type="tel"
                    name="mobileNo"
                    id="mobileNo"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Enter 10-digit mobile number"
                  />
                  <ErrorMessage name="mobileNo" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address *
                  </label>
                  <Field
                    as="textarea"
                    name="address"
                    id="address"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="address" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                    Gender *
                  </label>
                  <Field
                    as="select"
                    name="gender"
                    id="gender"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </Field>
                  <ErrorMessage name="gender" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Marital Status */}
                <div>
                  <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700">
                    Marital Status *
                  </label>
                  <Field
                    as="select"
                    name="maritalStatus"
                    id="maritalStatus"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </Field>
                  <ErrorMessage name="maritalStatus" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <Field
                    as="select"
                    name="state"
                    id="state"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      handleStateChange(e.target.value, (field, value) => setFieldValue(field, value))
                    }
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="state" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* District */}
                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                    District *
                  </label>
                  <Field
                    as="select"
                    name="district"
                    id="district"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    disabled={!values.state}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      handleDistrictChange(e.target.value, (field, value) => setFieldValue(field, value))
                    }
                  >
                    <option value="">Select District</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="district" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Mandal */}
                <div>
                  <label htmlFor="mandal" className="block text-sm font-medium text-gray-700">
                    Mandal *
                  </label>
                  <Field
                    as="select"
                    name="mandal"
                    id="mandal"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    disabled={!values.district}
                  >
                    <option value="">Select Mandal</option>
                    {mandals.map((mandal) => (
                      <option key={mandal} value={mandal}>
                        {mandal}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="mandal" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Designation */}
                <div className="md:col-span-2">
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                    Designation *
                  </label>
                  <Field
                    type="text"
                    name="designation"
                    id="designation"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="designation" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Subject */}
                <div className="md:col-span-2">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject *
                  </label>
                  <Field
                    type="text"
                    name="subject"
                    id="subject"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="subject" component="div" className="text-red-500 text-xs mt-1" />
                </div>

                {/* Experience */}
                <div className="md:col-span-2">
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                    Experience (years) *
                  </label>
                  <Field
                    type="number"
                    name="experience"
                    id="experience"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                  <ErrorMessage name="experience" component="div" className="text-red-500 text-xs mt-1" />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting || isLoading ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
