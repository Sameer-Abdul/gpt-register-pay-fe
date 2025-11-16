'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, FileText, Calendar, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [registrationId, setRegistrationId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get registration ID from URL
    const id = searchParams.get('id');
    if (!id) {
      setError('No registration ID found. Please complete the registration process first.');
      setIsLoading(false);
      return;
    }
    
    setRegistrationId(id);
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Processing Payment</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="mt-6">
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="mr-2 h-4 w-4" /> Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col w-64 bg-indigo-700">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-center px-4">
            <h1 className="text-white text-xl font-bold">Event Scheduler</h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            <Link
              href="/event-scheduler/login"
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
              )}
            >
              <Calendar className="mr-3 h-5 w-5" />
              Event Scheduler
            </Link>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Payment Successful!</h1>
              <p className="mt-2 text-gray-600">Thank you for your registration. A confirmation has been sent to your email.</p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <Link href="/event-scheduler/login">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" />
                    Login to Event Scheduler
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
