'use client';

import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import './globals.css';

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
              <nav className="bg-white shadow-sm py-2">
                <div className="w-full max-w-6xl mx-auto px-2">
                  <div className="flex items-center justify-between">
                    {/* Left side image */}
                    <div className="flex items-center">
                      <img src="/kalam.jpg" alt="APJ" className="h-20 w-auto object-contain" />
                    </div>
                    
                    {/* Center heading with images */}
                    <div className="flex-1 px-4">
                      <div className="flex items-center justify-center space-x-6">
                        <img src="/globe.jpeg" alt="Globe" className="h-20 w-auto object-contain" />
                        <div className="text-center space-y-0.5">
                          <h1 className="text-xl md:text-2xl font-bold text-orange-600 leading-tight">LEAD INDIA FOUNDATION</h1>
                          <h2 className="text-lg md:text-xl font-bold text-red-900">&</h2> 
                          <h2 className="text-lg md:text-xl font-bold text-pink-800">TRSMA</h2>
                          <h3 className="text-xs md:text-sm font-bold text-green-700 leading-tight">PRESENT KALAM&apos;S BEST TEACHER AWARD</h3>
                        </div>
                        <img src="/trsma.jpeg" alt="TRSMA" className="h-20 w-auto object-contain" />
                      </div>
                    </div>
                    
                    {/* Right side image */}
                    <div className="flex items-center">
                      <img src="/apj.png" alt="Kalam" className="h-24 w-auto object-contain" />
                    </div>
                  </div>
                </div>
              </nav>
              {children}
            </div>
            <Toaster position="top-right" />
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}