import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');

  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
