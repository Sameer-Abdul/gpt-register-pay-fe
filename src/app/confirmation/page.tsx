'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, DocumentTextIcon, EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type RegistrationData = {
  registrationId: string;
  name: string;
  email: string;
  phone: string;
  paymentAmount: number;
  paymentDate: string;
  referenceNumber: string;
};

type PaymentData = {
  paymentId: string;
  utrNumber: string;
  paymentDate: string;
  amount: number;
};

export default function ConfirmationPage() {
  const router = useRouter();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Get data from session storage
    const registrationId = sessionStorage.getItem('registrationId');
    const registrationData = sessionStorage.getItem('registrationData');
    const paymentData = sessionStorage.getItem('paymentData');
    
    if (!registrationId || !registrationData) {
      router.push('/register');
      return;
    }

    try {
      const regData = JSON.parse(registrationData);
      const payData = paymentData ? JSON.parse(paymentData) : null;
      
      // Set payment data if available
      if (payData) {
        setPayment({
          paymentId: payData.paymentId,
          utrNumber: payData.utrNumber,
          paymentDate: payData.paymentDate,
          amount: payData.amount
        });
      }

      // Set registration data
      setRegistration({
        registrationId,
        name: regData.name || 'N/A',
        email: regData.email || 'N/A',
        phone: regData.phone || 'N/A',
        paymentAmount: payData?.amount || regData.paymentAmount || 0,
        paymentDate: payData?.paymentDate || new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        referenceNumber: payData?.utrNumber || regData.referenceNumber || 'N/A',
      });
    } catch (error) {
      console.error('Error parsing data:', error);
      router.push('/register');
    }

    // Clean up function
    return () => {
      // Don't clear the session data immediately to allow page refresh
    };
  }, [router]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleClose();
    }
  }, [countdown]);

  const handleClose = () => {
    // Clear session data when user explicitly closes
    sessionStorage.removeItem('registrationId');
    sessionStorage.removeItem('registrationData');
    sessionStorage.removeItem('paymentData');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userPhone');
    router.push('/register');
  };

  const handleNewRegistration = () => {
    // Clear all session data and redirect to register
    sessionStorage.clear();
    router.push('/register');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your registration details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header with background image */}
        <div className="relative h-40 bg-blue-700 overflow-hidden">
          <img 
            src="/thumb.jpeg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-blue-700 bg-opacity-70 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <CheckCircleIcon className="h-12 w-12 text-green-300 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">Registration Successful!</h1>
              <p className="mt-1 text-blue-100">
                Thank you for your payment. Your registration is now complete.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
              Registration & Payment Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Registration ID</p>
                  <p className="font-medium text-gray-800">{registration.registrationId}</p>
                </div>
                {payment?.paymentId && (
                  <div>
                    <p className="text-sm text-gray-500">Payment ID</p>
                    <p className="font-medium text-gray-800">{payment.paymentId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-800">{registration.paymentDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-800">{registration.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {registration.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-800">{registration.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">UTR/Reference Number</p>
                  <p className="font-medium text-gray-800">
                    {registration.referenceNumber}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{registration.paymentAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r">
            <div className="flex">
              <div className="shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  A confirmation has been sent to your email address. Please check your inbox (and spam folder).
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <DocumentTextIcon className="-ml-1 mr-2 h-4 w-4" />
                Print Receipt
              </button>
              <button
                onClick={handleNewRegistration}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 text-gray-500" />
                New Registration
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                You will be redirected to the registration page in{' '}
                <span className="font-medium text-blue-600">{countdown} seconds</span>...
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            Thank you for choosing our service. We've sent a confirmation to your email.
          </p>
        </div>
      </div>
    </div>
  );
}