import { logger } from '@/lib/server/logger';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type BetterFetchMockConfig = {
  baseURL?: string;
  retry?: number;
};

const betterFetchMocks = vi.hoisted(() => {
  const state = {
    createFetchConfig: undefined as BetterFetchMockConfig | undefined,
    metaFetchMock: vi.fn(),
    createFetchMock: vi.fn(),
  };

  state.createFetchMock.mockImplementation((config) => {
    state.createFetchConfig = config;
    return state.metaFetchMock;
  });

  return state;
});

vi.mock('@better-fetch/fetch', () => ({
  createFetch: betterFetchMocks.createFetchMock,
}));

vi.unmock('@/services/meta-fetch.service');

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

type FetchMockResponse = {
  ok: boolean;
  status?: number;
  statusText?: string;
  json: () => Promise<unknown>;
};

type BetterFetchMockOptions = {
  auth?: { type: string; token?: string };
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
};

function buildFetchInit(options: BetterFetchMockOptions = {}): RequestInit {
  const headers = { ...options.headers };
  let body = options.body as BodyInit | undefined;

  if (options.auth?.type === 'Bearer' && options.auth.token) {
    headers.Authorization = `Bearer ${options.auth.token}`;
  }

  if (
    options.body !== undefined &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData)
  ) {
    headers['Content-Type'] ??= 'application/json';
    body = JSON.stringify(options.body);
  }

  return {
    method: options.method,
    headers,
    body,
  };
}

async function fetchThroughBetterFetchMock(
  path: string,
  options: BetterFetchMockOptions = {},
) {
  const response = (await global.fetch(
    `${GRAPH_BASE}${path}`,
    buildFetchInit(options),
  )) as FetchMockResponse;

  if (response.ok) {
    return { data: await response.json(), error: null };
  }

  const errorBody = await response.json();

  return {
    data: null,
    error: {
      ...(typeof errorBody === 'object' && errorBody !== null
        ? errorBody
        : { message: String(errorBody) }),
      status: response.status,
      statusText: response.statusText ?? '',
    },
  };
}

describe('MetaFetchService', { tags: ['backend'] }, () => {
  const VALID_CODE = 'auth-code-abc';
  const WABA_ID = 'meta-waba-001';
  const USER_ID = 'user-cuid-001';
  const PHONE_NUMBER_ID = 'meta-phone-001';

  beforeEach(() => {
    betterFetchMocks.metaFetchMock.mockReset();
    betterFetchMocks.metaFetchMock.mockImplementation(
      fetchThroughBetterFetchMock,
    );

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

  it('configures Better Fetch for Meta Graph retries', () => {
    expect(betterFetchMocks.createFetchConfig).toMatchObject({
      baseURL: GRAPH_BASE,
      retry: 3,
    });
  });

  describe('exchangeCodeForToken', () => {
    it('returns the system user access token on success', async () => {
      await expect(
        MetaFetchService.exchangeCodeForToken({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
        }),
      ).resolves.toBe('sys-user-token-xyz');

      expect(betterFetchMocks.metaFetchMock).toHaveBeenCalledWith(
        '/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          body: {
            client_id: 'test-app-id',
            client_secret: 'app-secret',
            grant_type: 'authorization_code',
            code: VALID_CODE,
          },
        }),
      );
    });

    it('wraps Meta token exchange failures as ApiError(502)', async () => {
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
        MetaFetchService.exchangeCodeForToken({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Meta token exchange is temporarily unavailable',
      });
    });
  });

  describe('fetchWabaDetails', () => {
    it('returns the business name on success', async () => {
      await expect(
        MetaFetchService.fetchWabaDetails({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
      ).resolves.toEqual({
        businessName: 'Test Salon',
      });
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
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
        MetaFetchService.fetchWabaDetails({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Missing permission to read WABA details',
      });
    });
  });

  describe('fetchPhoneNumberDetails', () => {
    it('returns phone number data on success', async () => {
      await expect(
        MetaFetchService.fetchPhoneNumberDetails({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: PHONE_NUMBER_ID,
          code_verification_status: 'VERIFIED',
        }),
      ]);
    });

    it('wraps Meta failures as ApiError(502)', async () => {
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
        MetaFetchService.fetchPhoneNumberDetails({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Phone number lookup temporarily unavailable',
      });
    });
  });

  describe('fetchBusinessProfile', () => {
    it('returns the business profile object directly from data[0]', async () => {
      await expect(
        MetaFetchService.fetchBusinessProfile({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
        }),
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

    it('wraps non-retryable failures as ApiError(502)', async () => {
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
        MetaFetchService.fetchBusinessProfile({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Missing permission to read business profile',
      });
    });
  });

  describe('registerPhoneNumber', () => {
    it('posts the pin to the register endpoint', async () => {
      await expect(
        MetaFetchService.registerPhoneNumber({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          pin: '230601',
        }),
      ).resolves.toBeUndefined();

      const registerCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) => String(url).endsWith('/register'));
      expect(registerCall?.[1]?.method).toBe('POST');
      expect(JSON.parse(registerCall?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        pin: '230601',
      });

      const betterFetchRegisterCall =
        betterFetchMocks.metaFetchMock.mock.calls.find(([path]) =>
          String(path).endsWith('/register'),
        );
      expect(betterFetchRegisterCall?.[1]).toMatchObject({
        method: 'POST',
        auth: { type: 'Bearer', token: 'sys-user-token-xyz' },
        body: {
          messaging_product: 'whatsapp',
          pin: '230601',
        },
      });
      expect(betterFetchRegisterCall?.[1]).not.toHaveProperty('options');
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
        MetaFetchService.registerPhoneNumber({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          pin: '230601',
        }),
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
        MetaFetchService.registerPhoneNumber({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          pin: '230601',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Phone registration failed',
      });
    });
  });

  describe('setPhoneNumberPin', () => {
    it('posts to the phone number endpoint to set the pin', async () => {
      await expect(
        MetaFetchService.setPhoneNumberPin({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          pin: '998877',
        }),
      ).resolves.toBeUndefined();

      const registerCall = vi
        .mocked(global.fetch)
        .mock.calls.find(
          ([url, options]) =>
            String(url).endsWith(`/${PHONE_NUMBER_ID}`) &&
            options?.method === 'POST',
        );
      expect(registerCall).toBeDefined();
      expect(JSON.parse(registerCall?.[1]?.body as string)).toEqual({
        pin: '998877',
      });
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input, options) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith(`/${PHONE_NUMBER_ID}`) && options?.method === 'POST') {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Set pin failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.setPhoneNumberPin({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          pin: '998877',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Set pin failed',
      });
    });
  });

  describe('deregisterPhoneNumber', () => {
    it('posts to the deregister endpoint', async () => {
      await expect(
        MetaFetchService.deregisterPhoneNumber({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
        }),
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
        MetaFetchService.deregisterPhoneNumber({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Deregister failed',
      });
    });
  });

  describe('subscribeWabaApps', () => {
    it('posts to the subscribed apps endpoint', async () => {
      await expect(
        MetaFetchService.subscribeWabaApps({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
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
        MetaFetchService.subscribeWabaApps({
          wabaId: WABA_ID,
          token: 'sys-user-token-xyz',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Subscription failed',
      });
    });
  });

  describe('createPhoneNumber', () => {
    it('posts to the phone numbers endpoint and returns the ID', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: true,
            json: async () => ({ id: 'new-phone-id' }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.createPhoneNumber({
          countryCode: '62',
          phoneNumber: '81234567890',
          token: 'sys-user-token-xyz',
          wabaId: WABA_ID,
          name: 'New Bot',
        }),
      ).resolves.toEqual({ phoneNumberId: 'new-phone-id' });

      const createCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) =>
          String(url).endsWith(`/${WABA_ID}/phone_numbers`),
        );
      expect(createCall?.[1]?.method).toBe('POST');
      expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
        cc: '62',
        phone_number: '81234567890',
        verified_name: 'New Bot',
      });
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Phone creation failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.createPhoneNumber({
          countryCode: '62',
          phoneNumber: '81234567890',
          token: 'sys-user-token-xyz',
          wabaId: WABA_ID,
          name: 'New Bot',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Phone creation failed',
      });
    });
  });

  describe('requestVerificationCode', () => {
    it('requests the verification code and returns success', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/request_code')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.requestVerificationCode({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          codeMethod: 'SMS',
          language: 'en_US',
        }),
      ).resolves.toEqual({ success: true });

      const requestCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) => String(url).includes('/request_code'));
      expect(requestCall?.[1]?.method).toBe('POST');
    });
  });

  describe('verifyCode', () => {
    it('verifies the code and returns success', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/verify_code')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.verifyCode({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'sys-user-token-xyz',
          code: '123456',
        }),
      ).resolves.toEqual({ success: true });

      const verifyCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) => String(url).includes('/verify_code'));
      expect(verifyCall?.[1]?.method).toBe('POST');
    });
  });

  describe('sendTextMessage', () => {
    it('sends message successfully and returns message info', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/messages')) {
          return {
            ok: true,
            json: async () => ({
              messages: [{ id: 'wamid.123' }],
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const result = await MetaFetchService.sendTextMessage({
        phoneNumberId: PHONE_NUMBER_ID,
        token: 'sys-user-token-xyz',
        to: '+6281234567890',
        text: 'Hello from test',
      });

      expect(result.status).toBe('sent');
      expect(result.messageId).toBe('wamid.123');

      const sendCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([url]) => String(url).includes('/messages'));
      expect(sendCall?.[1]?.method).toBe('POST');
      expect(JSON.parse(sendCall?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+6281234567890',
        type: 'text',
        text: {
          preview_url: false,
          body: 'Hello from test',
        },
      });
    });

    it('wraps non-retryable failures as ApiError(502)', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/messages')) {
          return {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({
              error: { message: 'Recipient not found' },
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        MetaFetchService.sendTextMessage({
          phoneNumberId: PHONE_NUMBER_ID,
          token: 'token-1',
          to: '+123',
          text: 'Hi',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Recipient not found',
      });
    });
  });
});
