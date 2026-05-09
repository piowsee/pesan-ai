import { ApiError } from '@/lib/error';
import * as retryableFetch from '@/lib/fetch-with-retry';
import { WabaRepository } from '@/repositories/waba.repository';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/embedded-signup.service');

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

  const MOCK_WABA_DB = {
    id: 'db-waba-cuid',
    wabaId: WABA_ID,
    userId: USER_ID,
    systemUserToken: 'enc:fake-token',
    businessName: 'Test Salon',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    qualityRating: null,
    businessAddress: null,
    businessDescription: null,
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

      if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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

    vi.mocked(WabaRepository.upsertWaba).mockResolvedValue(
      MOCK_WABA_DB as never,
    );
    vi.mocked(WabaRepository.upsertPhoneNumbers).mockResolvedValue(
      MOCK_PHONE_DBS as never,
    );
    vi.mocked(WabaRepository.findByMetaWabaId).mockResolvedValue(null as never);
    vi.mocked(WabaRepository.findPhoneNumbersByMetaIds).mockResolvedValue(
      [] as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('completeEmbeddedSignup happy path', () => {
    it('exchanges the code, registers phone numbers, subscribes the app, and persists data', async () => {
      const result = await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(result.waba.id).toBe('db-waba-cuid');
      expect(result.phoneNumbers).toHaveLength(2);

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
      expect(registerCalls).toHaveLength(2);

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

    it('saves the encrypted access token on the WABA record', async () => {
      await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(WabaRepository.upsertWaba).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: WABA_ID,
          userId: USER_ID,
          systemUserToken: 'sys-user-token-xyz',
          businessName: 'Test Salon',
        }),
      );
    });

    it('upserts all returned phone numbers against the internal WABA id with per-number pins', async () => {
      await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(WabaRepository.upsertPhoneNumbers).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberDatas: META_PHONE_NUMBERS.map((phoneNumber, index) => ({
          ...phoneNumber,
          registrationPin: REGISTRATION_PINS[index],
        })),
      });
    });

    it('reuses the stored pin from our db before generating a new one', async () => {
      vi.mocked(WabaRepository.findPhoneNumbersByMetaIds).mockResolvedValue([
        {
          phoneNumberId: META_PHONE_NUMBERS[0].id,
          registrationPin: '991122',
        },
      ] as never);

      await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      const registerCalls = vi
        .mocked(global.fetch)
        .mock.calls.filter(([url]) => String(url).endsWith('/register'));

      expect(registerCalls).toHaveLength(2);
      expect(JSON.parse(registerCalls[0]?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        pin: '991122',
      });
      expect(JSON.parse(registerCalls[1]?.[1]?.body as string)).toEqual({
        messaging_product: 'whatsapp',
        pin: REGISTRATION_PINS[1],
      });

      expect(WabaRepository.upsertPhoneNumbers).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberDatas: [
          {
            ...META_PHONE_NUMBERS[0],
            registrationPin: '991122',
          },
          {
            ...META_PHONE_NUMBERS[1],
            registrationPin: REGISTRATION_PINS[1],
          },
        ],
      });
    });

    it('upserts the fresh pin after stored-pin recovery succeeds', async () => {
      vi.mocked(WabaRepository.findPhoneNumbersByMetaIds).mockResolvedValue([
        {
          phoneNumberId: META_PHONE_NUMBERS[0].id,
          registrationPin: '991122',
        },
      ] as never);

      const registerSpy = vi
        .spyOn(EmbeddedSignUpService, '_registerPhoneNumber')
        .mockImplementation(async (phoneNumberId, _token, pin) => {
          if (phoneNumberId === META_PHONE_NUMBERS[0].id && pin === '991122') {
            throw new ApiError('Stored pin no longer works', 502);
          }
        });
      const deregisterSpy = vi
        .spyOn(EmbeddedSignUpService, '_deregisterPhoneNumber')
        .mockResolvedValue(undefined);

      await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(registerSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
        '991122',
      );
      expect(deregisterSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
      );
      expect(registerSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
        REGISTRATION_PINS[0],
      );

      expect(WabaRepository.upsertPhoneNumbers).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberDatas: [
          {
            ...META_PHONE_NUMBERS[0],
            registrationPin: REGISTRATION_PINS[0],
          },
          {
            ...META_PHONE_NUMBERS[1],
            registrationPin: REGISTRATION_PINS[1],
          },
        ],
      });
    });

    it('continues when metadata lookups fail and still persists the WABA', async () => {
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

      const result = await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(result.waba).toBeDefined();
      expect(WabaRepository.upsertWaba).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: null,
        }),
      );
      expect(WabaRepository.upsertPhoneNumbers).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-cuid',
        phoneNumberDatas: [],
      });
    });

    it('retries transient Meta failures and still completes the signup flow', async () => {
      let tokenAttempts = 0;
      let subscribeAttempts = 0;

      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth/access_token')) {
          tokenAttempts += 1;

          if (tokenAttempts === 1) {
            throw new Error('Temporary token exchange network failure');
          }

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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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
          subscribeAttempts += 1;

          if (subscribeAttempts === 1) {
            return {
              ok: false,
              status: 503,
              statusText: 'Service Unavailable',
              json: async () => ({
                error: { message: 'Temporary subscription issue' },
              }),
            } as Response;
          }

          return {
            ok: true,
            json: async () => ({ success: true }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      const result = await EmbeddedSignUpService.completeEmbeddedSignup(
        VALID_CODE,
        WABA_ID,
        USER_ID,
      );

      expect(result.waba.id).toBe('db-waba-cuid');
      expect(tokenAttempts).toBe(2);
      expect(subscribeAttempts).toBe(2);
    });
  });

  describe('_exchangeCodeForToken', () => {
    it('returns the system user access token on success', async () => {
      await expect(
        EmbeddedSignUpService._exchangeCodeForToken(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
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
        EmbeddedSignUpService._exchangeCodeForToken(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Meta token exchange is temporarily unavailable',
      });
    });
  });

  describe('_registerPhoneNumberWithRecovery', () => {
    it('deregisters and retries with a fresh pin when stored-pin re-registration fails', async () => {
      const registerSpy = vi
        .spyOn(EmbeddedSignUpService, '_registerPhoneNumber')
        .mockImplementation(async (phoneNumberId, _token, pin) => {
          if (phoneNumberId === META_PHONE_NUMBERS[0].id && pin === '991122') {
            throw new ApiError('Stored pin no longer works', 502);
          }
        });
      const deregisterSpy = vi
        .spyOn(EmbeddedSignUpService, '_deregisterPhoneNumber')
        .mockResolvedValue(undefined);

      const result =
        await EmbeddedSignUpService._registerPhoneNumberWithRecovery(
          {
            ...META_PHONE_NUMBERS[0],
            registrationPin: '991122',
            encryptedRegistrationPin: 'enc:991122',
            fallbackRegistrationPin: REGISTRATION_PINS[0],
            fallbackEncryptedRegistrationPin: `enc:${REGISTRATION_PINS[0]}`,
          },
          'sys-user-token-xyz',
        );

      expect(registerSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
        '991122',
      );
      expect(deregisterSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
      );
      expect(registerSpy).toHaveBeenCalledWith(
        META_PHONE_NUMBERS[0].id,
        'sys-user-token-xyz',
        REGISTRATION_PINS[0],
      );
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'This WhatsApp Business Account is already connected to another user',
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(WabaRepository.upsertWaba).not.toHaveBeenCalled();
      expect(WabaRepository.upsertPhoneNumbers).not.toHaveBeenCalled();
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          'bad-code',
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('throws ApiError(500) when NEXT_PUBLIC_META_APP_ID env var is missing', async () => {
      const original = process.env.NEXT_PUBLIC_META_APP_ID;
      delete process.env.NEXT_PUBLIC_META_APP_ID;

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({ status: 500 });

      process.env.NEXT_PUBLIC_META_APP_ID = original;
    });

    it('throws ApiError(500) when META_APP_SECRET env var is missing', async () => {
      const original = process.env.META_APP_SECRET;
      delete process.env.META_APP_SECRET;

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('throws ApiError(502) when Meta phone registration fails', async () => {
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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toThrow(ApiError);

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Phone registration failed',
      });
    });

    it('tries to deregister and recover when a new phone registration fails without a stored pin', async () => {
      let registerAttempts = 0;

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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: true,
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        if (url.endsWith('/register')) {
          registerAttempts += 1;

          if (registerAttempts === 1) {
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

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).resolves.toMatchObject({
        waba: expect.objectContaining({
          id: 'db-waba-cuid',
        }),
      });

      expect(
        vi
          .mocked(global.fetch)
          .mock.calls.some(([url]) => String(url).endsWith('/deregister')),
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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({ status: 502, message: 'Subscription failed' });
    });

    it('throws retryable metadata failures instead of swallowing them', async () => {
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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
          return {
            ok: true,
            json: async () => ({ data: META_PHONE_NUMBERS }),
          } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).rejects.toMatchObject({
        status: 503,
        message: 'WABA details temporarily unavailable',
      });
    });

    it('does not throw non-retryable metadata failures to the API layer', async () => {
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

        if (url.endsWith(`/${WABA_ID}/phone_numbers`)) {
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
        EmbeddedSignUpService.completeEmbeddedSignup(
          VALID_CODE,
          WABA_ID,
          USER_ID,
        ),
      ).resolves.toMatchObject({
        waba: expect.objectContaining({
          id: 'db-waba-cuid',
        }),
      });

      expect(WabaRepository.upsertWaba).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: null,
        }),
      );
    });
  });
});
