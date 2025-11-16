'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    // Test API route that requires authentication
    const testAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        console.log('Session API response:', data);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    
    testAuth();
  }, [session, status]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Session Status</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify({
            status,
            session,
            time: new Date().toISOString(),
          }, null, 2)}
        </pre>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/event-scheduler/dashboard'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/api/auth/signout'}
              className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
