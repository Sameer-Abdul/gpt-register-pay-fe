import type { NextConfig } from "next";

// Explicitly disable Turbopack to use webpack
process.env.TURBOPACK = '0';

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Configure CORS headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXTAUTH_URL || 'https://gpt-register-pay-be.onrender.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
  
  // Proxy API requests to NestJS backend
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return [
      // API routes
      {
        source: '/api/assignments/:path*',
        destination: `${apiUrl}/assignments/:path*`,
      },
      // Auth routes
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // Proxy all other API routes to the backend
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      }
    ];
  },
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://gpt-register-pay-be.onrender.com',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://gpt-register-pay-be.onrender.com',
  },
  
  // Webpack configuration (only used when not using Turbopack)
  webpack: (config, { isServer, dev, webpack }) => {
    // Only apply to client-side bundles
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/backend': false
      };
    }
    
    // Add custom webpack configurations here
    
    return config;
  },
  
  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  
  // Configure experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // Disable React Strict Mode to prevent double rendering in development
  reactStrictMode: false,
};

export default nextConfig;
