import { authErrorTranslations, authI18n } from '@/lib/auth/auth-i18n';
import { describe, expect, it } from 'vitest';

describe('authI18n', () => {
  it('registers english and indonesian auth error translations', () => {
    expect(authErrorTranslations.en.INVALID_EMAIL).toBe('Invalid email format');
    expect(authErrorTranslations.en.INVALID_EMAIL_OR_PASSWORD).toBe(
      'Invalid email or password.',
    );
    expect(authErrorTranslations.en.EMAIL_NOT_VERIFIED).toBe(
      'Your email is not verified. Please check your email inbox.',
    );

    expect(authErrorTranslations.id.INVALID_EMAIL).toBe(
      'Format email tidak valid',
    );
    expect(authErrorTranslations.id.INVALID_EMAIL_OR_PASSWORD).toBe(
      'Email atau kata sandi tidak valid.',
    );
    expect(authErrorTranslations.id.EMAIL_NOT_VERIFIED).toBe(
      'Email Anda belum diverifikasi. Silakan cek inbox email Anda.',
    );
  });

  it('detects the locale from the auth-page referer and falls back to english', async () => {
    expect(authI18n.options.defaultLocale).toBe('en');
    expect(authI18n.options.detection).toEqual(['callback', 'header']);

    await expect(
      Promise.resolve(
        authI18n.options.getLocale?.({
          request: new Request('http://localhost/api/auth/sign-in/email', {
            headers: {
              referer: 'http://localhost/id/login',
            },
          }),
        } as never),
      ),
    ).resolves.toBe('id');

    await expect(
      Promise.resolve(
        authI18n.options.getLocale?.({
          request: new Request('http://localhost/api/auth/sign-in/email'),
        } as never),
      ),
    ).resolves.toBe('en');
  });
});
