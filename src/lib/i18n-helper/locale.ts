import { routing } from '@/i18n/routing';

export type AppLocale = (typeof routing.locales)[number];

export const DEFAULT_LOCALE: AppLocale = routing.defaultLocale;

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

function normalizePath(path: string) {
  if (!path || path === '/') {
    return '/';
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

function getLocaleFromPathname(pathname?: string | null): AppLocale | null {
  if (!pathname) {
    return null;
  }

  const localeSegment = normalizePath(pathname).split('/')[1];

  if (localeSegment && isAppLocale(localeSegment)) {
    return localeSegment;
  }

  return null;
}

function getPathnameFromUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

export function getLocaleFromRequest(request?: Request): AppLocale {
  const requestLocale = getLocaleFromPathname(getPathnameFromUrl(request?.url));

  if (requestLocale) {
    return requestLocale;
  }

  return getLocaleFromHeaders(request?.headers);
}

export function getLocaleFromHeaders(requestHeaders?: Headers): AppLocale {
  const pathname =
    requestHeaders?.get('next-url') ?? requestHeaders?.get('x-invoke-path');
  const headerLocale = getLocaleFromPathname(pathname);

  if (headerLocale) {
    return headerLocale;
  }

  const refererLocale = getLocaleFromPathname(
    getPathnameFromUrl(requestHeaders?.get('referer')),
  );

  if (refererLocale) {
    return refererLocale;
  }

  return DEFAULT_LOCALE;
}
