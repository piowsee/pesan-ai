import { routing } from '@/i18n/routing';
import { DEFAULT_LOCALE } from '@/lib/i18n-helper/locale';
import { getSessionCookie } from 'better-auth/cookies';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';
const localePrefixRegex = /^\/(id|en)(?=\/|$)/;

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: 'pesan-ai',
  });

  const pathName = request.nextUrl.pathname;
  const localePrefix =
    pathName.match(localePrefixRegex)?.[0] ?? `/${DEFAULT_LOCALE}`;
  const normalizedPath = pathName.replace(localePrefixRegex, '') || '/';

  const isLoginRoute = normalizedPath.startsWith('/login');
  const isDashboardRoute = normalizedPath.startsWith('/dashboard');

  // Protect secure routes when entirely unauthenticated
  if (!sessionCookie && isDashboardRoute) {
    return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url));
  }

  // Expired-session returns clear auth cookies here; valid login redirects use a fresh session check in the login page.
  if (sessionCookie && isLoginRoute) {
    if (request.nextUrl.searchParams.get('session_expired') === 'true') {
      const response = intlMiddleware(request);

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
        `${prefix}pesan-ai.session_token`,
        '',
        cookieOptions,
      );
      response.cookies.set(`${prefix}pesan-ai.session_data`, '', cookieOptions);

      return response;
    } else {
      return NextResponse.redirect(
        new URL(`${localePrefix}/dashboard/chat`, request.url),
      );
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // matcher: ['/dashboard/:path*', '/admin/:path*', '/id/login', '/en/login'],
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
