export const SUPPORTED_LOCALES = ['id', 'en'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'id';

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

export function getDateLocale(locale: AppLocale): string {
  return locale === 'id' ? 'id-ID' : 'en-US';
}
