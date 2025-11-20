'use client';

import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import './globals.css';
import DynamicTenantHeader from '@/app/components/DynamicTenantHeader';

// Disable SSR for the entire app to avoid hydration issues
// This is a workaround for Next.js 13+ with NextAuth
if (typeof window !== 'undefined') {
  // Client-side only code
  console.log('Running in browser environment');
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.variable} font-sans h-full`}>
        <SessionProvider>
          <AuthProvider>
            <div className="min-h-full">
              {children}
            </div>
            <Toaster position="top-right" />
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}