import { decrypt, encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logger } from '@/lib/logger';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { randomInt } from 'node:crypto';

/**
 * Service responsible for the manual phone number verification and
 * registration flow (as opposed to the Embedded Signup automatic flow).
 *
 * Flow:
 * 1. `requestVerificationCode` — triggers Meta to send an SMS/voice code.
 * 2. `verifyAndRegister` — verifies the code, then registers the number
 *    for WhatsApp Cloud API usage (identical to the Embedded Signup
 *    register step).
 */
export const PhoneRegistrationService = {
  /**
   * Step 1 – Request a verification code from Meta.
   *
   * Looks up the WABA to retrieve the stored System User Token, then
   * calls `POST /<phoneNumberId>/request_code`.
   */
  async requestVerificationCode(params: {
    phoneNumberId: string;
    wabaId: string;
    userId: string;
    codeMethod?: 'SMS' | 'VOICE';
    language?: string;
  }): Promise<{ success: boolean }> {
    const { phoneNumberId, wabaId, userId, codeMethod, language } = params;

    const { systemUserToken } = await this._getSystemUserToken({
      wabaId,
      userId,
    });

    logger.info('Requesting verification code for phone number', {
      phoneNumberId,
      wabaId,
      codeMethod: codeMethod ?? 'SMS',
    });

    const result = await MetaFetchService.requestVerificationCode({
      phoneNumberId,
      token: systemUserToken,
      codeMethod,
      language,
    });

    logger.info('Verification code requested successfully', {
      phoneNumberId,
      wabaId,
    });

    return result;
  },

  /**
   * Step 2 – Verify the code and register the phone number.
   *
   * Calls `POST /<phoneNumberId>/verify_code`, then
   * `POST /<phoneNumberId>/register` with a freshly generated PIN.
   * Finally, persists the phone number record in our database.
   */
  async verifyAndRegister(params: {
    phoneNumberId: string;
    wabaId: string;
    userId: string;
    code: string;
  }): Promise<{ success: boolean }> {
    const { phoneNumberId, wabaId, userId, code } = params;

    const { wabaDbId, systemUserToken } = await this._getSystemUserToken({
      wabaId,
      userId,
    });

    logger.info('Verifying code for phone number', {
      phoneNumberId,
      wabaId,
    });

    const verifyResult = await MetaFetchService.verifyCode({
      phoneNumberId,
      token: systemUserToken,
      code,
    });

    logger.info('Verification code accepted, registering phone number', {
      phoneNumberId,
      wabaId,
    });

    const registrationPin = this._generateRegistrationPin();
    const encryptedPin = encrypt(registrationPin);

    await MetaFetchService.registerPhoneNumber({
      phoneNumberId,
      token: systemUserToken,
      pin: registrationPin,
    });

    logger.info('Phone number registered with Meta, fetching details', {
      phoneNumberId,
      wabaId,
    });

    const phoneNumberDatas = await MetaFetchService.fetchPhoneNumberDetails({
      wabaId,
      token: systemUserToken,
    });

    const matchingPhone = phoneNumberDatas.find(
      (pn) => pn.id === phoneNumberId,
    );

    if (!matchingPhone) {
      logger.warn(
        'Registered phone number not found in Meta phone list; persisting minimal record',
        { phoneNumberId, wabaId },
      );
    }

    await WabaRepository.upsertPhoneNumbers({
      wabaDbId: wabaDbId,
      phoneNumberDatas: [
        {
          id: phoneNumberId,
          display_phone_number:
            matchingPhone?.display_phone_number ?? phoneNumberId,
          verified_name: matchingPhone?.verified_name ?? null,
          code_verification_status:
            matchingPhone?.code_verification_status ?? null,
          quality_rating: matchingPhone?.quality_rating ?? null,
          registrationPin: encryptedPin,
        },
      ],
    });

    logger.info('Phone number persisted in database', {
      phoneNumberId,
      wabaId,
    });

    return verifyResult;
  },

  /**
   * Creates a new phone number in Meta.
   */
  async createPhoneNumber(params: {
    wabaId: string;
    userId: string;
    countryCode: string;
    phoneNumber: string;
    name: string;
  }): Promise<{ phoneNumberId: string }> {
    const { wabaId, userId, countryCode, phoneNumber, name } = params;

    const { systemUserToken } = await this._getSystemUserToken({
      wabaId,
      userId,
    });

    logger.info('Creating phone number', {
      wabaId,
      phoneNumber,
    });

    const result = await MetaFetchService.createPhoneNumber({
      countryCode,
      phoneNumber,
      token: systemUserToken,
      wabaId,
      name,
    });

    return result;
  },

  // ── Private helpers ────────────────────────────────────────────────

  _generateRegistrationPin(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  },

  async _getSystemUserToken(params: {
    wabaId: string;
    userId: string;
  }): Promise<{ wabaDbId: string; systemUserToken: string }> {
    const { wabaId, userId } = params;
    const waba = await WabaRepository.findByMetaWabaId({ wabaId });

    if (!waba) {
      throw new ApiError('WhatsApp Business Account not found', 404);
    }

    if (waba.userId !== userId) {
      throw new ApiError(
        'You are not authorised to manage this WhatsApp Business Account',
        403,
      );
    }

    if (!waba?.systemUserToken) {
      throw new ApiError(
        'System user token not found for this WABA. Please reconnect the account.',
        404,
      );
    }

    return {
      wabaDbId: waba.id,
      systemUserToken: decrypt(waba.systemUserToken),
    };
  },
};
