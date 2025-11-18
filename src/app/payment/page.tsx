'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import Image from 'next/image';
import axios from 'axios';

interface FormValues {
  utrNumber: string;
  paymentScreenshot: File | null;
}

export default function PaymentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = sessionStorage.getItem('registrationId');
    if (!id) {
      router.push('/register');
    } else {
      setRegistrationId(id);
    }
  }, [router]);

  const initialValues: FormValues = {
    utrNumber: '',
    paymentScreenshot: null,
  };

  const validationSchema = Yup.object().shape({
  utrNumber: Yup.string()
    .required('UTR number is required')
    .matches(/^[a-zA-Z0-9]{12,20}$/, 'UTR number must be 12-20 alphanumeric characters'),
  paymentScreenshot: Yup.mixed<File>()
    .required('Payment screenshot is required')
    .test('fileSize', 'File size is too large (max 5MB)', (value) => {
      if (!(value instanceof File)) return false;
      return value.size <= 5 * 1024 * 1024; // 5MB
    })
    .test('fileType', 'Only image and PDF files are allowed', (value) => {
      if (!(value instanceof File)) return false;
      return ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(value.type);
    })
});

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    setSubmitError(null);
    setIsLoading(true);
    
    try {
      const registerId = sessionStorage.getItem('registrationId');
      if (!registerId) {
        throw new Error('No registration ID found. Please complete the registration first.');
      }

      if (!values.paymentScreenshot) {
        throw new Error('Payment screenshot is required');
      }

      // Debug: Log file details
      console.log('File details:', {
        name: values.paymentScreenshot.name,
        type: values.paymentScreenshot.type,
        size: values.paymentScreenshot.size
      });

      // Create FormData
      const formData = new FormData();
      formData.append('utrNumber', values.utrNumber);
      formData.append('registrationId', registerId);
      formData.append('file', values.paymentScreenshot);

      // Debug: Log FormData contents
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? 
          `${value.name} (${value.type}, ${value.size} bytes)` : 
          value);
      }

      // Make the request
      console.log('Sending request to /api/payments');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/payments`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json().catch(e => ({
        error: 'Failed to parse response',
        details: e.message
      }));

      console.log('Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to process payment: ${response.status} ${response.statusText}`);
      }
      
      // Store payment details in session storage
      const paymentInfo = {
        paymentId: responseData.paymentId || `PAY-${Date.now()}`,
        utrNumber: values.utrNumber,
        paymentDate: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        amount: 1000, // Update this with the actual amount if available in the response
      };
      
      // Store payment data in session storage
      sessionStorage.setItem('paymentData', JSON.stringify(paymentInfo));
      
      // Redirect to success page
      router.push('/payment/success');
    } catch (error: any) {
      console.error('Payment submission error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      'An error occurred while submitting your payment. Please try again.';
      setSubmitError(errorMsg);
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your payment information
          </p>
        </div>

        {submitError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {submitError}
          </div>
        )}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
  <p className="text-sm font-medium text-gray-700 mb-2">Scan to Pay</p>
  <div className="flex justify-center">
    <img 
      src="/qr_code.jpeg" 
      alt="Payment QR Code" 
      className="h-48 w-48 object-contain"
    />
  </div>
 
</div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              <div>
                <label
                  htmlFor="utrNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  UTR Number
                </label>
                <Field
                  type="text"
                  name="utrNumber"
                  id="utrNumber"
                  placeholder="Enter 12-20 digit UTR number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                <ErrorMessage
                  name="utrNumber"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Screenshot
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {previewUrl ? (
                      <div className="relative">
                        <Image
                          src={previewUrl}
                          alt="Payment preview"
                          width={200}
                          height={200}
                          className="mx-auto max-h-48 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(null);
                            setFieldValue('paymentScreenshot', null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
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
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label
                            htmlFor="paymentScreenshot"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="paymentScreenshot"
                              name="paymentScreenshot"
                              type="file"
                              ref={fileInputRef}
                              className="sr-only"
                              accept="image/*,.pdf"
                              onChange={(event) => {
                                if (event.currentTarget.files && event.currentTarget.files[0]) {
                                  const file = event.currentTarget.files[0];
                                  setFieldValue('paymentScreenshot', file);
                                  
                                  if (file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      setPreviewUrl(e.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  } else {
                                    setPreviewUrl(null);
                                  }
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, PDF up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <ErrorMessage
                  name="paymentScreenshot"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}