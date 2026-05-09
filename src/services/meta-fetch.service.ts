import { ApiError } from '@/lib/error';
import * as retryableFetch from '@/lib/fetch-with-retry';
import { logError, logger } from '@/lib/logger';
import {
  PhoneNumberMetaResponse,
  TokenExchangeResponse,
  WabaDetails,
  WabaMetaResponse,
} from '@/types/waba';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getMetaAppCredentials() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export const MetaFetchService = {
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

  async fetchWabaDetails(wabaId: string, token: string): Promise<WabaDetails> {
    try {
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
        throw new Error(
          `Meta API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: WabaMetaResponse = await response.json();
      return { businessName: data.name ?? null };
    } catch (err) {
      if (err instanceof ApiError && isRetryableStatus(err.status)) {
        throw err;
      }

      logError(err, { action: 'MetaFetchService.fetchWabaDetails', wabaId });
      return { businessName: null };
    }
  },

  async fetchPhoneNumberDetails(
    wabaId: string,
    token: string,
  ): Promise<PhoneNumberMetaResponse[]> {
    try {
      const response = await retryableFetch.fetchWithRetry(
        `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=code_verification_status`,
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
        throw new Error(
          `Meta API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      if (err instanceof ApiError && isRetryableStatus(err.status)) {
        throw err;
      }

      logError(err, {
        action: 'MetaFetchService.fetchPhoneNumberDetails',
        wabaId,
      });
      return [];
    }
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
    const tokenData: TokenExchangeResponse = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      const errorMessage =
        tokenData.error?.message ??
        'Failed to exchange Meta authorization code';

      if (!tokenResponse.ok) {
        await this._throwIfRetryableResponse(tokenResponse, errorMessage);
      }

      logger.error('Meta token exchange failed', {
        status: tokenResponse.status,
        error: tokenData.error,
        wabaId,
        userId,
      });
      throw new ApiError(errorMessage, 502);
    }

    logger.info('Meta token exchange successful', { wabaId, userId });

    return tokenData.access_token;
  },
};
