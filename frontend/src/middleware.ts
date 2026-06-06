import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isDashboardRoute =
    pathname.startsWith('/officer') ||
    pathname.startsWith('/vendor') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/admin');

  // 1. If not authenticated and attempting dashboard, redirect to login
  if (isDashboardRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Let users access login/signup pages directly even if a token is present in the browser cookies.

  // 3. Prevent unauthorized role access to sub-dashboards
  if (token && role) {
    if (pathname.startsWith('/officer')) {
      const isInvoice = pathname.startsWith('/officer/invoices');
      const isVendorOrCompare = pathname.startsWith('/officer/vendors') || pathname.includes('/compare');
      if (isInvoice) {
        // Allow all system roles: admin, officer, vendor, manager
      } else if (isVendorOrCompare) {
        if (role !== 'admin' && role !== 'officer' && role !== 'manager') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } else {
        if (role !== 'admin' && role !== 'officer') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
    if (pathname.startsWith('/vendor') && role !== 'vendor') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/manager') && role !== 'manager' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
