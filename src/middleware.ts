import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Debug function to log middleware activity
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware]', ...args);
  }
};

// Update routes to include the /event-scheduler prefix
const protectedRoutes = ['/event-scheduler/dashboard', '/dashboard', '/event-scheduler'];
// Payment success page is public to allow users to see the success page after payment
const publicPaymentRoutes = ['/payment/success'];
// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/confirmation',
  '/payment',
  '/success',
  '/registration-success',
  // Static assets and API routes
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/assets',
  '/api/auth',
  // Keep existing routes for backward compatibility
  '/event-scheduler/login',
  '/test-auth'
];

const protectedApiRoutes = ['/api/tenants'];
const publicApiRoutes = [
  '/api/test', 
  '/api/db-test', 
  '/api/tenants-v2', 
  '/api/auth',
  '/api/test-connection',
  '/_next/static',
  '/_next/image'
];

// These API routes require authentication but are handled by NextAuth
const authenticatedApiRoutes = [
  '/api/assignments',
  '/api/assignments/',
  '/api/assignments/rating',
  '/api/assignments/[id]',
  '/api/assignments/[id]/rating'
];

// List of cookie names that should be passed through
const allowedCookies = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
  'next-auth.callback-url',
  'next-auth.csrf-token'
];

// Helper to normalize paths for comparison
const normalizePath = (path: string) => {
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  
  // Log cookies for debugging
  const cookies = request.cookies.getAll();
  console.log('Cookies in request:', cookies);
  
  // Skip middleware for static files, _next paths, and API routes that don't need auth
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Get the token with the latest options
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  const isAuthenticated = !!token;
  debug(`Path: ${pathname}`, { isAuthenticated, hasToken: !!token });
  
  // Log session for debugging
  if (token) {
    const expires = token.exp ? new Date(Number(token.exp) * 1000).toISOString() : 'no expiry';
    debug('Session token:', {
      userId: token.sub,
      email: token.email,
      expires,
    });
  }

  // Handle API routes
  if (pathname.startsWith('/api')) {
    // Skip middleware for public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      debug(`Allowing public API access to: ${pathname}`);
      return NextResponse.next();
    }
    
    // Handle authenticated API routes
    if (authenticatedApiRoutes.some(route => 
      pathname === route || 
      pathname.startsWith(`${route}/`) ||
      pathname.match(new RegExp(`^${route.replace(/\[.*?\]/g, '\\d+')}(/|$)`))
    )) {
      debug(`Checking auth for API route: ${pathname}`);
      if (!isAuthenticated) {
        debug(`Unauthenticated access to protected API: ${pathname}`);
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      debug(`Allowing authenticated API access to: ${pathname}`);
      return NextResponse.next();
    }
    
    // For authenticated API routes, ensure cookies are passed through
    if (authenticatedApiRoutes.some(route => pathname.startsWith(route))) {
      const response = NextResponse.next();
      
      // Ensure session cookies are passed through
      allowedCookies.forEach(cookieName => {
        const cookieValue = request.cookies.get(cookieName)?.value;
        if (cookieValue) {
          response.cookies.set({
            name: cookieName,
            value: cookieValue,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        }
      });
      
      return response;
    }
    
    // Check if the API route is protected or requires authentication
    const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));
    const isAuthenticatedApiRoute = authenticatedApiRoutes.some(route => 
      pathname.startsWith(route) || 
      pathname.startsWith('/api/assignments/')
    );
    
    if ((isProtectedApiRoute || isAuthenticatedApiRoute) && !isAuthenticated) {
      debug(`Blocked unauthorized API access to: ${pathname}`);
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Please sign in to access this resource',
          path: pathname,
          authenticated: isAuthenticated
        },
        { status: 401 }
      );
    }
    
    // Add CORS headers for all API routes
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // Normalize the path for comparison
  const normalizedPath = normalizePath(pathname);
  debug(`Processing path: ${normalizedPath}`, { isAuthenticated });

  // Skip middleware for public routes
  const isPublicRoute = publicRoutes.some(route => 
    normalizedPath === normalizePath(route) || 
    normalizedPath.startsWith(route + '/') ||
    route.endsWith('*') && normalizedPath.startsWith(route.slice(0, -1))
  );
  
  const isPublicPaymentRoute = publicPaymentRoutes.some(route => 
    normalizedPath.startsWith(normalizePath(route))
  );
  
  if (isPublicRoute || isPublicPaymentRoute) {
    // If user is already authenticated and tries to access login/register, redirect to dashboard
    const isAuthPage = [
      '/event-scheduler/login', 
      '/login', 
      '/register'
    ].includes(normalizedPath);
    
    if (isAuthenticated && isAuthPage) {
      debug(`Already authenticated, redirecting from ${normalizedPath} to dashboard`);
      return NextResponse.redirect(new URL('/event-scheduler/dashboard', origin));
    }
    
    debug(`Allowing access to ${isPublicRoute ? 'public' : 'payment'} route: ${normalizedPath}`);
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => {
    const normalizedRoute = normalizePath(route);
    return (
      normalizedPath === normalizedRoute || 
      normalizedPath.startsWith(`${normalizedRoute}/`) ||
      (route.endsWith('*') && normalizedPath.startsWith(route.slice(0, -1)))
    );
  });

  // Handle protected routes
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      debug(`Redirecting to login from protected route: ${normalizedPath}`);
      const loginUrl = new URL('/event-scheduler/login', origin);
      loginUrl.searchParams.set('callbackUrl', normalizedPath);
      return NextResponse.redirect(loginUrl);
    }
    
    // User is authenticated and accessing a protected route
    debug(`Allowing access to protected route: ${normalizedPath}`);
    return NextResponse.next();
  }

  // For all other routes, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/tenants/).*)",
  ],
};
