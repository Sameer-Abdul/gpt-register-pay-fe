'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have a session or if we're still loading
    if (status === 'loading') {
      return; // Still loading, do nothing yet
    }

    // If not authenticated, redirect to login with a return URL
    if (status === 'unauthenticated' || !session) {
      const callbackUrl = searchParams.get('callbackUrl') || '/event-scheduler/dashboard';
      const loginUrl = `/event-scheduler/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      console.log('Not authenticated, redirecting to:', loginUrl);
      router.replace(loginUrl);
      return;
    }

    // If we get here, we have a valid session - redirect to calendar
    console.log('Dashboard mounted with session, redirecting to calendar');
    router.replace('/event-scheduler/dashboard/calendar');

    // Set up periodic session check
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (!data?.user) {
          console.log('No user in session, signing out...');
          await signOut({ redirect: false });
          router.replace(`/event-scheduler/login?callbackUrl=${encodeURIComponent('/event-scheduler/dashboard/calendar')}`);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, [status, session, router, searchParams]);

  // Show loading spinner while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    </div>
  );
}
