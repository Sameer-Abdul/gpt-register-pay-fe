'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { MeritSection } from '@/components/merit/MeritSection';
import OllamaStatus from '@/components/OllamaStatus';

interface Assignment {
  id: number;
  register_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  state: string | null;
  district: string | null;
  mandal: string | null;
  submission_date: string;
  created_at: string;
  user_email: string;
  ai_rating: number | null;
  manual_rating: number | null;
  final_rating: number | null;
  // Backwards-compatible alias used in existing UI for color bar
  rating: number | null;
  context: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface RatingState {
  [key: number]: number | string | null | undefined;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<RatingState>({});
  const [savingRatings, setSavingRatings] = useState<Record<number, boolean>>({});
  const router = useRouter();
  
  // Check if user is admin when component mounts or session changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('Checking admin status...', { status, session });
      
      if (status === 'loading') {
        console.log('Session is still loading...');
        return;
      }
      
      if (!session?.user) {
        console.log('No session found, redirecting to login...');
        router.push('/event-scheduler/login?callbackUrl=/admin-dashboard');
        return;
      }
      
      try {
        // For admin@example.com, we can trust the session
        if (session.user.email === 'admin@example.com') {
          console.log('User is admin (hardcoded email)');
          setIsAdmin(true);
          return;
        }
        
        // For other users, check the database
        console.log('Checking admin status in database for user:', session.user.email);
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify admin status');
        }
        
        const sessionData = await response.json();
        console.log('Session data from API:', sessionData);
        
        const isUserAdmin = sessionData?.user?.isAdmin || sessionData?.user?.role === 'admin';
        console.log('Is user admin?', isUserAdmin);
        
        if (!isUserAdmin) {
          console.log('User is not an admin, redirecting...');
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access the admin dashboard',
            variant: 'destructive',
          });
          router.push('/event-scheduler/dashboard');
          return;
        }
        
        // User is admin, set admin state to true
        console.log('User is admin, loading dashboard...');
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify admin status: ' + (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [session, status, router]);

  // Debug effect to log assignments state changes
  useEffect(() => {
    console.log('Assignments state updated:', {
      count: assignments.length,
      sample: assignments.length > 0 ? assignments[0] : 'No assignments',
      all: assignments
    });
  }, [assignments]);
  
  // Debug effect to log when isAdmin changes
  useEffect(() => {
    console.log('isAdmin state changed:', isAdmin);
  }, [isAdmin]);

  // Effect to fetch assignments when isAdmin changes
  useEffect(() => {
    // Set a flag to track if component is still mounted
    let isMounted = true;
    
    const fetchAssignments = async () => {
      console.log('useEffect - isAdmin:', isAdmin, 'status:', status);
      
      // Only fetch assignments if user is admin
      if (!isAdmin) {
        console.log('Not an admin or still loading');
        return;
      }
      
      console.log('User is admin, starting to fetch assignments...');
      console.log('=== Starting to fetch assignments ===');
      try {
        console.log('Making request to /api/assignments');
        
        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();
        const url = `/api/assignments?t=${timestamp}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        console.log('Response status:', response.status);
        
        // Log response headers for debugging
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        console.log('Response headers:', responseHeaders);
        
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('Parsed response data:', responseData);
        } catch (err) {
          console.error('Error parsing JSON response:', err);
          console.error('Response text that failed to parse:', responseText);
          throw new Error('Invalid JSON response from server');
        }
        
        if (!response.ok) {
          const errorMessage = responseData?.error || 'Failed to fetch assignments';
          console.error('Error response:', errorMessage);
          
          if (response.status === 401) {
            console.log('Unauthorized - redirecting to login');
            window.location.href = '/event-scheduler/login?callbackUrl=/admin-dashboard';
            return;
          }
          
          throw new Error(errorMessage);
        }
        
        if (!Array.isArray(responseData)) {
          console.error('Unexpected data format:', responseData);
          throw new Error('Expected an array of assignments but got: ' + typeof responseData);
        }
        
        console.log(`Received ${responseData.length} assignments`);
        
        // Transform the data to match our Assignment interface
        const formattedAssignments = responseData.map((e: any) => ({
          id: e.id,
          register_id: e.register_id,
          file_name: e.file_name,
          file_size: e.file_size,
          file_type: e.file_type,
          state: e.state || null,
          district: e.district || null,
          mandal: e.mandal || null,
          submission_date: e.submission_date,
          created_at: e.created_at,
          user_email: e.user_email || '',
          
          // Convert all ratings to numbers, handling null/undefined cases properly
          ai_rating: e.ai_rating !== null && e.ai_rating !== undefined
            ? Number(e.ai_rating)
            : null,
          manual_rating: e.manual_rating !== null && e.manual_rating !== undefined
            ? Number(e.manual_rating)
            : null,
          final_rating: e.final_rating !== null && e.final_rating !== undefined
            ? Number(e.final_rating)
            : null,
          
          // Legacy rating field - prefer final_rating, then manual, then AI
          rating: e.final_rating ? Number(e.final_rating) : 
                 e.manual_rating ? Number(e.manual_rating) : 
                 e.ai_rating ? Number(e.ai_rating) : null,
                 
          context: e.context || null,
          first_name: e.first_name || null,
          last_name: e.last_name || null
        }));

        // Initialize ratings state with existing MANUAL ratings only
        const initialRatings = formattedAssignments.reduce((acc: RatingState, assignment: Assignment) => {
          acc[assignment.id] = assignment.manual_rating;
          return acc;
        }, {} as RatingState);
        setRatings(initialRatings);
        
        console.log('Formatted assignments:', formattedAssignments);
        setAssignments(formattedAssignments);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        if (isMounted) {
          setError('Failed to load assignments');
          toast({
            title: 'Error',
            description: 'Failed to load assignments',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Fetch assignments immediately
    fetchAssignments();
    
    // Set up polling to check for new assignments every 5 seconds
    const intervalId = setInterval(() => {
      console.log('Polling for new assignments...');
      fetchAssignments();
    }, 5000);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isAdmin, status, session]);
  
  const handleRatingChange = (assignmentId: number, value: string) => {
    // Only update if the value is empty or a valid number
    if (value === '' || !isNaN(Number(value))) {
      setRatings(prev => ({
        ...prev,
        [assignmentId]: value === '' ? null : Number(value)
      }));
    }
  };

  const handleAIAnalyze = async (assignmentId: number) => {
    setSavingRatings(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gpt-register-pay-be.onrender.com';
      const url = `${backendUrl}/assignments/analyze/${assignmentId}`;
      
      console.log(`Calling AI analysis endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: '' }), // Required empty context as per requirements
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (e) {
          errorData = { message: errorText || 'Unknown error occurred' };
        }
        
        console.error('AI Analysis Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          responseText: errorText
        });
        
        throw new Error(
          errorData.message || 
          errorData.error || 
          `Server responded with status ${response.status}: ${response.statusText}`
        );
      }
      
      const data = await response.json();
      console.log('AI Analysis Response:', data);
      
      // Handle multiple possible response formats (Nest / Next)
      const rating =
        typeof data?.data?.rating === 'number'
          ? data.data.rating
          : typeof data.rating === 'number'
            ? data.rating
            : typeof data.aiRating === 'number'
              ? data.aiRating
              : undefined;
      const score =
        typeof data?.data?.score === 'number'
          ? data.data.score
          : typeof data.score === 'number'
            ? data.score
            : typeof rating === 'number'
              ? rating * 10
              : undefined;
      
      // Convert to number and validate
      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 0 || numericRating > 10) {
        throw new Error('Invalid rating received from AI analysis');
      }

      // Update the local state with the new AI rating and recomputed final rating
      setAssignments(prev =>
        prev.map(assignment => {
          if (assignment.id !== assignmentId) return assignment;

          const ai_rating = rating;
          const manual_rating = assignment.manual_rating;
          const final_rating =
            manual_rating !== null && manual_rating !== undefined
              ? manual_rating
              : ai_rating;

          return {
            ...assignment,
            ai_rating,
            manual_rating,
            final_rating,
            rating: final_rating,
          };
        })
      );

      toast({
        title: 'AI Analysis Complete',
        description: score
          ? `Ollama has provided a rating: ${rating}/10 (Score: ${score})`
          : `Ollama has provided a rating: ${rating}/10`,
      });
    } catch (error: unknown) {
      console.error('Error analyzing assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze assignment';
      toast({
        title: 'Analysis Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingRatings(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleSaveRating = async (assignmentId: number | string) => {
    try {
      console.log('handleSaveRating called with:', { assignmentId, type: typeof assignmentId });
      
      // Ensure assignmentId is a number
      const id = Number(assignmentId);
      if (isNaN(id) || id <= 0) {
        console.error('Invalid assignment ID:', { assignmentId, converted: id });
        throw new Error(`Invalid assignment ID: ${assignmentId}`);
      }

      console.log('Starting to save rating for assignment:', id);
      setSavingRatings(prev => ({ ...prev, [id]: true }));
      
      // Get the manual rating value from state
      const manualRating = ratings[id];
      console.log('Manual rating value from state:', { id, rating: manualRating, ratings });
      
      if (manualRating === undefined || manualRating === null) {
        throw new Error('Rating value is required');
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gpt-register-pay-be.onrender.com';
      const url = `${backendUrl}/assignments/${id}`;
      
      console.log(`Calling rating update endpoint: ${url}`, {
        method: 'PUT',
        body: { rating: manualRating }
      });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({ rating: manualRating })
      });

      console.log('Response status:', response.status);
      
      let responseData;
      const responseText = await response.text();
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response JSON. Response text:', responseText);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        console.error('Error response details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          responseText,
          responseData
        });
        
        const errorMessage = responseData?.error || 
                           response.statusText || 
                           `Server returned ${response.status}`;
        
        throw new Error(errorMessage);
      }

      console.log('Rating saved successfully:', responseData);
      
      // Convert manualRating to number or null before updating assignments
      const newManualRating = manualRating === null || manualRating === undefined 
        ? null 
        : Number(manualRating);
      
      // Update the assignments with the new manual and final ratings after successful save
      setAssignments(prev => 
        prev.map(assignment => {
          if (assignment.id !== id) return assignment;

          const manual_rating = newManualRating;
          const final_rating =
            manual_rating !== null && manual_rating !== undefined
              ? manual_rating
              : assignment.ai_rating ?? null;

          return {
            ...assignment,
            manual_rating,
            final_rating,
            rating: final_rating,
          };
        })
      );

      // Clear the local rating state since it's now saved
      setRatings(prev => ({
        ...prev,
        [id]: undefined
      }));

      toast({
        title: 'Success',
        description: 'Rating saved successfully',
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save rating',
        variant: 'destructive',
      });
    } finally {
      setSavingRatings(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we verify your access</p>
        <p className="text-xs text-gray-400 mt-2">Status: {status} | isAdmin: {isAdmin.toString()}</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <OllamaStatus />
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <MeritSection />
              <p className="mt-4 text-gray-600">You don't have permission to access the admin dashboard.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Assignments</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Debug log before render
  console.log('Rendering with assignments:', {
    count: assignments.length,
    firstAssignment: assignments[0] || 'No assignments'
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline"
          onClick={() => signOut({ callbackUrl: '/event-scheduler/login' })}
        >
          Sign Out
        </Button>
      </div>
      
      {/* Merit Section */}
      <MeritSection />

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-linear-to-r from-blue-600 to-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Assignments</h2>
              <p className="text-blue-100 text-sm mt-1">{assignments.length} total assignments</p>
            </div>
            <div className="text-sm text-blue-100">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <p>Error: {error}</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No assignments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="align-middle inline-block min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">ID</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Register ID</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Name</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">File Name</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Context</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">File Size</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">File Type</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">State</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">District</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Mandal</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Submission Date</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">AI Rating</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Manual Rating</th>
                    <th className="px-4 py-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Final Rating</th>
                    <th className="px-4 py-3 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {assignments.map((assignment, index) => {
                    const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    const rating =
                      assignment.final_rating !== null && assignment.final_rating !== undefined
                        ? Number(assignment.final_rating)
                        : null;
                    let ratingColor = 'bg-gray-100 text-gray-800';

                    if (rating !== null) {
                      if (rating >= 8) ratingColor = 'bg-green-100 text-green-800';
                      else if (rating >= 5) ratingColor = 'bg-yellow-100 text-yellow-800';
                      else if (rating > 0) ratingColor = 'bg-orange-100 text-orange-800';
                    }

                    return (
                      <tr key={assignment.id} className={`${rowClass} hover:bg-blue-50 transition-colors`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                              {assignment.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                            {assignment.register_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                              {assignment.first_name ? assignment.first_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.first_name || 'N/A'} {assignment.last_name || ''}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                {assignment.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {assignment.file_name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          <div className="truncate" title={assignment.context || ''}>
                            {assignment.context || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {(assignment.file_size / 1024).toFixed(2)} KB
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                            {assignment.file_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{assignment.state || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{assignment.district || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{assignment.mandal || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="whitespace-nowrap">
                            {new Date(assignment.submission_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(assignment.submission_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            {assignment.ai_rating !== null && assignment.ai_rating !== undefined
                              ? `${assignment.ai_rating.toFixed(1)}/10`
                              : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className={`w-16 px-2 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-center ${ratingColor}`}
                              value={typeof ratings[assignment.id] !== 'undefined' 
                                ? ratings[assignment.id] ?? '' 
                                : assignment.manual_rating ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 10)) {
                                  handleRatingChange(assignment.id, value);
                                }
                              }}
                              placeholder="0-10"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ratingColor}`}>
                              {rating !== null ? `${rating.toFixed(1)}/10` : '—'}
                            </span>
                            {rating !== null && (
                              <div className="ml-2 w-16">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      rating >= 8 ? 'bg-green-500' :
                                      rating >= 5 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${rating * 10}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAIAnalyze(assignment.id);
                              }}
                              disabled={savingRatings[assignment.id]}
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                                savingRatings[assignment.id]
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                              }`}
                            >
                              <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              AI
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveRating(assignment.id);
                              }}
                              disabled={savingRatings[assignment.id]}
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm ${
                                savingRatings[assignment.id]
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                              }`}
                            >
                              {savingRatings[assignment.id] ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a1 1 0 100-2h-5V1a1 1 0 10-2 0v3H4a1 1 0 100 2h5v5.586l-1.293-1.293z" />
                                  </svg>
                                  Save
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
