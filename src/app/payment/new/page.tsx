'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Image from 'next/image';
import Link from 'next/link';

interface PaymentFormValues {
  utrNumber: string;
  screenshot: File | null;
  'screenshot-upload'?: FileList | null;
}

const paymentSchema = Yup.object().shape({
  utrNumber: Yup.string()
    .required('UTR number is required')
    .matches(/^[0-9]{12}$/, 'UTR number must be exactly 12 digits'),
  screenshot: Yup.mixed<File>()
    .required('Payment screenshot is required')
    .test('fileSize', 'File size is too large (max 2MB)', (value) => {
      if (!(value instanceof File)) return false;
      return value.size <= 2 * 1024 * 1024; // 2MB
    })
    .test('fileType', 'Only image files are allowed', (value) => {
      if (!(value instanceof File)) return false;
      return ['image/jpeg', 'image/png', 'image/jpg'].includes(value.type);
    }),
});

export default function PaymentPage() {
  const router = useRouter();
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get registration ID from session storage
    const storedId = sessionStorage.getItem('registrationId');
    if (!storedId) {
      // Redirect to registration if no registration ID found
      router.push('/register');
    } else {
      setRegistrationId(storedId);
    }
  }, [router]);

  const handleSubmit = async (values: PaymentFormValues) => {
    if (!registrationId) {
      setError('No registration found. Please complete registration first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Starting payment submission...');
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('utrNumber', values.utrNumber);
      formData.append('registrationId', registrationId);
      
      if (values.screenshot) {
        console.log('Adding screenshot to form data');
        formData.append('file', values.screenshot);
      } else {
        console.log('No screenshot provided');
      }

      console.log('Sending payment request to API...');
      const response = await fetch('/api/payments', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with the correct boundary
      });

      const result = await response.json();
      console.log('API response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `Payment submission failed: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Payment submission was not successful');
      }

      console.log('Payment successful, redirecting to success page...');
      // Clear the registration ID from session storage
      sessionStorage.removeItem('registrationId');
      
      // Redirect to success page with the registration ID
      router.push(`/payment/success?id=${result.registrationId || registrationId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Payment submission error:', errorMessage, err);
      setError(errorMessage);
      
      // Log additional error details if available
      if (err instanceof Error && 'cause' in err) {
        console.error('Error cause:', err.cause);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please scan the QR code below to make the payment and provide the transaction details.
          </p>
        </div>

        {/* QR Code and Payment Instructions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/qr_code.jpeg" 
                alt="Payment QR Code" 
                className="h-64 w-64 object-contain border border-gray-200 rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-600 mb-2">Scan the QR code to make payment</p>
            <div className="bg-gray-50 p-4 rounded-md text-left">
              <p className="text-sm font-medium text-gray-900 mb-1">Payment Details:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Amount:</div>
                <div className="font-medium">₹500.00</div>
                <div>UPI ID:</div>
                <div className="font-mono">example@upi</div>
                <div>Name:</div>
                <div>Your Organization Name</div>
              </div>
            </div>
          </div>
        </div>


        <Formik
          initialValues={{
            utrNumber: '',
            screenshot: null,
            'screenshot-upload': null,
          }}
          validationSchema={paymentSchema}
          onSubmit={handleSubmit}
        >
          {({ setFieldValue, values }) => (
            <Form className="space-y-6">
              <div>
                <label
                  htmlFor="utrNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  UTR Number *
                </label>
                <Field
                  type="text"
                  name="utrNumber"
                  id="utrNumber"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="Enter UTR number from your bank"
                />
                <ErrorMessage
                  name="utrNumber"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="screenshot"
                  className="block text-sm font-medium text-gray-700"
                >
                  Payment Screenshot *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {previewUrl ? (
                      <div className="relative">
                        <Image
                          src={previewUrl}
                          alt="Payment screenshot preview"
                          width={300}
                          height={200}
                          className="mx-auto max-h-48 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(null);
                            setFieldValue('screenshot', null);
                            setFieldValue('screenshot-upload', null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="screenshot-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="screenshot-upload"
                              name="screenshot-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                if (file) {
                                  setFieldValue('screenshot', file);
                                  setFieldValue('screenshot-upload', event.currentTarget.files);
                                  setPreviewUrl(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 2MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <ErrorMessage
                  name="screenshot"
                  component="div"
                  className="text-red-500 text-xs mt-1"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
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
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Submit Payment'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
