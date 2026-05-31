import { routing } from '@/i18n/routing';

export type AppLocale = (typeof routing.locales)[number];

export const DEFAULT_LOCALE: AppLocale = routing.defaultLocale;

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function getLocaleFromRequest(request?: Request): AppLocale {
  const referer = request?.headers.get('referer');

  if (referer) {
    const pathname = new URL(referer).pathname;
    const localeSegment = normalizePath(pathname).split('/')[1];

    if (localeSegment && isAppLocale(localeSegment)) {
      return localeSegment;
    }
  }

  return DEFAULT_LOCALE;
}
