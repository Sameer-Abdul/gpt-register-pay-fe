'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any registration data from session storage
    sessionStorage.removeItem('registrationId');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        
        <p className="text-gray-600 mb-8">
          Thank you for your payment. Your registration has been successfully processed.
        </p>

        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 text-left">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your payment has been received and is being processed. You will receive a confirmation email shortly with your registration details.
              </p>
              <p className="mt-2 text-sm text-green-700 font-medium">
                Registration ID: {sessionStorage.getItem('registrationId') || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            What would you like to do next?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Access Event Scheduler
            </Link>
            
            <Link
              href="/"
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Return to Home
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a href="mailto:support@example.com" className="text-indigo-600 hover:text-indigo-500">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
