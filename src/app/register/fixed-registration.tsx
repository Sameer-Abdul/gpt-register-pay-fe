'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';

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

const validationSchema = Yup.object().shape({
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
    is: (state: string) => !!state,
    then: (schema) => schema.required('District is required'),
  }),
  mandal: Yup.string().when('district', {
    is: (district: string) => !!district,
    then: (schema) => schema.required('Mandal is required'),
  }),
  designation: Yup.string().required('Designation is required'),
  subject: Yup.string().required('Subject is required'),
  experience: Yup.string().required('Experience is required'),
  tenantId: Yup.string().required('Tenant ID is required'),
});

const states = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Kerala',
  'Maharashtra',
];

const districtsByState: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'],
  'Telangana': ['Hyderabad', 'Rangareddy', 'Medchal', 'Sangareddy'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
};

const mandalsByDistrict: Record<string, string[]> = {
  'Hyderabad': ['Kukatpally', 'Miyapur', 'Gachibowli', 'Hitech City'],
  'Rangareddy': ['Shamshabad', 'Rajendranagar', 'Maheshwaram', 'Ibrahimpatnam'],
  'Visakhapatnam': ['Gajuwaka', 'Anakapalle', 'Bheemili', 'Pendurthi'],
  'Bangalore': ['Whitefield', 'Electronic City', 'Marathahalli', 'Yelahanka'],
};

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableMandals, setAvailableMandals] = useState<string[]>([]);

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
    tenantId: 'TENANT_001',
  };

  const handleStateChange = (state: string, setFieldValue: (field: string, value: any) => void) => {
    setFieldValue('state', state);
    setFieldValue('district', '');
    setFieldValue('mandal', '');
    setAvailableDistricts(districtsByState[state] || []);
    setAvailableMandals([]);
  };

  const handleDistrictChange = (district: string, setFieldValue: (field: string, value: any) => void) => {
    setFieldValue('district', district);
    setFieldValue('mandal', '');
    setAvailableMandals(mandalsByDistrict[district] || []);
  };

  const handleSubmit = async (
    values: RegistrationFormValues,
    { setSubmitting }: FormikHelpers<RegistrationFormValues>
  ) => {
    try {
      setIsSubmitting(true);
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
      sessionStorage.setItem('registrationId', data.registrationId);
      router.push('/payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-md">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
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
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting: formikIsSubmitting, setFieldValue, values }) => (
            <Form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                  
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

                  <div>
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

                  <div>
                    <label htmlFor="mobileNo" className="block text-sm font-medium text-gray-700">
                      Mobile Number *
                    </label>
                    <Field
                      type="tel"
                      name="mobileNo"
                      id="mobileNo"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      placeholder="1234567890"
                    />
                    <ErrorMessage name="mobileNo" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

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
                </div>

                {/* Address & Professional Information */}
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-gray-900">Address & Professional Details</h2>
                  
                  <div>
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
                        handleStateChange(e.target.value, setFieldValue)
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

                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                      District *
                    </label>
                    <Field
                      as="select"
                      name="district"
                      id="district"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={!values.state}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleDistrictChange(e.target.value, setFieldValue)
                      }
                    >
                      <option value="">Select District</option>
                      {availableDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="district" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="mandal" className="block text-sm font-medium text-gray-700">
                      Mandal *
                    </label>
                    <Field
                      as="select"
                      name="mandal"
                      id="mandal"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={!values.district}
                    >
                      <option value="">Select Mandal</option>
                      {availableMandals.map((mandal) => (
                        <option key={mandal} value={mandal}>
                          {mandal}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="mandal" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
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

                  <div>
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

                  <div>
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
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={formikIsSubmitting || isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {formikIsSubmitting || isSubmitting ? 'Processing...' : 'Submit Registration'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
