'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Calendar, PlusCircle, List, LogOut, Upload } from 'lucide-react';
import { getTenantById } from '@/lib/eventDb';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tenant, setTenant] = useState<{
    name: string;
    image_url: string;
  } | null>(null);

  useEffect(() => {
    console.log('Auth status changed:', { status, session });
    setIsClient(true);
    
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to login');
      router.push('/event-scheduler/login');
    } else if (status === 'authenticated' && session?.user?.id) {
      console.log('User authenticated, session:', session);
      
      const fetchTenantData = async () => {
        const registerId = session.user.id; // This should be the register ID
        console.log('Fetching tenant data for register ID:', registerId);
        
        if (!registerId) {
          console.warn('No register ID found in session');
          setTenant({
            name: session.user?.name || 'User',
            image_url: '/default-avatar.png'
          });
          return;
        }
        
        try {
          console.log('Making API request to /api/tenants...');
          const response = await fetch(`/api/tenants?registerId=${registerId}`);
          console.log('API Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to fetch tenant data: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log('API Response data:', JSON.stringify(result, null, 2));
          
          if (result.success && result.data) {
            const tenantData = result.data;
            console.log('Setting tenant data:', tenantData);
            
            setTenant({
              name: tenantData.name || 'No Name',
              image_url: tenantData.image_url || '/default-avatar.png'
            });
          } else {
            console.warn('No tenant data found for register ID:', registerId);
            setTenant({
              name: session.user?.name || 'User',
              image_url: '/default-avatar.png'
            });
          }
        } catch (error) {
          console.error('Error in fetchTenantData:', error);
          setTenant({
            name: session.user?.name || 'User',
            image_url: '/default-avatar.png'
          });
        }
      };
      
      fetchTenantData();
    }
  }, [status, router, session]);

  const handleLogout = async () => {
  try {
    setIsLoggingOut(true);
    
    // Clear any client-side storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
    }
    
    // Sign out using NextAuth
    await signOut({ callbackUrl: `${window.location.origin}/event-scheduler/login` });


    // Redirect to login page manually
    router.push('/event-scheduler/login');
    router.refresh(); // Refresh the page to clear session/cookies
  } catch (error) {
    console.error('Error during sign out:', error);
  } finally {
    setIsLoggingOut(false);
  }
};



  if (!isClient) {
    return null;
  }

  const navItems = [
    {
      name: 'Calendar',
      href: '/event-scheduler/dashboard/calendar',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      name: 'Create Event',
      href: '/event-scheduler/dashboard/create-event',
      icon: <PlusCircle className="h-5 w-5" />,
    },
    {
      name: 'View Data',
      href: '/event-scheduler/dashboard/view-data',
      icon: <List className="h-5 w-5" />,
    },
    {
      name: 'Upload Assignment',
      href: '/event-scheduler/dashboard/upload-assignment',
      icon: <Upload className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <div className="flex flex-col w-64 bg-indigo-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-between px-4 mb-6">
              <h1 className="text-white text-xl font-bold">Event Scheduler</h1>
            </div>
            <nav className="flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="bg-amber-100 shadow-sm w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center justify-between h-full">
              {/* Left side - Dashboard title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-amber-900">Dashboard</h1>
              </div>
              
              {/* Centered Tenant info */}
              <div className="flex-1 flex justify-center">
                <div className="flex items-start space-x-3">
                  {/* Left Avatar */}
                  <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-amber-300 shrink-0">
                    {(() => {
                      if (!tenant?.image_url || tenant.image_url === '/default-avatar.png') {
                        return (
                          <div className="h-full w-full flex items-center justify-center bg-amber-200 text-amber-900 font-medium text-lg">
                            {tenant?.name?.charAt(0)?.toUpperCase() || 
                             session?.user?.name?.charAt(0)?.toUpperCase() || 
                             'U'}
                          </div>
                        );
                      }
                      return (
                        <img
                          src={tenant.image_url}
                          alt={tenant.name || 'User'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-avatar.png';
                            target.onerror = null;
                          }}
                        />
                      );
                    })()}
                  </div>
                  
                  {/* Tenant Name and Email - Vertical Stack */}
                  <div className="flex flex-col mt-3">
                    <p className="text-lg font-semibold text-amber-950 leading-tight">
                      {tenant?.name || session?.user?.name || 'User'}
                    </p>
                    <p className="text-xs text-amber-800 leading-tight">
                      {session?.user?.email || ''}
                    </p>
                  </div>
                  
                  {/* Right Avatar */}
                  <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-amber-300 shrink-0">
                    {(() => {
                      if (!tenant?.image_url || tenant.image_url === '/default-avatar.png') {
                        return (
                          <div className="h-full w-full flex items-center justify-center bg-amber-200 text-amber-900 font-medium text-lg">
                            {tenant?.name?.charAt(0)?.toUpperCase() || 
                             session?.user?.name?.charAt(0)?.toUpperCase() || 
                             'U'}
                          </div>
                        );
                      }
                      return (
                        <img
                          src={tenant.image_url}
                          alt={tenant.name || 'User'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-avatar.png';
                            target.onerror = null;
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Right side - Sign out button */}
              <div className="flex-1 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
