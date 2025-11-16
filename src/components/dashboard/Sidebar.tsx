'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarIcon,
  PlusCircleIcon,
  ListBulletIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon as LogoutIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Calendar', href: '/payment/success', icon: CalendarIcon },
  { name: 'Create Event', href: '/payment/success/create', icon: PlusCircleIcon },
  { name: 'View Events', href: '/payment/success/events', icon: ListBulletIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="hidden md:flex md:shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">Event Scheduler</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1 bg-white">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 ${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <UserCircleIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name || 'User'}
                </p>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <LogoutIcon className="h-4 w-4 mr-1" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
