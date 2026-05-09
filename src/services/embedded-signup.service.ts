import { decrypt, encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import * as retryableFetch from '@/lib/fetch-with-retry';
import { logError, logger } from '@/lib/logger';
import { WabaRepository } from '@/repositories/waba.repository';
import {
  PhoneNumberMetaResponse,
  TokenExchangeResponse,
  WabaDetails,
  WabaMetaResponse,
} from '@/types/waba';
import { randomInt } from 'node:crypto';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

type EmbeddedSignupResult = {
  failedPhoneNumberIds: string[];
  message: string | null;
  phoneNumbers: Awaited<ReturnType<typeof WabaRepository.upsertPhoneNumbers>>;
  waba: Awaited<ReturnType<typeof WabaRepository.upsertWaba>>;
};

function getMetaAppCredentials() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  };
}

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

  async _extractMetaErrorMessage(
    response: Response,
    fallbackMessage: string,
  ): Promise<string> {
    try {
      const data = await response.json();

      if (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'object' &&
        data.error !== null &&
        'message' in data.error &&
        typeof data.error.message === 'string'
      ) {
        return data.error.message;
      }
    } catch {
      // Ignore JSON parsing errors and fall back to the provided message.
    }

    return fallbackMessage;
  },

  async _throwIfRetryableResponse(
    response: Response,
    fallbackMessage: string,
  ): Promise<void> {
    if (!retryableFetch.shouldRetryMetaResponse(response)) {
      return;
    }

    const message = await this._extractMetaErrorMessage(
      response,
      fallbackMessage,
    );
    throw new ApiError(message, response.status);
  },

  /**
   * Fetches WABA metadata from the Meta Graph API.
   * Non-fatal: failures are logged but do not block the signup.
   */
  async _fetchWabaDetails(wabaId: string, token: string): Promise<WabaDetails> {
    try {
      const res = await retryableFetch.fetchWithRetry(
        `${GRAPH_BASE}/${wabaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
        { action: '_fetchWabaDetails' },
      );

      if (!res.ok) {
        await this._throwIfRetryableResponse(
          res,
          `Failed to fetch WABA details for ${wabaId}`,
        );
        throw new Error(`Meta API error: ${res.status} ${res.statusText}`);
      }

      const data: WabaMetaResponse = await res.json();
      return { businessName: data.name ?? null };
    } catch (err) {
      if (err instanceof ApiError && isRetryableStatus(err.status)) {
        throw err;
      }

      logError(err, { action: '_fetchWabaDetails', wabaId });
      return { businessName: null };
    }
  },

  /**
   * Fetches phone number details from the Meta Graph API.
   * Non-fatal: failures are logged but do not block the signup.
   */
  async _fetchPhoneNumberDetails(
    wabaId: string,
    token: string,
  ): Promise<PhoneNumberMetaResponse[]> {
    try {
      const res = await retryableFetch.fetchWithRetry(
        `${GRAPH_BASE}/${wabaId}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
        { action: '_fetchPhoneNumberDetails' },
      );

      if (!res.ok) {
        await this._throwIfRetryableResponse(
          res,
          `Failed to fetch phone numbers for ${wabaId}`,
        );
        throw new Error(`Meta API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      if (err instanceof ApiError && isRetryableStatus(err.status)) {
        throw err;
      }

      logError(err, { action: '_fetchPhoneNumberDetails', wabaId });
      return [];
    }
  },

  async _registerPhoneNumber(
    phoneNumberId: string,
    token: string,
    pin: string,
  ): Promise<void> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}/register`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin,
        }),
      },
      {
        action: '_registerPhoneNumber',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to register phone number ${phoneNumberId} with Meta`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to register phone number ${phoneNumberId} with Meta`,
      );

      if (response.status === 403) {
        logger.warn('Phone number is already registered in Meta', {
          phoneNumberId,
        });
        return;
      }

      throw new ApiError(message, 502);
    }
  },

  async _deregisterPhoneNumber(
    phoneNumberId: string,
    token: string,
  ): Promise<void> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}/deregister`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      {
        action: '_deregisterPhoneNumber',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to deregister phone number ${phoneNumberId} from Meta`,
      );

      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to deregister phone number ${phoneNumberId} from Meta`,
      );

      throw new ApiError(message, 502);
    }
  },

  async _recoverPhoneNumberRegistration(
    phoneNumber: PhoneRegistration,
    token: string,
  ): Promise<PhoneRegistration> {
    try {
      await this._deregisterPhoneNumber(phoneNumber.id, token);
      await this._registerPhoneNumber(
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
      await this._registerPhoneNumber(
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

  async _subscribeWabaApps(wabaId: string, token: string): Promise<void> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      { action: '_subscribeWabaApps' },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to subscribe apps for WABA ${wabaId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to subscribe apps for WABA ${wabaId}`,
      );

      throw new ApiError(message, 502);
    }
  },

  async _exchangeCodeForToken(code: string, wabaId: string, userId: string) {
    const { appId, appSecret } = getMetaAppCredentials();

    if (!appId || !appSecret) {
      throw new ApiError(
        'Meta app credentials are not configured on the server',
        500,
      );
    }

    logger.info('Exchanging Meta Embedded Signup code for access token', {
      wabaId,
      userId,
    });

    const tokenRes = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          code,
        }),
      },
      { action: 'exchangeCodeForToken.oauthAccessToken' },
    );
    const tokenData: TokenExchangeResponse = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      const errMsg =
        tokenData.error?.message ??
        'Failed to exchange Meta authorization code';

      if (!tokenRes.ok) {
        await this._throwIfRetryableResponse(tokenRes, errMsg);
      }

      logger.error('Meta token exchange failed', {
        status: tokenRes.status,
        error: tokenData.error,
        wabaId,
        userId,
      });
      throw new ApiError(errMsg, 502);
    }

    const systemUserToken = tokenData.access_token;

    logger.info('Meta token exchange successful', { wabaId, userId });

    return systemUserToken;
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

    const systemUserToken = await this._exchangeCodeForToken(
      code,
      wabaId,
      userId,
    );

    const [wabaDetails, phoneNumberDatas] = await Promise.all([
      this._fetchWabaDetails(wabaId, systemUserToken),
      this._fetchPhoneNumberDetails(wabaId, systemUserToken),
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
      this._subscribeWabaApps(wabaId, systemUserToken),
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
