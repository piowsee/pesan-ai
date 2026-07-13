import { PhoneNumber } from '@/generated/prisma/client';
import { ApiError } from '@/lib/api-helper/error';
import { decrypt, encrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { SyncRequestRepository } from '@/repositories/sync-request.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { PhoneNumberMetaResponse, WhatsappBusinessProfile } from '@/types/waba';
import { randomInt } from 'node:crypto';

const COEXISTENCE_SIGNUP_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';

type PhoneRegistration = PhoneNumberMetaResponse & {
  fallbackEncryptedRegistrationPin: string;
  fallbackRegistrationPin: string;
  encryptedRegistrationPin: string;
  registrationPin: string;
};

type BusinessProfileLookup = {
  businessProfile: WhatsappBusinessProfile;
  phoneNumberDbId: string; // Internal DB PhoneNumber.id.
  phoneNumberId: string; // Meta Phone Number ID.
};

type EmbeddedSignupResult = {
  phoneNumbers: PhoneNumber[];
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

  _buildPhoneRegistration(
    phoneNumberData: PhoneNumberMetaResponse,
    existingPhoneNumber?: {
      phoneNumberId: string;
      registrationPin: string | null;
    } | null,
  ): PhoneRegistration {
    const fallbackRegistrationPin = this._generateRegistrationPin();
    const fallbackEncryptedRegistrationPin = encrypt(fallbackRegistrationPin);
    const storedRegistrationPin = existingPhoneNumber?.registrationPin ?? null;
    const decryptedStoredRegistrationPin = storedRegistrationPin
      ? decrypt(storedRegistrationPin)
      : null;

    return {
      ...phoneNumberData,
      registrationPin:
        decryptedStoredRegistrationPin ?? fallbackRegistrationPin,
      encryptedRegistrationPin:
        storedRegistrationPin ?? fallbackEncryptedRegistrationPin,
      fallbackRegistrationPin,
      fallbackEncryptedRegistrationPin,
    };
  },

  async _recoverPhoneNumberRegistration(params: {
    phoneNumber: PhoneRegistration;
    token: string;
  }): Promise<PhoneRegistration> {
    const { phoneNumber, token } = params;
    try {
      await MetaFetchService.setPhoneNumberPin({
        phoneNumberId: phoneNumber.id,
        token,
        pin: phoneNumber.fallbackRegistrationPin,
      });
      await MetaFetchService.registerPhoneNumber({
        phoneNumberId: phoneNumber.id,
        token,
        pin: phoneNumber.fallbackRegistrationPin,
      });
    } catch (err) {
      logError(err, {
        action: 'Failed to recover phone number registration with fallback pin',
        phoneNumberId: phoneNumber.id,
        usedStoredRegistrationPin:
          phoneNumber.registrationPin !== phoneNumber.fallbackRegistrationPin,
      });
      throw err;
    }

    return {
      ...phoneNumber,
      registrationPin: phoneNumber.fallbackRegistrationPin,
      encryptedRegistrationPin: phoneNumber.fallbackEncryptedRegistrationPin,
    };
  },

  async _registerPhoneNumberWithRecovery(params: {
    phoneNumber: PhoneRegistration;
    token: string;
  }): Promise<PhoneRegistration> {
    const { phoneNumber, token } = params;
    try {
      await MetaFetchService.registerPhoneNumber({
        phoneNumberId: phoneNumber.id,
        token,
        pin: phoneNumber.registrationPin,
      });

      return phoneNumber;
    } catch (err) {
      const isRetryableMetaFailure =
        err instanceof ApiError &&
        err.status !== 502 &&
        isRetryableStatus(err.status);

      if (isRetryableMetaFailure) {
        throw err;
      }

      logger.warn('Phone registration failed, retrying after set a new pin', {
        error: err instanceof Error ? err.message : String(err),
        phoneNumberId: phoneNumber.id,
        usedStoredRegistrationPin:
          phoneNumber.registrationPin !== phoneNumber.fallbackRegistrationPin,
      });

      return this._recoverPhoneNumberRegistration({ phoneNumber, token });
    }
  },

  async _fetchBusinessProfile(params: {
    phoneNumber: PhoneNumber;
    token: string;
  }): Promise<BusinessProfileLookup | null> {
    const { phoneNumber, token } = params;
    try {
      const businessProfile = await MetaFetchService.fetchBusinessProfile({
        phoneNumberId: phoneNumber.phoneNumberId,
        token,
      });

      if (!businessProfile) {
        return null;
      }

      return {
        phoneNumberDbId: phoneNumber.id,
        phoneNumberId: phoneNumber.phoneNumberId,
        businessProfile,
      };
    } catch (error) {
      logError(error, {
        action: 'Meta business profile lookup failed during signup',
        phoneNumberId: phoneNumber.phoneNumberId,
      });
      return null;
    }
  },

  /**
   * Main flow:
   * 1. Exchange the short-lived `code` for a System User Access Token.
   * 2. Fetch WABA and phone number details from Meta.
   * 3. Generate and persist the encrypted registration PIN.
   * 4. Register phone numbers and subscribe the app in Meta.
   * 5. Upsert PhoneNumbers linked to the WABA.
   */
  async completeEmbeddedSignup(params: {
    code: string;
    event?: string;
    wabaId: string; // Meta WABA ID from Embedded Signup.
    userId: string;
    phoneNumberId: string;
  }): Promise<EmbeddedSignupResult> {
    const { code, event, wabaId, userId, phoneNumberId } = params;
    const existingWaba = await WabaRepository.findByMetaWabaId({ wabaId });

    if (existingWaba && existingWaba.userId !== userId) {
      throw new ApiError(
        'This WhatsApp Business Account is already connected to another user',
        409,
      );
    }

    const systemUserToken = await MetaFetchService.exchangeCodeForToken({
      code,
      wabaId,
      userId,
    });

    const [wabaDetails, phoneNumberData] = await Promise.all([
      MetaFetchService.fetchWabaDetails({ wabaId, token: systemUserToken }),
      MetaFetchService.fetchPhoneNumberDetails({
        phoneNumberId,
        token: systemUserToken,
      }),
    ]);

    const existingPhoneNumber =
      await PhoneNumberRepository.findPhoneNumberByMetaId(phoneNumberData.id);
    const phoneRegistration = this._buildPhoneRegistration(
      phoneNumberData,
      existingPhoneNumber,
    );

    const shouldRegisterPhoneNumbers = event !== COEXISTENCE_SIGNUP_EVENT;

    let finalPhoneRegistration = phoneRegistration;

    if (shouldRegisterPhoneNumbers) {
      try {
        finalPhoneRegistration = await this._registerPhoneNumberWithRecovery({
          phoneNumber: phoneRegistration,
          token: systemUserToken,
        });
      } catch (err) {
        logError(err as Error, {
          action: 'Meta phone registration failed during signup',
          phoneNumberId: phoneRegistration.id,
          wabaId,
        });
        throw new ApiError(
          'Phone number registration failed. Please try embedded signup again.',
          502,
        );
      }
    }

    await MetaFetchService.subscribeWabaApps({
      wabaId,
      token: systemUserToken,
    });

    logger.info('Meta phone registration and app subscription completed', {
      skippedPhoneRegistration: !shouldRegisterPhoneNumbers,
      wabaId,
    });

    const waba = await WabaRepository.upsertWaba({
      wabaId, // Meta WABA ID.
      userId,
      systemUserToken: encrypt(systemUserToken),
      name: wabaDetails.name,
    });

    logger.info('WABA upserted successfully', {
      wabaDbId: waba.id,
      wabaId,
      userId,
    });

    const phoneNumberDbRecord = await PhoneNumberRepository.upsertPhoneNumber({
      wabaDbId: waba.id, // Internal DB WhatsappBusinessAccount.id.
      phoneNumberData: {
        id: finalPhoneRegistration.id,
        display_phone_number: finalPhoneRegistration.display_phone_number,
        verified_name: finalPhoneRegistration.verified_name ?? null,
        code_verification_status:
          finalPhoneRegistration.code_verification_status ?? null,
        quality_rating: finalPhoneRegistration.quality_rating ?? null,
        registrationPin: finalPhoneRegistration.encryptedRegistrationPin,
      },
    });

    logger.info('PhoneNumbers upserted successfully', {
      upserted: !!phoneNumberDbRecord,
      wabaId,
    });

    if (phoneNumberDbRecord) {
      const businessProfile = await this._fetchBusinessProfile({
        phoneNumber: phoneNumberDbRecord,
        token: systemUserToken,
      });

      if (businessProfile) {
        await BusinessProfileRepository.upsertBusinessProfile({
          phoneNumberDbId: businessProfile.phoneNumberDbId,
          businessProfile: businessProfile.businessProfile,
        });
      }
    }

    logger.info('Business profile upserted successfully', {
      upserted: !!phoneNumberDbRecord,
      wabaId,
    });

    if (event === COEXISTENCE_SIGNUP_EVENT && phoneNumberDbRecord) {
      const syncTypes = ['history', 'smb_app_state_sync'] as const;
      await Promise.allSettled(
        syncTypes.map(async (syncType) => {
          try {
            const { request_id } = await MetaFetchService.syncRequest({
              phoneNumberId: phoneNumberDbRecord!.phoneNumberId,
              token: systemUserToken,
              sync_type: syncType,
            });
            await SyncRequestRepository.createSyncRequest({
              requestId: request_id,
              syncType,
              phoneNumberId: phoneNumberDbRecord!.id,
            });
          } catch (error) {
            logError(error, {
              action: 'Failed to request and save sync history',
              phoneNumberId: phoneNumberDbRecord!.phoneNumberId,
              syncType,
            });
          }
        }),
      );
    }

    return {
      waba,
      phoneNumbers: phoneNumberDbRecord ? [phoneNumberDbRecord] : [],
    };
  },
};
