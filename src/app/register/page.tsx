'use client';

import dynamic from 'next/dynamic';

const RegisterForm = dynamic(
  () => import('./register-form'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }
);

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <RegisterForm />
    </div>
  );
}