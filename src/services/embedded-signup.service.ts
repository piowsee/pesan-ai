import { encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logError, logger } from '@/lib/logger';
import { WabaRepository } from '@/repositories/waba.repository';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface TokenExchangeResponse {
  access_token: string;
  token_type?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface PhoneNumberMetaResponse {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string; // GREEN, YELLOW, RED
  error?: { message: string };
}

interface WabaMetaResponse {
  id?: string;
  name?: string;
  timezone_id?: string;
  message_template_namespace?: string;
  error?: { message: string };
}

type WabaDetails = {
  businessName: string | null;
};

type PhoneNumberDetails = {
  displayPhoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
};

/**
 * Exchanges the short-lived Embedded Signup `code` for a System User Access Token
 * via Meta's OAuth endpoint, then persists the WABA and PhoneNumber records.
 */
export const EmbeddedSignUpService = {
  /**
   * Fetches WABA metadata from the Meta Graph API.
   * Non-fatal — failures are logged but do not block the signup.
   */
  async _fetchWabaDetails(wabaId: string, token: string): Promise<WabaDetails> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${wabaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: WabaMetaResponse = await res.json();
      return { businessName: data.name ?? null };
    } catch (err) {
      logError(err, { action: '_fetchWabaDetails', wabaId });
      return { businessName: null };
    }
  },

  /**
   * Fetches phone number details from the Meta Graph API.
   * Non-fatal — failures are logged but do not block the signup.
   */
  async _fetchPhoneNumberDetails(
    phoneNumberId: string,
    token: string,
  ): Promise<PhoneNumberDetails> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PhoneNumberMetaResponse = await res.json();
      return {
        displayPhoneNumber: data.display_phone_number ?? phoneNumberId,
        verifiedName: data.verified_name ?? null,
        qualityRating: data.quality_rating ?? null,
      };
    } catch (err) {
      logError(err, { action: '_fetchPhoneNumberDetails', phoneNumberId });
      return {
        displayPhoneNumber: phoneNumberId,
        verifiedName: null,
        qualityRating: null,
      };
    }
  },

  /**
   * Main flow:
   * 1. Exchange the short-lived `code` for a System User Access Token.
   * 2. Fetch WABA and phone number details from Meta.
   * 3. Upsert WhatsappBusinessAccount (linked to `userId`).
   * 4. Upsert PhoneNumber linked to the WABA.
   */
  async exchange_token(
    code: string,
    wabaId: string,
    phoneNumberId: string | null,
    userId: string,
  ) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new ApiError(
        'Meta app credentials are not configured on the server',
        500,
      );
    }

    // Step 1 — Exchange authorization code for a System User Access Token
    logger.info('Exchanging Meta Embedded Signup code for access token', {
      wabaId,
      phoneNumberId,
      userId,
    });

    const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        code,
      }),
    });
    const tokenData: TokenExchangeResponse = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      const errMsg =
        tokenData.error?.message ??
        'Failed to exchange Meta authorization code';
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

    // Step 2 — Fetch additional metadata from Meta (non-fatal)
    const [wabaDetails, phoneDetails] = await Promise.all([
      this._fetchWabaDetails(wabaId, systemUserToken),
      phoneNumberId
        ? this._fetchPhoneNumberDetails(phoneNumberId, systemUserToken)
        : Promise.resolve(null),
    ]);

    // Step 3 — Upsert the WhatsappBusinessAccount, encrypting the token at rest
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

    // Step 4 — Upsert the PhoneNumber linked to our internal WABA record (only if provided)
    let phoneNumber = null;
    if (phoneNumberId && phoneDetails) {
      phoneNumber = await WabaRepository.upsertPhoneNumber({
        phoneNumberId,
        wabaDbId: waba.id,
        displayPhoneNumber: phoneDetails.displayPhoneNumber,
        verifiedName: phoneDetails.verifiedName,
        qualityRating: phoneDetails.qualityRating,
      });

      logger.info('PhoneNumber upserted successfully', {
        phoneNumberDbId: phoneNumber.id,
        phoneNumberId,
        wabaId,
      });
    }

    return { waba, phoneNumber };
  },
};
