import {
  type AppLocale,
  DEFAULT_LOCALE,
  getLocaleFromRequest,
} from '@/lib/i18n-helper/locale';
import { type TranslationDictionary, i18n } from '@better-auth/i18n';

export const authErrorTranslations = {
  en: {
    INVALID_EMAIL: 'Invalid email format',
    INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
    EMAIL_NOT_VERIFIED:
      'Your email is not verified. Please check your email inbox.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
    INVALID_TOKEN:
      'This reset link is invalid or has expired. Please request a new one.',
  },
  id: {
    INVALID_EMAIL: 'Format email tidak valid',
    INVALID_EMAIL_OR_PASSWORD: 'Email atau kata sandi tidak valid.',
    EMAIL_NOT_VERIFIED:
      'Email Anda belum diverifikasi. Silakan cek inbox email Anda.',
    PASSWORD_TOO_SHORT: 'Kata sandi minimal 8 karakter',
    INVALID_TOKEN:
      'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.',
  },
} satisfies Record<AppLocale, TranslationDictionary>;

export const authI18n = i18n({
  defaultLocale: DEFAULT_LOCALE,
  detection: ['callback', 'header'],
  getLocale: (ctx) => getLocaleFromRequest(ctx.request),
  translations: authErrorTranslations,
});
