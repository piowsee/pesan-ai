import { decrypt, encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logger } from '@/lib/logger';
import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { PhoneNumberMetaResponse, WhatsappBusinessProfile } from '@/types/waba';
import { randomInt } from 'node:crypto';

type PhoneRegistration = PhoneNumberMetaResponse & {
  fallbackEncryptedRegistrationPin: string;
  fallbackRegistrationPin: string;
  encryptedRegistrationPin: string;
  registrationPin: string;
};

type FailedPhoneRegistration = {
  error: unknown;
  phoneNumberId?: string;
};

type BusinessProfileLookup = {
  businessProfile: WhatsappBusinessProfile;
  phoneNumberDbId: string;
  phoneNumberId: string;
};

type EmbeddedSignupResult = {
  failedPhoneNumberIds: string[];
  message: string | null;
  phoneNumbers: Awaited<ReturnType<typeof WabaRepository.upsertPhoneNumbers>>;
  waba: Awaited<ReturnType<typeof WabaRepository.upsertWaba>>;
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Exchanges the short-lived Embedded Signup `code` for a System User Access Token
 * via Meta's OAuth endpoint, then persists the WABA and PhoneNumber records.
 */
export const EmbeddedSignUpService = {
  _generateRegistrationPin(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  },

  _buildPhoneRegistrations(
    phoneNumberDatas: PhoneNumberMetaResponse[],
    existingPhoneNumbers: Array<{
      phoneNumberId: string;
      registrationPin: string | null;
    }> = [],
  ): PhoneRegistration[] {
    const existingPhoneNumbersById = new Map(
      existingPhoneNumbers.map((phoneNumber) => [
        phoneNumber.phoneNumberId,
        phoneNumber.registrationPin,
      ]),
    );

    return phoneNumberDatas.map((phoneNumber) => {
      const fallbackRegistrationPin = this._generateRegistrationPin();
      const fallbackEncryptedRegistrationPin = encrypt(fallbackRegistrationPin);
      const storedRegistrationPin =
        existingPhoneNumbersById.get(phoneNumber.id) ?? null;
      const decryptedStoredRegistrationPin = storedRegistrationPin
        ? decrypt(storedRegistrationPin)
        : null;

      return {
        ...phoneNumber,
        registrationPin:
          decryptedStoredRegistrationPin ?? fallbackRegistrationPin,
        encryptedRegistrationPin:
          storedRegistrationPin ?? fallbackEncryptedRegistrationPin,
        fallbackRegistrationPin,
        fallbackEncryptedRegistrationPin,
      };
    });
  },

  async _recoverPhoneNumberRegistration(
    phoneNumber: PhoneRegistration,
    token: string,
  ): Promise<PhoneRegistration> {
    try {
      await MetaFetchService.deregisterPhoneNumber(phoneNumber.id, token);
      await MetaFetchService.registerPhoneNumber(
        phoneNumber.id,
        token,
        phoneNumber.fallbackRegistrationPin,
      );
    } catch (err) {
      logger.error(
        'Failed to recover phone number registration with fallback pin',
        {
          phoneNumberId: phoneNumber.id,
          usedStoredRegistrationPin:
            phoneNumber.registrationPin !== phoneNumber.fallbackRegistrationPin,
          error: err instanceof Error ? err.message : String(err),
        },
      );
      throw err;
    }

    return {
      ...phoneNumber,
      registrationPin: phoneNumber.fallbackRegistrationPin,
      encryptedRegistrationPin: phoneNumber.fallbackEncryptedRegistrationPin,
    };
  },

  async _registerPhoneNumberWithRecovery(
    phoneNumber: PhoneRegistration,
    token: string,
  ): Promise<PhoneRegistration> {
    try {
      await MetaFetchService.registerPhoneNumber(
        phoneNumber.id,
        token,
        phoneNumber.registrationPin,
      );

      return phoneNumber;
    } catch (err) {
      const isRetryableMetaFailure =
        err instanceof ApiError &&
        err.status !== 502 &&
        isRetryableStatus(err.status);

      if (isRetryableMetaFailure) {
        throw err;
      }

      logger.warn(
        'Phone registration failed, retrying after deregister with fallback pin',
        {
          error: err instanceof Error ? err.message : String(err),
          phoneNumberId: phoneNumber.id,
          usedStoredRegistrationPin:
            phoneNumber.registrationPin !== phoneNumber.fallbackRegistrationPin,
        },
      );

      return this._recoverPhoneNumberRegistration(phoneNumber, token);
    }
  },

  _buildPhoneRegistrationMessage(params: {
    failedCount: number;
    registeredCount: number;
  }): string | null {
    const { failedCount, registeredCount } = params;

    if (failedCount === 0 && registeredCount > 0) {
      return null;
    }

    if (failedCount > 0 && registeredCount > 0) {
      return 'WhatsApp Business Account connected, but some phone numbers could not be registered.';
    }

    if (failedCount > 0) {
      return 'WhatsApp Business Account connected, but no phone numbers could be registered.';
    }

    return 'WhatsApp Business Account connected successfully, but no phone numbers were returned by Meta.';
  },

  async _fetchBusinessProfiles(
    phoneNumbers: Awaited<ReturnType<typeof WabaRepository.upsertPhoneNumbers>>,
    token: string,
  ): Promise<BusinessProfileLookup[]> {
    const businessProfileResults = await Promise.allSettled(
      phoneNumbers.map(async (phoneNumber) => {
        const businessProfile = await MetaFetchService.fetchBusinessProfile(
          phoneNumber.phoneNumberId,
          token,
        );

        if (!businessProfile) {
          return null;
        }

        return {
          phoneNumberDbId: phoneNumber.id,
          phoneNumberId: phoneNumber.phoneNumberId,
          businessProfile,
        };
      }),
    );

    const failedLookups = businessProfileResults.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            {
              phoneNumberId: phoneNumbers[index]?.phoneNumberId,
              error: result.reason,
            },
          ]
        : [],
    );

    if (failedLookups.length > 0) {
      logger.error('Some Meta business profile lookups failed during signup', {
        failedPhoneNumberIds: failedLookups.map(
          ({ phoneNumberId }) => phoneNumberId,
        ),
        failureCount: failedLookups.length,
      });
    }

    return businessProfileResults.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : [],
    );
  },

  /**
   * Main flow:
   * 1. Exchange the short-lived `code` for a System User Access Token.
   * 2. Fetch WABA and phone number details from Meta.
   * 3. Generate and persist the encrypted registration PIN.
   * 4. Register phone numbers and subscribe the app in Meta.
   * 5. Upsert PhoneNumbers linked to the WABA.
   */
  async completeEmbeddedSignup(
    code: string,
    wabaId: string,
    userId: string,
  ): Promise<EmbeddedSignupResult> {
    const existingWaba = await WabaRepository.findByMetaWabaId(wabaId);

    if (existingWaba && existingWaba.userId !== userId) {
      throw new ApiError(
        'This WhatsApp Business Account is already connected to another user',
        409,
      );
    }

    const systemUserToken = await MetaFetchService.exchangeCodeForToken(
      code,
      wabaId,
      userId,
    );

    const [wabaDetails, phoneNumberDatas] = await Promise.all([
      MetaFetchService.fetchWabaDetails(wabaId, systemUserToken),
      MetaFetchService.fetchPhoneNumberDetails(wabaId, systemUserToken),
    ]);

    const existingPhoneNumbers = await WabaRepository.findPhoneNumbersByMetaIds(
      phoneNumberDatas.map((phoneNumber) => phoneNumber.id),
    );
    const phoneRegistrations = this._buildPhoneRegistrations(
      phoneNumberDatas,
      existingPhoneNumbers,
    );

    const [registrationResults] = await Promise.all([
      Promise.allSettled(
        phoneRegistrations.map((phoneNumber) =>
          this._registerPhoneNumberWithRecovery(phoneNumber, systemUserToken),
        ),
      ),
      MetaFetchService.subscribeWabaApps(wabaId, systemUserToken),
    ]);

    const registeredPhoneNumbers = registrationResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failedPhoneRegistrations =
      registrationResults.flatMap<FailedPhoneRegistration>((result, index) =>
        result.status === 'rejected'
          ? [
              {
                phoneNumberId: phoneRegistrations[index]?.id,
                error: result.reason,
              },
            ]
          : [],
      );

    if (failedPhoneRegistrations.length > 0) {
      logger.error('Some Meta phone registrations failed during signup', {
        failedPhoneNumberIds: failedPhoneRegistrations.map(
          ({ phoneNumberId }) => phoneNumberId,
        ),
        failureCount: failedPhoneRegistrations.length,
        wabaId,
      });
    }

    logger.info('Meta phone registration and app subscription completed', {
      phoneNumberCount: registeredPhoneNumbers.length,
      failedPhoneNumberCount: failedPhoneRegistrations.length,
      wabaId,
    });

    const waba = await WabaRepository.upsertWaba({
      wabaId,
      userId,
      systemUserToken: encrypt(systemUserToken),
      businessName: wabaDetails.businessName,
    });

    logger.info('WABA upserted successfully', {
      wabaDbId: waba.id,
      wabaId,
      userId,
    });

    const phoneNumbers = await WabaRepository.upsertPhoneNumbers({
      wabaDbId: waba.id,
      phoneNumberDatas: registeredPhoneNumbers.map((phoneNumber) => ({
        id: phoneNumber.id,
        display_phone_number: phoneNumber.display_phone_number,
        verified_name: phoneNumber.verified_name ?? null,
        code_verification_status: phoneNumber.code_verification_status ?? null,
        quality_rating: phoneNumber.quality_rating ?? null,
        error: phoneNumber.error,
        registrationPin: phoneNumber.encryptedRegistrationPin,
      })),
    });

    logger.info('PhoneNumbers upserted successfully', {
      count: phoneNumbers.length,
      wabaId,
    });

    const businessProfiles = await this._fetchBusinessProfiles(
      phoneNumbers,
      systemUserToken,
    );

    await BusinessProfileRepository.upsertBusinessProfiles(
      businessProfiles.map(({ phoneNumberDbId, businessProfile }) => ({
        phoneNumberDbId,
        businessProfile,
      })),
    );

    logger.info('Business profiles upserted successfully', {
      count: businessProfiles.length,
      wabaId,
    });

    return {
      waba,
      phoneNumbers,
      failedPhoneNumberIds: failedPhoneRegistrations.flatMap(
        ({ phoneNumberId }) => (phoneNumberId ? [phoneNumberId] : []),
      ),
      message: this._buildPhoneRegistrationMessage({
        failedCount: failedPhoneRegistrations.length,
        registeredCount: registeredPhoneNumbers.length,
      }),
    };
  },
};
