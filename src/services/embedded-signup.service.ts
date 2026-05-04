import { encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logError, logger } from '@/lib/logger';
import { WabaRepository } from '@/repositories/waba.repository';
import {
  PhoneNumberMetaResponse,
  TokenExchangeResponse,
  WabaDetails,
  WabaMetaResponse,
} from '@/types/waba';

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const appId = process.env.NEXT_PUBLIC_META_APP_ID;
const appSecret = process.env.META_APP_SECRET;

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

      if (!res.ok) {
        throw new Error(`Meta API error: ${res.status} ${res.statusText}`);
      }

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
    wabaId: string,
    token: string,
  ): Promise<PhoneNumberMetaResponse[]> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Meta API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      // Handle the case where 'data' might be an object with a 'data' array property (standard Meta paginated response)
      // or a direct array. The previous code assumed direct array.
      return Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      logError(err, { action: '_fetchPhoneNumberDetails', wabaId });
      return [];
    }
  },

  /**
   * Main flow:
   * 1. Exchange the short-lived `code` for a System User Access Token.
   * 2. Fetch WABA and phone number details from Meta.
   * 3. Upsert WhatsappBusinessAccount (linked to `userId`).
   * 4. Upsert PhoneNumbers linked to the WABA.
   */
  async exchangeToken(code: string, wabaId: string, userId: string) {
    if (!appId || !appSecret) {
      throw new ApiError(
        'Meta app credentials are not configured on the server',
        500,
      );
    }

    // Step 1 — Exchange authorization code for a System User Access Token
    logger.info('Exchanging Meta Embedded Signup code for access token', {
      wabaId,
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
    const [wabaDetails, phoneNumberDatas] = await Promise.all([
      this._fetchWabaDetails(wabaId, systemUserToken),
      this._fetchPhoneNumberDetails(wabaId, systemUserToken),
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

    // Step 4 — Upsert all PhoneNumbers linked to our internal WABA record
    const phoneNumbers = await WabaRepository.upsertPhoneNumbers({
      wabaDbId: waba.id,
      phoneNumberDatas,
    });

    logger.info('PhoneNumbers upserted successfully', {
      count: phoneNumbers.length,
      wabaId,
    });

    return { waba, phoneNumbers };
  },
};
