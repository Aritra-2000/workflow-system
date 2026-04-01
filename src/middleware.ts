import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/projects/:path*',
    '/api/tickets/:path*',
    '/api/notifications/:path*',
    '/api/superuser/:path*'
  ]
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  if (pathname === '/' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie?.value) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  
  // Add session cookie to headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-cookie', sessionCookie.value);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}