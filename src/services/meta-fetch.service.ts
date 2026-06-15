import { ApiError } from '@/lib/api-helper/error';
import { logError, logger } from '@/lib/server/logger';
import {
  PhoneNumberMetaResponse,
  TokenExchangeResponse,
  WabaDetails,
  WabaMetaResponse,
  WhatsappBusinessProfile,
  WhatsappBusinessProfileMetaResponse,
} from '@/types/waba';
import { type BetterFetchOption, createFetch } from '@better-fetch/fetch';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const DEFAULT_FETCH_RETRY_COUNT = 3;

const metaFetch = createFetch({
  baseURL: GRAPH_BASE,
  retry: DEFAULT_FETCH_RETRY_COUNT,
});

type MetaFetchOptions = BetterFetchOption & {
  action: string;
};

type MetaFetchError = {
  status: number;
  statusText: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    error_user_title: string;
    error_user_msg: string;
    fbtrace_id: string;
  };
  message?: string;
};

function getBearerAuth(token: string): BetterFetchOption['auth'] {
  return {
    type: 'Bearer',
    token,
  };
}

async function fetchMeta<T>(path: string, options: MetaFetchOptions) {
  const { action, ...fetchOptions } = options;
  const { data, error } = await metaFetch<T, MetaFetchError>(path, {
    ...fetchOptions,
    onRetry: ({ response }) => {
      logger.warn('Retrying Meta API request', {
        action,
        status: response.status,
      });
    },
  });

  if (error) {
    return { data: null, error } as const;
  }

  if (data === null) {
    throw new Error(`Meta API request did not return data for ${action}`);
  }

  return { data, error: null } as const;
}

function getMetaAppCredentials() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  };
}

export const MetaFetchService = {
  _extractMetaErrorMessage(
    metaError: MetaFetchError,
    fallbackMessage: string,
  ): string {
    try {
      if (metaError.error && typeof metaError.error === 'object') {
        const err = metaError.error;

        const msg = typeof err.message === 'string' ? err.message : null;
        const userTitle =
          typeof err.error_user_title === 'string'
            ? err.error_user_title
            : null;
        const userMsg =
          typeof err.error_user_msg === 'string' ? err.error_user_msg : null;

        logError(new Error('Meta API error'), {
          message: msg,
          userTitle,
          userMsg,
          status: metaError.status,
          statusText: metaError.statusText,
        });

        return userMsg ?? userTitle ?? msg ?? fallbackMessage;
      }

      if (typeof metaError.message === 'string' && metaError.message) {
        logError(new Error('Meta API error'), {
          message: metaError.message,
          status: metaError.status,
          statusText: metaError.statusText,
        });
        return metaError.message;
      }
    } catch {
      // Ignore malformed Meta errors and fall back to the provided message.
    }

    return fallbackMessage;
  },

  async fetchWabaDetails(params: {
    wabaId: string;
    token: string;
  }): Promise<WabaDetails> {
    const { wabaId, token } = params;
    const { data, error } = await fetchMeta<WabaMetaResponse>(`/${wabaId}`, {
      action: 'MetaFetchService.fetchWabaDetails',
      auth: getBearerAuth(token),
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to fetch WABA details for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    return { businessName: data.name ?? null };
  },

  async fetchPhoneNumberDetails(params: {
    wabaId: string;
    token: string;
  }): Promise<PhoneNumberMetaResponse[]> {
    const { wabaId, token } = params;
    const { data, error } = await fetchMeta<
      | {
          data?: PhoneNumberMetaResponse[];
        }
      | PhoneNumberMetaResponse[]
    >(
      `/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
      {
        action: 'MetaFetchService.fetchPhoneNumberDetails',
        auth: getBearerAuth(token),
      },
    );

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to fetch phone numbers for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    return Array.isArray(data) ? data : data.data || [];
  },

  async fetchBusinessProfile(params: {
    phoneNumberId: string;
    token: string;
  }): Promise<WhatsappBusinessProfile | null> {
    const { phoneNumberId, token } = params;
    const { data, error } =
      await fetchMeta<WhatsappBusinessProfileMetaResponse>(
        `/${phoneNumberId}/whatsapp_business_profile`,
        {
          action: 'MetaFetchService.fetchBusinessProfile',
          auth: getBearerAuth(token),
        },
      );

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to fetch business profile for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    return data.data?.[0]?.business_profile ?? null;
  },

  async registerPhoneNumber(params: {
    phoneNumberId: string;
    token: string;
    pin: string;
  }): Promise<void> {
    const { phoneNumberId, token, pin } = params;
    const { error } = await fetchMeta<unknown>(`/${phoneNumberId}/register`, {
      action: 'MetaFetchService.registerPhoneNumber',
      method: 'POST',
      auth: getBearerAuth(token),
      body: {
        messaging_product: 'whatsapp',
        pin,
      },
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to register phone number ${phoneNumberId} with Meta`,
      );

      if (error.status === 403) {
        logger.warn('Phone number is already registered in Meta', {
          phoneNumberId,
        });
        return;
      }
      throw new ApiError(message, 502);
    }
  },

  async deregisterPhoneNumber(params: {
    phoneNumberId: string;
    token: string;
  }): Promise<void> {
    const { phoneNumberId, token } = params;
    const { error } = await fetchMeta<unknown>(`/${phoneNumberId}/deregister`, {
      action: 'MetaFetchService.deregisterPhoneNumber',
      method: 'POST',
      auth: getBearerAuth(token),
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to deregister phone number ${phoneNumberId} from Meta`,
      );
      throw new ApiError(message, 502);
    }
  },

  async setPhoneNumberPin(params: {
    phoneNumberId: string;
    token: string;
    pin: string;
  }): Promise<void> {
    const { phoneNumberId, token, pin } = params;
    const { error } = await fetchMeta<unknown>(`/${phoneNumberId}`, {
      action: 'MetaFetchService.setPhoneNumberPin',
      method: 'POST',
      auth: getBearerAuth(token),
      body: { pin },
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to set new pin for phone number ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }
  },

  async subscribeWabaApps(params: {
    wabaId: string;
    token: string;
  }): Promise<void> {
    const { wabaId, token } = params;
    const { error } = await fetchMeta<unknown>(`/${wabaId}/subscribed_apps`, {
      action: 'MetaFetchService.subscribeWabaApps',
      method: 'POST',
      auth: getBearerAuth(token),
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to subscribe apps for WABA ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }
  },

  async createPhoneNumber(params: {
    countryCode?: string;
    phoneNumber: string;
    token: string;
    wabaId: string;
    name: string;
  }): Promise<{
    phoneNumberId: string;
  }> {
    const { countryCode = '62', phoneNumber, token, wabaId, name } = params;
    const { data, error } = await fetchMeta<{ id: string }>(
      `/${wabaId}/phone_numbers`,
      {
        action: 'MetaFetchService.createPhoneNumber',
        method: 'POST',
        auth: getBearerAuth(token),
        body: {
          cc: countryCode,
          phone_number: phoneNumber,
          verified_name: name,
        },
      },
    );

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to create phone number for ${wabaId}`,
      );
      throw new ApiError(message, 502);
    }

    return {
      phoneNumberId: data.id,
    };
  },

  async requestVerificationCode(params: {
    phoneNumberId: string;
    token: string;
    codeMethod?: 'SMS' | 'VOICE';
    language?: string;
  }): Promise<{ success: boolean }> {
    const {
      phoneNumberId,
      token,
      codeMethod = 'SMS',
      language = 'en_US',
    } = params;
    const queryParams = new URLSearchParams({
      code_method: codeMethod,
      language,
    });

    const { data, error } = await fetchMeta<{ success?: boolean }>(
      `/${phoneNumberId}/request_code?${queryParams.toString()}`,
      {
        action: 'MetaFetchService.requestVerificationCode',
        method: 'POST',
        auth: getBearerAuth(token),
      },
    );

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to request verification code for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    return { success: data.success ?? true };
  },

  async verifyCode(params: {
    phoneNumberId: string;
    token: string;
    code: string;
  }): Promise<{ success: boolean }> {
    const { phoneNumberId, token, code } = params;
    const queryParams = new URLSearchParams({ code });

    const { data, error } = await fetchMeta<{ success?: boolean }>(
      `/${phoneNumberId}/verify_code?${queryParams.toString()}`,
      {
        action: 'MetaFetchService.verifyCode',
        method: 'POST',
        auth: getBearerAuth(token),
      },
    );

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        `Failed to verify code for ${phoneNumberId}`,
      );
      throw new ApiError(message, 502);
    }

    return { success: data.success ?? true };
  },

  async exchangeCodeForToken(params: {
    code: string;
    wabaId: string;
    userId: string;
  }): Promise<string> {
    const { code, wabaId, userId } = params;
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

    const { data: tokenData, error } = await fetchMeta<TokenExchangeResponse>(
      '/oauth/access_token',
      {
        action: 'MetaFetchService.exchangeCodeForToken',
        method: 'POST',
        body: {
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          code,
        },
      },
    );
    if (error) {
      const errorMessage = this._extractMetaErrorMessage(
        error,
        'Failed to exchange Meta authorization code',
      );

      throw new ApiError(errorMessage, 502);
    }

    if (tokenData.error || !tokenData.access_token) {
      const errorMessage =
        tokenData.error?.message ??
        'Failed to exchange Meta authorization code';

      throw new ApiError(errorMessage, 502);
    }

    logger.info('Meta token exchange successful', { wabaId, userId });

    return tokenData.access_token;
  },

  async sendTextMessage(params: {
    phoneNumberId: string;
    token: string;
    to: string;
    text: string;
  }): Promise<{ messageId: string; status: string }> {
    const { phoneNumberId, token, to, text } = params;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    logger.info('Sending WhatsApp message', { phoneNumberId, to });

    const { data, error } = await fetchMeta<{
      messages?: Array<{ id?: string }>;
    }>(`/${phoneNumberId}/messages`, {
      action: 'MetaFetchService.sendTextMessage',
      method: 'POST',
      auth: getBearerAuth(token),
      body: payload,
    });

    if (error) {
      const message = this._extractMetaErrorMessage(
        error,
        'Failed to send WhatsApp message',
      );
      throw new ApiError(message, 502);
    }

    logger.info('WhatsApp message sent successfully', {
      messageId: data.messages?.[0]?.id,
    });

    return {
      messageId: data.messages?.[0]?.id ?? '',
      status: 'sent',
    };
  },
};
