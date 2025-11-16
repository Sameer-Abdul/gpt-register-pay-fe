'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

// Utility function to clear all auth-related cookies
const clearAuthCookies = () => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name] = cookie.trim().split('=');
    if (name.includes('next-auth') || name.includes('session-token')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
  // Clear session storage and local storage as well
  sessionStorage.clear();
  localStorage.clear();
};

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function LoginPage() {
  // State management
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  // Get callback URL or default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/event-scheduler/dashboard';

  // Log environment for debugging
  useEffect(() => {
    console.log('Login page environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      callbackUrl,
      sessionStatus: status,
      hasSession: !!session
    });
  }, [status, session, callbackUrl]);

  // Handle authentication state changes
  useEffect(() => {
    // Only run this effect in the browser
    if (typeof window === 'undefined') return;

    console.log('[Login] Auth status changed:', { 
      status, 
      isRedirecting,
      hasSession: !!session,
      callbackUrl
    });

    // If already authenticated, redirect to dashboard
    if (status === 'authenticated' && !isRedirecting) {
      console.log('[Login] Already authenticated, redirecting to', callbackUrl);
      setIsRedirecting(true);
      
      // Small delay to ensure session is fully established
      const timer = setTimeout(() => {
        // Use window.location.href for a full page reload to ensure session is properly set
        window.location.href = callbackUrl;
      }, 100);
      
      return () => clearTimeout(timer);
    }

    // Set loading to false once we've checked the auth state
    if (status !== 'loading' && !isRedirecting) {
      setIsLoading(false);
    }
  }, [status, callbackUrl, isRedirecting, session]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Clear any existing session first
    console.log('Starting admin login process...');
    await signOut({ redirect: false });
    clearAuthCookies();
    
    // Add a small delay to ensure session is cleared
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (adminUsername === 'admin' && adminPassword === 'admin123') {
      setIsLoading(true);
      
      try {
        console.log('Signing in with admin credentials...');
        
        // Sign in with admin credentials
        const result = await signIn('credentials', {
          redirect: false,
          email: 'admin@example.com',
          password: 'admin123',
          isAdmin: true,
          role: 'admin',
          callbackUrl: '/admin-dashboard',
          _: Date.now().toString() // Add a unique ID to prevent caching
        });
        
        console.log('Admin login result:', result);
        
        if (result?.error) {
          console.error('Admin login failed:', result.error);
          setError('Failed to log in. Please try again.');
          toast({
            title: 'Login Failed',
            description: result.error || 'Failed to authenticate as admin',
            variant: 'destructive',
          });
          return;
        }
        
        // Force a full page reload to ensure session is properly set
        console.log('Admin login successful, reloading page...');
        window.location.href = '/admin-dashboard';
      } catch (error: any) {
        console.error('Admin login error:', error);
        setError('Failed to log in. Please try again.');
        toast({
          title: 'Login Failed',
          description: error.message || 'Failed to authenticate as admin',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Invalid admin credentials');
    }
  };

  const handleUserLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      toast({
        title: 'Validation Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    if (!password) {
      setError('Password is required');
      toast({
        title: 'Validation Error',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('[Login] Attempting to sign in...');

    try {
      // Clear any existing session and cookies first
      console.log('[Login] Clearing existing session...');
      try {
        // First try to sign out using NextAuth
        await signOut({ redirect: false });
        
        // Then clear cookies manually
        clearAuthCookies();
        
        // Add a small delay to ensure session is cleared
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (signOutError) {
        console.warn('Error during sign out (can be ignored):', signOutError);
        // Continue with login even if sign out fails
      }
      
      console.log('[Login] Attempting to sign in with credentials...');
      
      // Sign in with credentials
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password: password,
        callbackUrl: callbackUrl,
      });
      
      console.log('[Login] SignIn result:', {
        error: result?.error || 'No error',
        url: result?.url ? new URL(result.url).pathname : 'No URL',
        status: result?.status,
        ok: result?.ok,
        errorType: result?.error ? 'Error occurred' : 'No error'
      });

      if (result?.error) {
        // Handle specific error cases
        let errorMessage = result.error;
        let toastTitle = 'Login Failed';
        
        console.log('Raw error from server:', result.error); // Debug log
        
        // Check for license-related errors first
        if (typeof result.error === 'string') {
          if (result.error.includes('LICENSE_EXPIRED') || 
              result.error.includes('Your license has expired')) {
            errorMessage = 'Your license has expired. Please contact the administrator.';
            toastTitle = 'License Expired';
          } else if (result.error.includes('LICENSE_ERROR:')) {
            errorMessage = 'There is a problem with your license. Please contact support.';
            toastTitle = 'License Error';
          } else if (result.error.includes('CredentialsSignin') || 
                    result.error.includes('Invalid email or password') ||
                    result.error.includes('Invalid credentials')) {
            errorMessage = 'The email or password you entered is incorrect';
            toastTitle = 'Invalid Credentials';
          } else if (result.error.includes('ECONNREFUSED')) {
            errorMessage = 'Cannot connect to the authentication server. Please try again later.';
            toastTitle = 'Connection Error';
          } else if (result.error.includes('JSON')) {
            errorMessage = 'An error occurred during authentication. Please try again.';
            toastTitle = 'Authentication Error';
          }
        }
        
        // Set the error state
        setError(errorMessage);
        
        // Show toast with error details
        toast({
          title: toastTitle,
          description: errorMessage,
          variant: 'destructive',
        });
        
        return; // Don't throw, we're handling it with toast
      }

      // If we get here, login was successful
      if (result?.url) {
        console.log('[Login] Login successful, redirecting to:', result.url);
        // Use a full page reload to ensure all auth state is properly set
        window.location.href = result.url;
        return;
      }

      // Fallback in case result.url is not provided
      console.log('[Login] Login successful, falling back to callback URL:', callbackUrl);
      window.location.href = callbackUrl;

    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      
      // Only show toast if we didn't already show one
      if (!error.handled) {
        toast({
          title: 'Login Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isAdminLogin ? 'Admin Login' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isAdminLogin ? 'Enter admin credentials' : (
              <>
                Or{' '}
                <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  register for a new account
                </Link>
              </>
            )}
          </p>
        </div>
        {isAdminLogin ? (
          <form className="mt-8 space-y-6" onSubmit={handleAdminLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Label htmlFor="email-address" className="sr-only">
                Email address
              </Label>
              <Input
                id="admin-username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <Label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </Label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            {error && (
              <div className="text-red-500 text-sm mt-1 mb-2">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </Button>
          </div>
        </form>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={handleUserLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Label htmlFor="email-address" className="sr-only">
                Email address
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  error && error.toLowerCase().includes('email') 
                    ? 'border-red-500' 
                    : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  error && error.toLowerCase().includes('password') 
                    ? 'border-red-500' 
                    : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <Label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </Label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            {error && (
              <div className="text-red-500 text-sm mt-1 mb-2">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </Button>
          </div>
        </form>
      )}
        
        <div className="text-center">
          {isAdminLogin ? (
            <button
              onClick={() => setIsAdminLogin(false)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to User Login
            </button>
          ) : (
            <button
              onClick={() => setIsAdminLogin(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Admin Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
