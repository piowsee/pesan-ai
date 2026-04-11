import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  const pathName = request.nextUrl.pathname;

  const isLoginRoute = pathName.startsWith('/login');
  const isProtectedRoute =
    pathName.startsWith('/dashboard') || pathName.startsWith('/admin');

  // Protect secure routes when entirely unauthenticated
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Auto-redirect authenticated users away from the login page
  if (sessionCookie && isLoginRoute) {
    if (request.nextUrl.searchParams.get('session_expired') === 'true') {
      const response = NextResponse.next();

      const cookieOptions = {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax' as const,
      };

      const prefix = isProd ? '__Secure-' : '';

      response.cookies.set(
        `${prefix}better-auth.session_token`,
        '',
        cookieOptions,
      );
      response.cookies.set(
        `${prefix}better-auth.session_data`,
        '',
        cookieOptions,
      );

      return response;
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
