import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CalendarDays, 
  PlusCircle, 
  List, 
  LogOut, 
  User, 
  Settings, 
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserData {
  name: string;
  email: string;
  tenantName: string;
  licenseValidUntil?: string;
  avatarUrl?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch user data from session storage or API
    if (typeof window !== 'undefined') {
      const userData = sessionStorage.getItem('userData');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Check license validity
        if (parsedUser.licenseValidUntil) {
          const expiryDate = new Date(parsedUser.licenseValidUntil);
          setIsLicenseValid(expiryDate > new Date());
        }
      }
    }
  }, []);

  const isActive = (path: string) => {
    return pathname.startsWith(path) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50';
  };

  const handleLogout = () => {
    // Clear session data
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/payment/success" className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold mr-2">
                ES
              </div>
              <h1 className="text-xl font-bold text-gray-900">Event Scheduler</h1>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link 
              href="/payment/success"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg mx-2 ${isActive('/payment/success')}`}
            >
              <CalendarDays className="w-5 h-5 mr-3" />
              Calendar
            </Link>
            <Link
              href="/payment/success/create"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg mx-2 ${isActive('/payment/success/create')}`}
            >
              <PlusCircle className="w-5 h-5 mr-3" />
              Create Event
            </Link>
            <Link
              href="/payment/success/events"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg mx-2 ${isActive('/payment/success/events')}`}
            >
              <List className="w-5 h-5 mr-3" />
              View Events
            </Link>
          </nav>

          {/* User Profile & License */}
          <div className="p-4 border-t border-gray-200 space-y-4">
            {!isLicenseValid && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span>Your license has expired</span>
                </div>
              </div>
            )}
            
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar alt={user.name} className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.tenantName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Help</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {user?.licenseValidUntil && (
              <div className="text-xs text-gray-500 mt-2 flex items-center">
                {isLicenseValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-1.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-yellow-500 mr-1.5" />
                )}
                <span>License valid until {new Date(user.licenseValidUntil).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex md:hidden bg-white border-t border-gray-200">
        <Link
          href="/payment/success"
          className={`flex flex-col items-center justify-center flex-1 py-2 text-xs ${isActive('/payment/success') ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="mt-1">Calendar</span>
        </Link>
        <Link
          href="/payment/success/create"
          className={`flex flex-col items-center justify-center flex-1 py-2 text-xs ${isActive('/payment/success/create') ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="mt-1">Create</span>
        </Link>
        <Link
          href="/payment/success/events"
          className={`flex flex-col items-center justify-center flex-1 py-2 text-xs ${isActive('/payment/success/events') ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <List className="w-5 h-5" />
          <span className="mt-1">Events</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center flex-1 py-2 text-xs ${isMobileMenuOpen ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <User className="w-5 h-5" />
          <span className="mt-1">Account</span>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-lg shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
            {user && (
              <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                <Avatar alt={user.name} className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.tenantName}</p>
                </div>
              </div>
            )}
            
            {!isLicenseValid && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span>Your license has expired</span>
                </div>
              </div>
            )}

            {user?.licenseValidUntil && (
              <div className="text-xs text-gray-500 mb-4 flex items-center">
                {isLicenseValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-1.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-yellow-500 mr-1.5" />
                )}
                <span>License valid until {new Date(user.licenseValidUntil).toLocaleDateString()}</span>
              </div>
            )}

            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
