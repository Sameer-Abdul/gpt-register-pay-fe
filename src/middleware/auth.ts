import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/payment/success', '/api/events'];

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Redirect to login if no session
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify session and check license validity
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validate-license`, {
      headers: {
        'Authorization': `Bearer ${session.value}`
      }
    });

    if (!response.ok) {
      throw new Error('License validation failed');
    }

    const { isValid, isExpired } = await response.json();

    if (!isValid) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', isExpired ? 'license_expired' : 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-data', JSON.stringify({ session: session.value }));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/payment/success/:path*',
    '/api/events/:path*',
  ],
};
