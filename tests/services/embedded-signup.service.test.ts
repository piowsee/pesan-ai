import { ApiError } from '@/lib/api-helper/error';
import { encrypt } from '@/lib/server/encryption';
import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { SyncRequestRepository } from '@/repositories/sync-request.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';
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

vi.unmock('@/services/embedded-signup.service');
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

describe('EmbeddedSignUpService', { tags: ['backend'] }, () => {
  const VALID_CODE = 'auth-code-abc';
  const WABA_ID = 'meta-waba-001';
  const USER_ID = 'user-cuid-001';
  const REGISTRATION_PINS = ['230601', '230602'];

  const META_PHONE_NUMBERS = [
    {
      id: 'meta-phone-001',
      display_phone_number: '+6281234567890',
      verified_name: 'Test Bot 1',
      code_verification_status: 'VERIFIED',
      quality_rating: 'GREEN',
    },
    {
      id: 'meta-phone-002',
      display_phone_number: '+6289876543210',
      verified_name: 'Test Bot 2',
      code_verification_status: 'NOT_VERIFIED',
      quality_rating: 'YELLOW',
    },
  ];

  const META_BUSINESS_PROFILES = {
    [META_PHONE_NUMBERS[0].id]: {
      messaging_product: 'whatsapp' as const,
      address: 'business-address-1',
      description: 'business-description-1',
      vertical: 'BEAUTY',
      about: 'profile-about-text-1',
      email: 'business1@example.com',
      websites: ['https://website-1'],
      profile_picture_url: 'https://cdn.example.com/profile-1.jpg',
    },
    [META_PHONE_NUMBERS[1].id]: {
      messaging_product: 'whatsapp' as const,
      address: 'business-address-2',
      description: 'business-description-2',
      vertical: 'SPA',
      about: 'profile-about-text-2',
      email: 'business2@example.com',
      websites: ['https://website-2'],
      profile_picture_url: 'https://cdn.example.com/profile-2.jpg',
    },
  };

  const MOCK_WABA_DB = {
    id: 'db-waba-cuid',
    wabaId: WABA_ID,
    userId: USER_ID,
    systemUserToken: 'enc:fake-token',
    name: 'Test Salon',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    qualityRating: null,
  };

  const MOCK_PHONE_DBS = META_PHONE_NUMBERS.map((phoneNumber, index) => ({
    id: `db-phone-cuid-${index + 1}`,
    phoneNumberId: phoneNumber.id,
    wabaId: 'db-waba-cuid',
    displayPhoneNumber: phoneNumber.display_phone_number,
    verifiedName: phoneNumber.verified_name,
    registrationPin: REGISTRATION_PINS[index],
    codeVerificationStatus: phoneNumber.code_verification_status,
    qualityRating: phoneNumber.quality_rating,
    botEnabled: true,
    unreadCount: 0,
    botWebhookId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeEach(() => {
    let pinIndex = 0;
    vi.spyOn(
      EmbeddedSignUpService,
      '_generateRegistrationPin',
    ).mockImplementation(() => REGISTRATION_PINS[pinIndex++] ?? '999999');
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

      if (url.includes('?fields=display_phone_number')) {
        return {
          ok: true,
          json: async () => META_PHONE_NUMBERS[0],
        } as Response;
      }

      const matchedPhoneNumber = META_PHONE_NUMBERS.find((phoneNumber) =>
        url.endsWith(`/${phoneNumber.id}/whatsapp_business_profile`),
      );

      if (matchedPhoneNumber) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                business_profile: META_BUSINESS_PROFILES[matchedPhoneNumber.id],
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

      if (url.endsWith('/subscribed_apps')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    vi.mocked(WabaRepository.upsertWaba).mockResolvedValue(
      MOCK_WABA_DB as never,
    );
    vi.mocked(PhoneNumberRepository.upsertPhoneNumber).mockResolvedValue(
      MOCK_PHONE_DBS[0] as never,
    );
    vi.mocked(
      BusinessProfileRepository.upsertBusinessProfile,
    ).mockResolvedValue(MOCK_PHONE_DBS[0] as never);
    vi.mocked(WabaRepository.findByMetaWabaId).mockResolvedValue(null as never);
    vi.mocked(PhoneNumberRepository.findPhoneNumberByMetaId).mockResolvedValue(
      [] as never,
    );

    vi.spyOn(MetaFetchService, 'fetchPhoneNumberDetails').mockResolvedValue(
      META_PHONE_NUMBERS[0] as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('completeEmbeddedSignup happy path', () => {
    it('exchanges the code, registers phone numbers, subscribes the app, and persists data', async () => {
      const result = await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(result.waba.id).toBe('db-waba-cuid');
      expect(result.phoneNumbers).toHaveLength(1);

      const fetchMock = vi.mocked(global.fetch);
      const tokenCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('oauth/access_token'),
      );

      expect(tokenCall).toBeDefined();
      expect(tokenCall?.[1]?.method).toBe('POST');
      expect(JSON.parse(tokenCall?.[1]?.body as string)).toMatchObject({
        client_id: 'test-app-id',
        client_secret: 'app-secret',
        grant_type: 'authorization_code',
        code: VALID_CODE,
      });

      const registerCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/register'),
      );
      expect(registerCalls).toHaveLength(1);

      for (const [index, [, options]] of registerCalls.entries()) {
        expect(options?.method).toBe('POST');
        expect(options?.headers).toMatchObject({
          Authorization: 'Bearer sys-user-token-xyz',
          'Content-Type': 'application/json',
        });
        expect(JSON.parse(options?.body as string)).toEqual({
          messaging_product: 'whatsapp',
          pin: REGISTRATION_PINS[index],
        });
      }

      const subscribeCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith(`/${WABA_ID}/subscribed_apps`),
      );
      expect(subscribeCall).toBeDefined();
      expect(subscribeCall?.[1]).toMatchObject({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sys-user-token-xyz',
        },
      });
    });

    it('skips phone registration and triggers history sync for WhatsApp Business App coexistence', async () => {
      const registerPhoneNumberSpy = vi.spyOn(
        MetaFetchService,
        'registerPhoneNumber',
      );
      const syncRequestSpy = vi
        .spyOn(MetaFetchService, 'syncRequest')
        .mockResolvedValue({
          sync_type: 'history',
          request_id: 'sync-req-123',
        });

      const result = await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(registerPhoneNumberSpy).not.toHaveBeenCalled();
      expect(result.phoneNumbers).toHaveLength(1);
      expect(PhoneNumberRepository.upsertPhoneNumber).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberData: {
          ...META_PHONE_NUMBERS[0],
          registrationPin: REGISTRATION_PINS[0],
        },
      });

      expect(syncRequestSpy).toHaveBeenCalledTimes(2); // 1 phone number * 2 sync types
      expect(SyncRequestRepository.createSyncRequest).toHaveBeenCalledTimes(2);
      expect(SyncRequestRepository.createSyncRequest).toHaveBeenCalledWith({
        requestId: 'sync-req-123',
        syncType: 'history',
        phoneNumberId: MOCK_PHONE_DBS[0].id,
      });
    });

    it('continues when one syncRequest fails during coexistence signup (Promise.allSettled)', async () => {
      vi.spyOn(MetaFetchService, 'syncRequest').mockImplementation(
        async ({ phoneNumberId }) => {
          if (phoneNumberId === META_PHONE_NUMBERS[0].id) {
            throw new ApiError('Sync failed', 502);
          }
          return { sync_type: 'history', request_id: 'sync-req-456' };
        },
      );

      const result = await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(result.phoneNumbers).toHaveLength(1); // Still succeeds
      expect(SyncRequestRepository.createSyncRequest).toHaveBeenCalledTimes(0);
    });

    it('saves the encrypted access token on the WABA record', async () => {
      await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(encrypt).toHaveBeenCalledWith('sys-user-token-xyz');
      expect(WabaRepository.upsertWaba).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: WABA_ID,
          userId: USER_ID,
          systemUserToken: 'sys-user-token-xyz',
          name: 'Test Salon',
        }),
      );
    });

    it('upserts all returned phone numbers against the internal WABA id with per-number pins', async () => {
      await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(encrypt).toHaveBeenCalledWith(REGISTRATION_PINS[0]);
      expect(PhoneNumberRepository.upsertPhoneNumber).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberData: {
          ...META_PHONE_NUMBERS[0],
          registrationPin: REGISTRATION_PINS[0],
        },
      });

      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).toHaveBeenCalledWith({
        phoneNumberDbId: MOCK_PHONE_DBS[0].id,
        businessProfile:
          META_BUSINESS_PROFILES[MOCK_PHONE_DBS[0].phoneNumberId]!,
      });
    });

    it('reuses the stored pin from our db before generating a new one', async () => {
      vi.mocked(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        registrationPin: '991122',
      } as never);

      await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      const registerCalls = vi
        .mocked(global.fetch)
        .mock.calls.filter(([url]) => String(url).endsWith('/register'));

      expect(registerCalls).toHaveLength(1);
      expect(JSON.parse(registerCalls[0]?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        pin: '991122',
      });

      expect(PhoneNumberRepository.upsertPhoneNumber).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberData: {
          ...META_PHONE_NUMBERS[0],
          registrationPin: '991122',
        },
      });
      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).toHaveBeenCalledWith({
        phoneNumberDbId: MOCK_PHONE_DBS[0].id,
        businessProfile:
          META_BUSINESS_PROFILES[MOCK_PHONE_DBS[0].phoneNumberId]!,
      });
    });

    it('upserts the fresh pin after stored-pin recovery succeeds', async () => {
      vi.mocked(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        registrationPin: '991122',
      } as never);

      const registerSpy = vi
        .spyOn(MetaFetchService, 'registerPhoneNumber')
        .mockImplementation(async ({ phoneNumberId, pin }) => {
          if (phoneNumberId === META_PHONE_NUMBERS[0].id && pin === '991122') {
            throw new ApiError('Stored pin no longer works', 502);
          }
        });
      const setPhoneNumberPinSpy = vi
        .spyOn(MetaFetchService, 'setPhoneNumberPin')
        .mockResolvedValue(undefined);

      await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(registerSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: '991122',
      });
      expect(setPhoneNumberPinSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: REGISTRATION_PINS[0],
      });
      expect(registerSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: REGISTRATION_PINS[0],
      });

      expect(PhoneNumberRepository.upsertPhoneNumber).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberData: {
          ...META_PHONE_NUMBERS[0],
          registrationPin: REGISTRATION_PINS[0],
        },
      });
      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).toHaveBeenCalledWith({
        phoneNumberDbId: MOCK_PHONE_DBS[0].id,
        businessProfile:
          META_BUSINESS_PROFILES[MOCK_PHONE_DBS[0].phoneNumberId]!,
      });
    });

    it('throws ApiError when phone registration fails', async () => {
      vi.spyOn(
        EmbeddedSignUpService,
        '_registerPhoneNumberWithRecovery',
      ).mockImplementation(async ({ phoneNumber }) => {
        if (phoneNumber.id === META_PHONE_NUMBERS[0].id) {
          throw new ApiError('Phone registration failed', 502);
        }

        return phoneNumber;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toThrow(ApiError);
    });

    it('throws when metadata lookups fail with a network error', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
          } as Response;
        }

        if (url.endsWith('/subscribed_apps')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return Promise.reject(new Error('Network error'));
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toThrow('Network error');
    });

    it('skips profile upserts when Meta returns no business profile for a phone number', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
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
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (
          url.endsWith(`/${META_PHONE_NUMBERS[0].id}/whatsapp_business_profile`)
        ) {
          return {
            ok: true,
            json: async () => ({ data: [{ business_profile: null }] }),
          } as Response;
        }

        if (
          url.endsWith(`/${META_PHONE_NUMBERS[1].id}/whatsapp_business_profile`)
        ) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  business_profile:
                    META_BUSINESS_PROFILES[META_PHONE_NUMBERS[1].id],
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

        if (url.endsWith('/subscribed_apps')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await EmbeddedSignUpService.completeEmbeddedSignup({
        code: VALID_CODE,
        wabaId: WABA_ID,
        userId: USER_ID,
        phoneNumberId: META_PHONE_NUMBERS[0].id,
      });

      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).not.toHaveBeenCalled();
    });
  });

  describe('_registerPhoneNumberWithRecovery', () => {
    it('deregisters and retries with a fresh pin when stored-pin re-registration fails', async () => {
      const registerSpy = vi
        .spyOn(MetaFetchService, 'registerPhoneNumber')
        .mockImplementation(async ({ phoneNumberId, pin }) => {
          if (phoneNumberId === META_PHONE_NUMBERS[0].id && pin === '991122') {
            throw new ApiError('Stored pin no longer works', 502);
          }
        });
      const setPhoneNumberPinSpy = vi
        .spyOn(MetaFetchService, 'setPhoneNumberPin')
        .mockResolvedValue(undefined);

      const result =
        await EmbeddedSignUpService._registerPhoneNumberWithRecovery({
          phoneNumber: {
            ...META_PHONE_NUMBERS[0],
            registrationPin: '991122',
            encryptedRegistrationPin: 'enc:991122',
            fallbackRegistrationPin: REGISTRATION_PINS[0],
            fallbackEncryptedRegistrationPin: `enc:${REGISTRATION_PINS[0]}`,
          },
          token: 'sys-user-token-xyz',
        });

      expect(registerSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: '991122',
      });
      expect(setPhoneNumberPinSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: REGISTRATION_PINS[0],
      });
      expect(registerSpy).toHaveBeenCalledWith({
        phoneNumberId: META_PHONE_NUMBERS[0].id,
        token: 'sys-user-token-xyz',
        pin: REGISTRATION_PINS[0],
      });
      expect(result.registrationPin).toBe(REGISTRATION_PINS[0]);
      expect(result.encryptedRegistrationPin).toBe(
        `enc:${REGISTRATION_PINS[0]}`,
      );
    });
  });

  describe('completeEmbeddedSignup error paths', () => {
    it('throws ApiError(409) when the WABA already belongs to another user', async () => {
      vi.mocked(WabaRepository.findByMetaWabaId).mockResolvedValue({
        id: 'db-waba-other-user',
        wabaId: WABA_ID,
        userId: 'user-cuid-other',
      } as never);

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'This WhatsApp Business Account is already connected to another user',
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(WabaRepository.upsertWaba).not.toHaveBeenCalled();
      expect(PhoneNumberRepository.upsertPhoneNumber).not.toHaveBeenCalled();
    });

    it('throws ApiError(502) when Meta token exchange returns an error body', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              error: {
                message: 'Invalid OAuth access token',
                type: 'OAuthException',
                code: 190,
              },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: 'bad-code',
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('throws ApiError(500) when NEXT_PUBLIC_META_APP_ID env var is missing', async () => {
      const original = process.env.NEXT_PUBLIC_META_APP_ID;
      delete process.env.NEXT_PUBLIC_META_APP_ID;

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({ status: 500 });

      process.env.NEXT_PUBLIC_META_APP_ID = original;
    });

    it('throws ApiError(500) when META_APP_SECRET env var is missing', async () => {
      const original = process.env.META_APP_SECRET;
      delete process.env.META_APP_SECRET;

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({ status: 500 });

      process.env.META_APP_SECRET = original;
    });

    it('throws ApiError(502) when access_token is missing from the token exchange response', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ token_type: 'bearer' }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('throws ApiError when phone registration fails with a network error', async () => {
      // Removed mock since we don't expect it to be called if it fails before upserting

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
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
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (url.endsWith('/register')) {
          return {
            ok: false,
            json: async () => ({
              error: { message: 'Phone registration failed' },
            }),
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

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toThrow(ApiError);

      expect(PhoneNumberRepository.upsertPhoneNumber).not.toHaveBeenCalled();
    });

    it('sets a fallback pin and recovers when new phone registration fails', async () => {
      const registerAttemptsByPhoneNumberId = new Map<string, number>();

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
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
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (url.endsWith('/register')) {
          const phoneNumberId = META_PHONE_NUMBERS.find((phoneNumber) =>
            url.endsWith(`/${phoneNumber.id}/register`),
          )?.id;
          const registerAttempts =
            (registerAttemptsByPhoneNumberId.get(phoneNumberId ?? '') ?? 0) + 1;
          registerAttemptsByPhoneNumberId.set(
            phoneNumberId ?? '',
            registerAttempts,
          );

          if (
            phoneNumberId === META_PHONE_NUMBERS[0].id &&
            registerAttempts === 1
          ) {
            return {
              ok: false,
              status: 400,
              statusText: 'Bad Request',
              json: async () => ({
                error: { message: 'Phone registration failed' },
              }),
            } as Response;
          }

          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        if (
          url.endsWith(`/${META_PHONE_NUMBERS[0].id}`) ||
          url.endsWith(`/${META_PHONE_NUMBERS[1].id}`)
        ) {
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

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).resolves.toMatchObject({
        waba: expect.objectContaining({
          id: 'db-waba-cuid',
        }),
      });

      expect(
        vi
          .mocked(global.fetch)
          .mock.calls.some(
            ([url, options]) =>
              String(url).endsWith(`/${META_PHONE_NUMBERS[0].id}`) &&
              options?.method === 'POST',
          ),
      ).toBe(true);
    });

    it('continues when Meta reports the phone is already registered', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
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
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

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

        if (url.endsWith('/subscribed_apps')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).resolves.toMatchObject({
        waba: expect.objectContaining({
          id: 'db-waba-cuid',
        }),
      });
    });

    it('throws ApiError(502) when WABA app subscription fails', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
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
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (url.endsWith('/register')) {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        if (url.endsWith('/subscribed_apps')) {
          return {
            ok: false,
            json: async () => ({
              error: { message: 'Subscription failed' },
            }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({ status: 502, message: 'Subscription failed' });
    });

    it('throws ApiError(502) when metadata lookup fails', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
          } as Response;
        }

        if (url.endsWith(`/${WABA_ID}`)) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({
              error: { message: 'WABA details temporarily unavailable' },
            }),
          } as Response;
        }

        if (url.includes(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: true,
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'WABA details temporarily unavailable',
      });
    });

    it('throws ApiError(502) on non-retryable metadata failures', async () => {
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'sys-user-token-xyz' }),
          } as Response;
        }

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

        if (url.includes(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: true,
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (url.endsWith('/register')) {
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

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup({
          code: VALID_CODE,
          wabaId: WABA_ID,
          userId: USER_ID,
          phoneNumberId: META_PHONE_NUMBERS[0].id,
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Missing permission to read WABA details',
      });
    });
  });
});
