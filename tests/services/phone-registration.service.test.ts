import { ApiError } from '@/lib/error';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { PhoneRegistrationService } from '@/services/phone-registration.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/meta-fetch.service');

vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn().mockImplementation((val) => `enc:${val}`),
  decrypt: vi.fn().mockImplementation((val) => val.replace('enc:', '')),
}));

describe('PhoneRegistrationService', { tags: ['backend'] }, () => {
  const WABA_ID = 'meta-waba-123';
  const USER_ID = 'user-123';
  const PHONE_NUMBER_ID = 'phone-123';

  beforeEach(() => {
    vi.spyOn(WabaRepository, 'findByMetaWabaId').mockResolvedValue({
      id: 'db-waba-123',
      wabaId: WABA_ID,
      userId: USER_ID,
      systemUserToken: 'enc:sys-user-token',
    } as never);

    vi.spyOn(MetaFetchService, 'requestVerificationCode').mockResolvedValue({
      success: true,
    });

    vi.spyOn(MetaFetchService, 'verifyCode').mockResolvedValue({
      success: true,
    });

    vi.spyOn(MetaFetchService, 'registerPhoneNumber').mockResolvedValue(
      undefined,
    );

    vi.spyOn(MetaFetchService, 'fetchPhoneNumberDetails').mockResolvedValue([
      {
        id: PHONE_NUMBER_ID,
        display_phone_number: '+6281234567890',
        verified_name: 'Test Bot',
        code_verification_status: 'VERIFIED',
        quality_rating: 'GREEN',
      },
    ]);

    vi.spyOn(WabaRepository, 'upsertPhoneNumbers').mockResolvedValue(
      [] as never,
    );

    vi.spyOn(MetaFetchService, 'createPhoneNumber').mockResolvedValue({
      phoneNumberId: 'new-phone-id',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestVerificationCode', () => {
    it('requests the verification code via Meta API', async () => {
      const result = await PhoneRegistrationService.requestVerificationCode({
        phoneNumberId: PHONE_NUMBER_ID,
        wabaId: WABA_ID,
        userId: USER_ID,
        codeMethod: 'SMS',
        language: 'en_US',
      });

      expect(result).toEqual({ success: true });
      expect(MetaFetchService.requestVerificationCode).toHaveBeenCalledWith({
        phoneNumberId: PHONE_NUMBER_ID,
        token: 'sys-user-token',
        codeMethod: 'SMS',
        language: 'en_US',
      });
    });

    it('throws 404 if WABA is not found', async () => {
      vi.spyOn(WabaRepository, 'findByMetaWabaId').mockResolvedValue(null);

      await expect(
        PhoneRegistrationService.requestVerificationCode({
          phoneNumberId: PHONE_NUMBER_ID,
          wabaId: WABA_ID,
          userId: USER_ID,
        }),
      ).rejects.toThrow(ApiError);
    });

    it('throws 403 if WABA belongs to another user', async () => {
      vi.spyOn(WabaRepository, 'findByMetaWabaId').mockResolvedValue({
        id: 'db-waba-123',
        wabaId: WABA_ID,
        userId: 'other-user',
        systemUserToken: 'enc:sys-user-token',
      } as never);

      await expect(
        PhoneRegistrationService.requestVerificationCode({
          phoneNumberId: PHONE_NUMBER_ID,
          wabaId: WABA_ID,
          userId: USER_ID,
        }),
      ).rejects.toThrow('You are not authorised');
    });
  });

  describe('verifyAndRegister', () => {
    it('verifies the code, registers the number, and upserts to DB', async () => {
      vi.spyOn(
        PhoneRegistrationService,
        '_generateRegistrationPin',
      ).mockReturnValue('123456');

      const result = await PhoneRegistrationService.verifyAndRegister({
        phoneNumberId: PHONE_NUMBER_ID,
        wabaId: WABA_ID,
        userId: USER_ID,
        code: '654321',
      });

      expect(result).toEqual({ success: true });

      expect(MetaFetchService.verifyCode).toHaveBeenCalledWith({
        phoneNumberId: PHONE_NUMBER_ID,
        token: 'sys-user-token',
        code: '654321',
      });
      expect(MetaFetchService.registerPhoneNumber).toHaveBeenCalledWith({
        phoneNumberId: PHONE_NUMBER_ID,
        token: 'sys-user-token',
        pin: '123456',
      });
      expect(WabaRepository.upsertPhoneNumbers).toHaveBeenCalledWith({
        wabaDbId: 'db-waba-123',
        phoneNumberDatas: [
          {
            id: PHONE_NUMBER_ID,
            display_phone_number: '+6281234567890',
            verified_name: 'Test Bot',
            code_verification_status: 'VERIFIED',
            quality_rating: 'GREEN',
            registrationPin: 'enc:123456',
          },
        ],
      });
    });
  });

  describe('createPhoneNumber', () => {
    it('creates a new phone number via Meta API', async () => {
      const result = await PhoneRegistrationService.createPhoneNumber({
        wabaId: WABA_ID,
        userId: USER_ID,
        countryCode: '62',
        phoneNumber: '81234567890',
        name: 'New Bot',
      });

      expect(result).toEqual({ phoneNumberId: 'new-phone-id' });
      expect(MetaFetchService.createPhoneNumber).toHaveBeenCalledWith({
        countryCode: '62',
        phoneNumber: '81234567890',
        token: 'sys-user-token',
        wabaId: WABA_ID,
        name: 'New Bot',
      });
    });
  });
});
