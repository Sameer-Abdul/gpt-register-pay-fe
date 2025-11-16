import type { NextConfig } from "next";

// Configuration for both Webpack and Turbopack
const nextConfig: NextConfig = {
  // Explicitly enable Turbopack with empty config
  turbopack: {},
  // Enable React compiler
  reactCompiler: true,
  
  // Configure CORS headers
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXTAUTH_CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',
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
  
  // Proxy API requests to NestJS backend in development
  async rewrites() {
    const isProduction = process.env.NODE_ENV === 'production';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return [
      // API routes
      {
        source: '/api/assignments/:path*',
        destination: `${apiUrl}/assignments/:path*`,
      },
      // Auth routes - handled by NextAuth in the frontend
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // In production, you might want to proxy all /api/* to your backend
      ...(isProduction ? [{
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      }] : []),
    ];
  },
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
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
  
  // Experimental features configuration
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // Disable React Strict Mode to prevent double rendering in development
  reactStrictMode: false,
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Remove the deprecated 'target' option as it's not needed in modern Next.js
  // Remove the deprecated 'future' option as it's now the default
};

export default nextConfig;
