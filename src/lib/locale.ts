export const SUPPORTED_LOCALES = ['id', 'en'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export function isAppLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function stripLocalePrefix(pathname: string): string {
  const normalized = normalizePath(pathname);
  const segments = normalized.split('/');
  const firstSegment = segments[1];

  if (firstSegment && isAppLocale(firstSegment)) {
    const restPath = `/${segments.slice(2).join('/')}`;
    return restPath === '/' ? '/' : restPath;
  }

  return normalized;
}

export function toLocalePath(locale: AppLocale, path = '/'): string {
  const normalizedPath = stripLocalePrefix(path);

  if (normalizedPath === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPath}`;
}

export function getLocaleFromRequest(request?: Request): AppLocale {
  const referer = request?.headers.get('referer');

  if (referer) {
    const pathname = new URL(referer).pathname;
    const localeSegment = pathname.split('/')[1];

    if (localeSegment && isAppLocale(localeSegment)) {
      return localeSegment;
    }
  }

  return DEFAULT_LOCALE;
}

export function getDateLocale(locale: AppLocale): string {
  return locale === 'id' ? 'id-ID' : 'en-US';
}
