'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MeritItem {
  id: number;
  register_id: number;
  file_name: string;
  rating: number;
  first_name?: string;
  last_name?: string;
  // New field names with backward compatibility for old field names
  registerState?: string;
  registerDistrict?: string;
  registerMandal?: string;
  // Backward compatibility with old field names
  state?: string;
  district?: string;
  mandal?: string;
  user_email?: string;
}

interface MeritData {
  topStatePerformers: Array<{ state: string; records: MeritItem[] }>;
  topDistrictPerformers: Array<{ district: string; records: MeritItem[] }>;
  topMandalPerformers: Array<{ mandal: string; records: MeritItem[] }>;
  overallChampion: MeritItem | null;
}

export function MeritSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [meritData, setMeritData] = useState<MeritData>({ 
    topStatePerformers: [], 
    topDistrictPerformers: [], 
    topMandalPerformers: [],
    overallChampion: null 
  });
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();

  const fetchMeritData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching merit data...');
      
      if (status === 'loading') {
        console.log('Session is still loading...');
        return;
      }
      
      if (!session) {
        console.error('No session found');
        throw new Error('Not authenticated');
      }
      
      console.log('Session data:', {
        user: session.user,
        expires: session.expires
      });
      
      // Call the backend API directly (will be proxied by Next.js)
      const response = await fetch('/api/assignments/merit-list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for sending cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          error: errorText
        });
        throw new Error(`Failed to fetch merit data: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Merit data received:', result);
      
      // The data is nested under the 'data' property in the response
      const { data } = result;
      console.log('Extracted data:', data);
      
      // Log the structure of the data we're trying to set
      console.log('Top state performers:', data?.topStatePerformers);
      console.log('Top district performers:', data?.topDistrictPerformers);
      console.log('Top mandal performers:', data?.topMandalPerformers);
      console.log('Overall champion:', data?.overallChampion);
      
      setMeritData({
        topStatePerformers: data?.topStatePerformers || [],
        topDistrictPerformers: data?.topDistrictPerformers || [],
        topMandalPerformers: data?.topMandalPerformers || [],
        overallChampion: data?.overallChampion || null
      });
    } catch (error) {
      console.error('Error in fetchMeritData:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load merit data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts or when authentication status changes
  useEffect(() => {
    if (status === 'authenticated' && isOpen) {
      fetchMeritData();
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view the merit list.',
        variant: 'destructive',
      });
    }
  }, [status, isOpen]);

  const handleOpen = () => {
    if (status === 'loading') {
      console.log('Waiting for session to load...');
      return;
    }
    
    if (status === 'unauthenticated') {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view the merit list.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsOpen(true);
  };

  const renderMeritTable = (
    title: string, 
    groups: Array<{ [key: string]: any; records: MeritItem[] }>, 
    type: 'state' | 'district' | 'mandal'
  ) => {
    if (!groups.length) return null;

    // Helper function to get the appropriate field value with fallback
    const getFieldValue = (record: any, field: string) => {
      // Try new field names first, then fall back to old field names
      if (field === 'state') return record.registerState || record.state || '—';
      if (field === 'district') return record.registerDistrict || record.district || '—';
      if (field === 'mandal') return record.registerMandal || record.mandal || '—';
      return '—';
    };

    // Flatten all records and sort by rating
    const allRecords = groups.flatMap(group => 
      group.records.map(record => {
        // Use the new field names with fallback to old field names
        const state = getFieldValue(record, 'state');
        const district = getFieldValue(record, 'district');
        const mandal = getFieldValue(record, 'mandal');
        
        return {
          ...record,
          state,
          district,
          mandal,
          groupName: group[type]?.replace(/^(State|District|Mandal):\s*/i, '')
        };
      })
    ).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);

    if (allRecords.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allRecords.map((item, index) => (
            <div 
              key={`${type}-${index}`}
              className={`border rounded-lg p-4 ${index === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {index === 0 ? (
                  <div className="bg-amber-100 dark:bg-amber-900/30 h-10 w-10 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                    🥇
                  </div>
                ) : index === 1 ? (
                  <div className="bg-gray-100 dark:bg-gray-700 h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold">
                    🥈
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700 h-10 w-10 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold">
                    🥉
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm text-gray-500 dark:text-gray-400">
                    Rank #{index + 1}
                  </div>
                  <div className="font-bold text-lg">
                    {item.first_name} {item.last_name}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">State</span>
                  <span className="font-medium">{item.state || '—'}</span>
                </div>
                {type === 'district' && item.district && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">District</span>
                    <span className="font-medium">{item.district}</span>
                  </div>
                )}
                {type === 'mandal' && item.mandal && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Mandal</span>
                    <span className="font-medium">{item.mandal}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Rating</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-amber-600 dark:text-amber-400">
                      {item.rating.toFixed(1)}
                    </span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(item.rating)
                              ? 'text-amber-500 fill-current'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderOverallChampion = () => {
    if (!meritData.overallChampion) return null;
    
    const champion = {
      ...meritData.overallChampion,
      // Use new field names with fallback to old field names
      state: meritData.overallChampion.registerState || meritData.overallChampion.state || '—',
      district: meritData.overallChampion.registerDistrict || meritData.overallChampion.district || '—',
      mandal: meritData.overallChampion.registerMandal || meritData.overallChampion.mandal || '—',
    };
    
    return (
      <div className="bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-xl p-6 shadow-sm border border-amber-200 dark:border-amber-800/50 mb-8">
        <h2 className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-2">
          🏆 Overall Champion
        </h2>
        
        <div className="text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md max-w-2xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <Trophy className="h-12 w-12 text-amber-500" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {champion.first_name} {champion.last_name}
              </h3>
              
              <div className="mt-4 space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-medium">State:</span> {champion.state || '—'}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-medium">District:</span> {champion.district || '—'}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Mandal:</span> {champion.mandal || '—'}
                </p>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {champion.rating.toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/ 10</span>
              </div>
              
              <div className="flex mt-2">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-6 h-6 ${
                      i < Math.floor(champion.rating)
                        ? 'text-amber-500 fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6">
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={handleOpen}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'View Merit Section'
        )}
      </Button>

      {isOpen && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Merit List</h2>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
          
          {/* Overall Champion */}
          {renderOverallChampion()}
          
          {/* Top 3 Tables */}
          <div className="space-y-8">
            {renderMeritTable('Top by State', meritData.topStatePerformers, 'state')}
            {renderMeritTable('Top by District', meritData.topDistrictPerformers, 'district')}
            {renderMeritTable('Top by Mandal', meritData.topMandalPerformers, 'mandal')}
          </div>
          
          {(meritData.topStatePerformers.length === 0 && meritData.topDistrictPerformers.length === 0 && meritData.topMandalPerformers.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              No merit data available. Check back later.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
