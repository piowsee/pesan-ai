import { ApiError } from '@/lib/error';
import * as retryableFetch from '@/lib/fetch-with-retry';
import { logError, logger } from '@/lib/logger';
import {
  PhoneNumberMetaResponse,
  TokenExchangeResponse,
  WabaDetails,
  WabaMetaResponse,
  WhatsappBusinessProfile,
  WhatsappBusinessProfileMetaResponse,
} from '@/types/waba';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getMetaAppCredentials() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  };
}

export const MetaFetchService = {
  async _extractMetaErrorMessage(
    response: Response,
    fallbackMessage: string,
  ): Promise<string> {
    try {
      const data = await response.clone().json();

      if (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'object' &&
        data.error !== null
      ) {
        const err = data.error as Record<string, unknown>;
        const parts: string[] = [];

        if (typeof err.message === 'string') {
          parts.push(err.message);
        }
        if (typeof err.error_user_title === 'string') {
          parts.push(err.error_user_title);
        }
        if (typeof err.error_user_msg === 'string') {
          parts.push(err.error_user_msg);
        }
        if (err.error_data) {
          parts.push(`Data: ${JSON.stringify(err.error_data)}`);
        }

        if (parts.length > 0) {
          const detailedMessage = parts.join(' | ');
          logError(new Error('Meta API Detailed Extract'), {
            detailedMessage,
            url: response.url,
          });

          return err.error_user_msg || err.message || detailedMessage;
        }
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

  async fetchWabaDetails(wabaId: string, token: string): Promise<WabaDetails> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${wabaId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      { action: 'MetaFetchService.fetchWabaDetails' },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to fetch WABA details for ${wabaId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to fetch WABA details for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    const data: WabaMetaResponse = await response.json();
    return { businessName: data.name ?? null };
  },

  async fetchPhoneNumberDetails(
    wabaId: string,
    token: string,
  ): Promise<PhoneNumberMetaResponse[]> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      { action: 'MetaFetchService.fetchPhoneNumberDetails' },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to fetch phone numbers for ${wabaId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to fetch phone numbers for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  },

  async fetchBusinessProfile(
    phoneNumberId: string,
    token: string,
  ): Promise<WhatsappBusinessProfile | null> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}/whatsapp_business_profile`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      { action: 'MetaFetchService.fetchBusinessProfile' },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to fetch business profile for ${phoneNumberId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to fetch business profile for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    const data: WhatsappBusinessProfileMetaResponse = await response.json();
    return data.data?.[0]?.business_profile ?? null;
  },

  async registerPhoneNumber(
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
        action: 'MetaFetchService.registerPhoneNumber',
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

  async deregisterPhoneNumber(
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
        action: 'MetaFetchService.deregisterPhoneNumber',
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

  async setPhoneNumberPin(
    phoneNumberId: string,
    token: string,
    pin: string,
  ): Promise<void> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      },
      {
        action: 'MetaFetchService.setPhoneNumberPin',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to set new pin for phone number ${phoneNumberId}`,
      );

      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to set new pin for phone number ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }
  },

  async subscribeWabaApps(wabaId: string, token: string): Promise<void> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      { action: 'MetaFetchService.subscribeWabaApps' },
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

  async createPhoneNumber(
    countryCode: string = '62',
    phoneNumber: string,
    token: string,
    wabaId: string,
    name: string,
  ): Promise<{
    phoneNumberId: string;
  }> {
    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${wabaId}/phone_numbers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cc: countryCode,
          phone_number: phoneNumber,
          verified_name: name,
        }),
      },
      {
        action: 'MetaFetchService.createPhoneNumber',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to create phone number for ${wabaId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to create phone number for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    const idResponse: { id: string } = await response.json();

    return {
      phoneNumberId: idResponse.id,
    };
  },

  async requestVerificationCode(
    phoneNumberId: string,
    token: string,
    codeMethod: 'SMS' | 'VOICE' = 'SMS',
    language = 'en_US',
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams({
      code_method: codeMethod,
      language,
    });

    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}/request_code?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      {
        action: 'MetaFetchService.requestVerificationCode',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to request verification code for ${phoneNumberId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to request verification code for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    const data = await response.json();
    return { success: data.success ?? true };
  },

  async verifyCode(
    phoneNumberId: string,
    token: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams({ code });

    const response = await retryableFetch.fetchWithRetry(
      `${GRAPH_BASE}/${phoneNumberId}/verify_code?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      {
        action: 'MetaFetchService.verifyCode',
        shouldRetryResponse: retryableFetch.shouldRetryMetaResponse,
      },
    );

    if (!response.ok) {
      await this._throwIfRetryableResponse(
        response,
        `Failed to verify code for ${phoneNumberId}`,
      );
      const message = await this._extractMetaErrorMessage(
        response,
        `Failed to verify code for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    const data = await response.json();
    return { success: data.success ?? true };
  },

  async exchangeCodeForToken(
    code: string,
    wabaId: string,
    userId: string,
  ): Promise<string> {
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

    const tokenResponse = await retryableFetch.fetchWithRetry(
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
      { action: 'MetaFetchService.exchangeCodeForToken' },
    );
    if (!tokenResponse.ok) {
      await this._throwIfRetryableResponse(
        tokenResponse,
        'Failed to exchange Meta authorization code',
      );
      const errorMessage = await this._extractMetaErrorMessage(
        tokenResponse,
        'Failed to exchange Meta authorization code',
      );

      throw new ApiError(errorMessage, 502);
    }

    const tokenData: TokenExchangeResponse = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const errorMessage =
        tokenData.error?.message ??
        'Failed to exchange Meta authorization code';

      throw new ApiError(errorMessage, 502);
    }

    logger.info('Meta token exchange successful', { wabaId, userId });

    return tokenData.access_token;
  },
};
