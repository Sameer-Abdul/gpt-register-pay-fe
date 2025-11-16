'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Home, LogIn } from 'lucide-react';
import { format } from 'date-fns';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [registrationId, setRegistrationId] = useState('');

  useEffect(() => {
    // Get registration ID from URL
    const id = searchParams.get('id');
    if (!id) {
      router.push('/register');
      return;
    }
    
    setRegistrationId(id);
    setIsLoading(false);
    
    // Clear the registration ID from session storage
    sessionStorage.removeItem('registrationId');
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Function to handle download of registration details
  const handleDownload = () => {
    // In a real app, you would generate a PDF here
    alert('Downloading registration details...');
    // Example: window.open(`/api/registration/${registrationId}/download`, '_blank');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 rounded-full p-3">
              <CheckCircle className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Registration Successful!</h1>
          <p className="text-blue-100">Thank you for your registration with us</p>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-6">A confirmation has been sent to your email.</p>
          </div>
          
          {/* Confirmation Message */}
          <div className="text-center mb-8">
            <p className="text-gray-600">Thank you for your payment. Your registration is now complete.</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login to Your Account
              </Link>
            </Button>
          </div>
          <div className="mt-8 bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Registration Completed Successfully!</h3>
              <p className="text-gray-600 mb-6">
                Thank you for registering. Your account has been created and your payment has been processed successfully.
              </p>
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <p className="text-sm text-gray-700 mb-2">Registration ID: <span className="font-mono font-medium">{registrationId}</span></p>
                <p className="text-sm text-gray-700">Date: <span className="font-medium">{format(new Date(), 'MMMM d, yyyy')}</span></p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                We've sent a confirmation email with your registration details. Please check your inbox.
              </p>
              <Button 
                asChild 
                variant="outline" 
                className="flex-1"
                size="lg"
              >
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to Your Account
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
