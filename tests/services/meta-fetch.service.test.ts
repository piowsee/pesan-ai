import * as retryableFetch from '@/lib/fetch-with-retry';
import { logError, logger } from '@/lib/logger';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/meta-fetch.service');

describe('MetaFetchService', { tags: ['backend'] }, () => {
  const VALID_CODE = 'auth-code-abc';
  const WABA_ID = 'meta-waba-001';
  const USER_ID = 'user-cuid-001';
  const PHONE_NUMBER_ID = 'meta-phone-001';

  beforeEach(() => {
    vi.spyOn(retryableFetch, 'sleep').mockResolvedValue(undefined);

    global.fetch = vi.fn().mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('oauth/access_token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'sys-user-token-xyz',
            token_type: 'bearer',
          }),
        } as Response;
      }

      if (url.endsWith(`/${WABA_ID}`)) {
        return {
          ok: true,
          json: async () => ({ name: 'Test Salon' }),
        } as Response;
      }

      if (url.includes(`/${WABA_ID}/phone_numbers`)) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: PHONE_NUMBER_ID,
                display_phone_number: '+6281234567890',
                verified_name: 'Test Bot',
                code_verification_status: 'VERIFIED',
                quality_rating: 'GREEN',
              },
            ],
          }),
        } as Response;
      }

      if (url.endsWith(`/${PHONE_NUMBER_ID}/whatsapp_business_profile`)) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                business_profile: {
                  messaging_product: 'whatsapp',
                  address: 'business-address',
                  description: 'business-description',
                  vertical: 'business-industry',
                  about: 'profile-about-text',
                  email: 'business-email',
                  websites: ['https://website-1', 'https://website-2'],
                  profile_picture_url: '<PROFILE_PICTURE_URL>',
                },
              },
            ],
          }),
        } as Response;
      }

      if (url.endsWith('/register')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      if (url.endsWith('/deregister')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      if (url.endsWith('/subscribed_apps')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exchangeCodeForToken', () => {
    it('returns the system user access token on success', async () => {
      await expect(
        MetaFetchService.exchangeCodeForToken(VALID_CODE, WABA_ID, USER_ID),
      ).resolves.toBe('sys-user-token-xyz');
    });

    it('throws the retryable Meta status to the API layer', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({
              error: {
                message: 'Meta token exchange is temporarily unavailable',
              },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.exchangeCodeForToken(VALID_CODE, WABA_ID, USER_ID),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Meta token exchange is temporarily unavailable',
      });
    });
  });

  describe('fetchWabaDetails', () => {
    it('returns the business name on success', async () => {
      await expect(
        MetaFetchService.fetchWabaDetails(WABA_ID, 'sys-user-token-xyz'),
      ).resolves.toEqual({
        businessName: 'Test Salon',
      });
    });

    it('logs and returns null business name on non-retryable failure', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith(`/${WABA_ID}`)) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({
              error: { message: 'Missing permission to read WABA details' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.fetchWabaDetails(WABA_ID, 'sys-user-token-xyz'),
      ).resolves.toEqual({
        businessName: null,
      });
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'MetaFetchService.fetchWabaDetails',
          wabaId: WABA_ID,
        }),
      );
    });
  });

  describe('fetchPhoneNumberDetails', () => {
    it('returns phone number data on success', async () => {
      await expect(
        MetaFetchService.fetchPhoneNumberDetails(WABA_ID, 'sys-user-token-xyz'),
      ).resolves.toEqual([
        expect.objectContaining({
          id: PHONE_NUMBER_ID,
          code_verification_status: 'VERIFIED',
        }),
      ]);
    });

    it('throws retryable failures', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({
              error: { message: 'Phone number lookup temporarily unavailable' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.fetchPhoneNumberDetails(WABA_ID, 'sys-user-token-xyz'),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Phone number lookup temporarily unavailable',
      });
    });
  });

  describe('fetchBusinessProfile', () => {
    it('returns the business profile object directly from data[0]', async () => {
      await expect(
        MetaFetchService.fetchBusinessProfile(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
        ),
      ).resolves.toEqual({
        messaging_product: 'whatsapp',
        address: 'business-address',
        description: 'business-description',
        vertical: 'business-industry',
        about: 'profile-about-text',
        email: 'business-email',
        websites: ['https://website-1', 'https://website-2'],
        profile_picture_url: '<PROFILE_PICTURE_URL>',
      });
    });

    it('logs and returns null on non-retryable failure', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith(`/${PHONE_NUMBER_ID}/whatsapp_business_profile`)) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({
              error: { message: 'Missing permission to read business profile' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.fetchBusinessProfile(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
        ),
      ).resolves.toBeNull();
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          action: 'MetaFetchService.fetchBusinessProfile',
          phoneNumberId: PHONE_NUMBER_ID,
        }),
      );
    });
  });

  describe('registerPhoneNumber', () => {
    it('posts the pin to the register endpoint', async () => {
      await expect(
        MetaFetchService.registerPhoneNumber(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
          '230601',
        ),
      ).resolves.toBeUndefined();

      const registerCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) => String(url).endsWith('/register'));
      expect(registerCall?.[1]?.method).toBe('POST');
      expect(JSON.parse(registerCall?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        pin: '230601',
      });
    });

    it('returns without throwing when Meta reports the number is already registered', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith('/register')) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({
              error: { message: 'Phone number is already registered' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.registerPhoneNumber(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
          '230601',
        ),
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith('/register')) {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Phone registration failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.registerPhoneNumber(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
          '230601',
        ),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Phone registration failed',
      });
    });
  });

  describe('deregisterPhoneNumber', () => {
    it('posts to the deregister endpoint', async () => {
      await expect(
        MetaFetchService.deregisterPhoneNumber(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
        ),
      ).resolves.toBeUndefined();

      expect(
        vi
          .mocked(global.fetch)
          .mock.calls.some(([url]) => String(url).endsWith('/deregister')),
      ).toBe(true);
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith('/deregister')) {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Deregister failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.deregisterPhoneNumber(
          PHONE_NUMBER_ID,
          'sys-user-token-xyz',
        ),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Deregister failed',
      });
    });
  });

  describe('subscribeWabaApps', () => {
    it('posts to the subscribed apps endpoint', async () => {
      await expect(
        MetaFetchService.subscribeWabaApps(WABA_ID, 'sys-user-token-xyz'),
      ).resolves.toBeUndefined();

      expect(
        vi
          .mocked(global.fetch)
          .mock.calls.some(([url]) => String(url).endsWith('/subscribed_apps')),
      ).toBe(true);
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith('/subscribed_apps')) {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Subscription failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.subscribeWabaApps(WABA_ID, 'sys-user-token-xyz'),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Subscription failed',
      });
    });
  });
});
